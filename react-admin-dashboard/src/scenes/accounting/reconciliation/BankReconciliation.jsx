import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Button,
  Typography,
  Paper,
  Grid,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Select,
  MenuItem,
  Alert,
  FormControl,
  InputLabel,
  Checkbox,
  Chip,
  Tooltip
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { tokens } from "../../../theme";
import { apiClient } from "../../../api/apiClient";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import SyncIcon from "@mui/icons-material/Sync";
import CloudDownloadIcon from "@mui/icons-material/CloudDownload";

const BankReconciliation = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  // --- State ---
  const [assetAccounts, setAssetAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState("");
  
  const [bankLines, setBankLines] = useState([]);
  const [ledgerLines, setLedgerLines] = useState([]);
  
  const [selectedBankIds, setSelectedBankIds] = useState([]);
  const [selectedLedgerIds, setSelectedLedgerIds] = useState([]);

  const [loading, setLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false); // New state for API sync
  const [matchLoading, setMatchLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  // --- 1. Fetch Asset Accounts ---
  const fetchAccounts = useCallback(async () => {
    try {
      const { data } = await apiClient.get("/accounting/chart-of-accounts");
      const accounts = data.filter(a => {
        if (a.account_type !== "Asset") return false;
        const name = a.account_name.toLowerCase();
        const isLiquidKeyword = name.match(/bank|cash|mpesa|m-pesa|airtel|mobile|wallet|paybill|till/);
        const isLiquidCode = a.account_code.startsWith("10");
        return isLiquidKeyword || isLiquidCode;
      });
      setAssetAccounts(accounts);
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: "Failed to load bank accounts." });
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  // --- 2. Load Data for Selected Account ---
  const loadReconciliationData = useCallback(async () => {
    if (!selectedAccount) {
        setBankLines([]);
        setLedgerLines([]);
        return;
    }
    
    setLoading(true);
    setMessage({ type: "", text: "" });
    
    try {
      const [bankRes, ledgerRes] = await Promise.all([
        apiClient.get(`/accounting/bank-statements?account_id=${selectedAccount}`), 
        apiClient.get(`/accounting/unreconciled-lines?account_id=${selectedAccount}`) 
      ]);

      setBankLines(Array.isArray(bankRes.data) ? bankRes.data : []);
      setLedgerLines(Array.isArray(ledgerRes.data) ? ledgerRes.data : []);
      
      setSelectedBankIds([]);
      setSelectedLedgerIds([]);

    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: "Failed to load reconciliation data." });
    } finally {
      setLoading(false);
    }
  }, [selectedAccount]);

  useEffect(() => {
    loadReconciliationData();
  }, [loadReconciliationData]);

  // --- 3. File Upload Handler (Manual) ---
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("account_id", selectedAccount);

    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      const res = await apiClient.post("/accounting/bank-statements/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setMessage({ type: "success", text: res.data.message || "Statement uploaded successfully." });
      loadReconciliationData(); 
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: err.response?.data?.message || "Upload failed." });
    } finally {
      setLoading(false);
      event.target.value = null;
    }
  };

  // --- 4. API Sync Handler (Real-time) ---
  const handleApiSync = async () => {
    if (!selectedAccount) return;
    setIsSyncing(true);
    setMessage({ type: "", text: "" });

    try {
      // Call the new endpoint in BankStatementController -> KenyaBankService
      const { data } = await apiClient.post("/accounting/bank-statements/sync", {
        account_id: selectedAccount
      });
      
      setMessage({ type: "success", text: data.message });
      loadReconciliationData();
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: err.response?.data?.message || "Sync failed. Check credentials." });
    } finally {
      setIsSyncing(false);
    }
  };

  // --- 5. Handlers ---
  const toggleBankSelection = (id) => {
    setSelectedBankIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleLedgerSelection = (id) => {
    setSelectedLedgerIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleReconcile = async () => {
    if (selectedBankIds.length === 0 || selectedLedgerIds.length === 0) {
      setMessage({ type: "warning", text: "Select items from both sides to reconcile." });
      return;
    }

    const bankTotal = selectedBankIds.reduce((sum, id) => {
      const line = bankLines.find(l => l.id === id);
      if (!line) return sum;
      return sum + (Number(line.credit || 0) - Number(line.debit || 0));
    }, 0);

    const ledgerTotal = selectedLedgerIds.reduce((sum, id) => {
      const line = ledgerLines.find(l => l.id === id);
      if (!line) return sum;
      return sum + (Number(line.debit || 0) - Number(line.credit || 0));
    }, 0);

    if (Math.abs(bankTotal - ledgerTotal) > 0.05) {
        setMessage({ 
            type: "error", 
            text: `Mismatch! Bank: ${formatMoney(bankTotal)}, Ledger: ${formatMoney(ledgerTotal)}` 
        });
        return;
    }

    setMatchLoading(true);
    try {
      await apiClient.post("/accounting/reconcile", {
        bank_line_ids: selectedBankIds,
        ledger_line_ids: selectedLedgerIds,
      });
      setMessage({ type: "success", text: "Reconciled successfully!" });
      loadReconciliationData();
    } catch (err) {
      setMessage({ type: "error", text: err.response?.data?.message || "Reconciliation failed." });
    } finally {
      setMatchLoading(false);
    }
  };

  const formatMoney = (val) => Number(val).toLocaleString("en-KE", { style: "currency", currency: "KES" });

  // Check if selected account has an API provider configured
  const currentAccount = assetAccounts.find(a => a.id === selectedAccount);
  const isApiConnected = currentAccount && currentAccount.bank_provider;

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight="bold" color={colors.grey[100]}>
          Bank Reconciliation
        </Typography>
      </Box>

      {message.text && (
        <Alert severity={message.type} sx={{ mb: 2 }} onClose={() => setMessage({ type: "", text: "" })}>
          {message.text}
        </Alert>
      )}

      <Paper sx={{ p: 3, mb: 3, backgroundColor: colors.primary[400] }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Select Account</InputLabel>
              <Select
                value={selectedAccount}
                label="Select Account"
                onChange={(e) => setSelectedAccount(e.target.value)}
              >
                {assetAccounts.length > 0 ? (
                    assetAccounts.map((acc) => (
                    <MenuItem key={acc.id} value={acc.id}>
                        {acc.account_name} {acc.bank_provider ? " (API)" : ""}
                    </MenuItem>
                    ))
                ) : (
                    <MenuItem disabled>No liquid asset accounts found</MenuItem>
                )}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={4}>
            {/* 💡 CONDITIONAL BUTTON: API Sync vs Manual Upload */}
            {isApiConnected ? (
              <Button
                variant="contained"
                color="info"
                startIcon={isSyncing ? <CircularProgress size={20} color="inherit"/> : <CloudDownloadIcon />}
                onClick={handleApiSync}
                disabled={isSyncing || !selectedAccount}
                fullWidth
              >
                {isSyncing ? "Syncing with Bank..." : `Sync from ${currentAccount.bank_provider}`}
              </Button>
            ) : (
              <Button
                variant="outlined"
                component="label"
                color="secondary"
                startIcon={<UploadFileIcon />}
                fullWidth
                disabled={!selectedAccount}
              >
                Upload Statement (CSV)
                <input type="file" hidden onChange={handleFileUpload} accept=".csv" disabled={!selectedAccount} />
              </Button>
            )}
          </Grid>
          
          <Grid item xs={12} md={4}>
             <Button 
                variant="contained" 
                color="success" 
                fullWidth 
                startIcon={matchLoading ? <CircularProgress size={20} color="inherit"/> : <CheckCircleIcon />}
                onClick={handleReconcile}
                disabled={matchLoading || !selectedAccount || selectedBankIds.length === 0}
             >
                Reconcile Selected
             </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Comparison Tables */}
      {selectedAccount && (
      <Grid container spacing={2}>
        {/* LEFT: Bank Statement Lines */}
        <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, height: '100%', backgroundColor: colors.primary[400] }}>
                <Box display="flex" justifyContent="space-between" mb={2}>
                  <Typography variant="h6" color={colors.grey[100]}>Bank Statement</Typography>
                  {isApiConnected && <Chip label="API Connected" color="success" size="small" icon={<SyncIcon />} />}
                </Box>
                
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell padding="checkbox"></TableCell>
                            <TableCell>Date</TableCell>
                            <TableCell>Description</TableCell>
                            <TableCell align="right">Amount</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading ? (
                            <TableRow><TableCell colSpan={4} align="center"><CircularProgress /></TableCell></TableRow>
                        ) : bankLines.length === 0 ? (
                            <TableRow><TableCell colSpan={4} align="center">No unmatched lines found</TableCell></TableRow>
                        ) : (
                            bankLines.map((line) => {
                                const amount = Number(line.credit) > 0 ? line.credit : -line.debit;
                                const isSelected = selectedBankIds.includes(line.id);
                                return (
                                    <TableRow 
                                        key={line.id} 
                                        selected={isSelected}
                                        onClick={() => toggleBankSelection(line.id)}
                                        hover
                                        sx={{ cursor: 'pointer', backgroundColor: isSelected ? colors.primary[300] : 'inherit' }}
                                    >
                                        <TableCell padding="checkbox">
                                            <Checkbox checked={isSelected} color="secondary" />
                                        </TableCell>
                                        <TableCell>{line.transaction_date}</TableCell>
                                        <TableCell>{line.description}</TableCell>
                                        <TableCell align="right" sx={{ color: amount > 0 ? colors.greenAccent[500] : colors.redAccent[500] }}>
                                            {formatMoney(amount)}
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </Paper>
        </Grid>

        {/* RIGHT: Ledger Entries */}
        <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, height: '100%', backgroundColor: colors.primary[400] }}>
                <Typography variant="h6" mb={2} color={colors.grey[100]}>
                    System Ledger (Unreconciled)
                </Typography>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell padding="checkbox"></TableCell>
                            <TableCell>Date</TableCell>
                            <TableCell>Description</TableCell>
                            <TableCell align="right">Amount</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                         {loading ? (
                            <TableRow><TableCell colSpan={4} align="center"><CircularProgress /></TableCell></TableRow>
                        ) : ledgerLines.length === 0 ? (
                            <TableRow><TableCell colSpan={4} align="center">All entries reconciled</TableCell></TableRow>
                        ) : (
                            ledgerLines.map((line) => {
                                const amount = Number(line.debit) > 0 ? line.debit : -line.credit;
                                const isSelected = selectedLedgerIds.includes(line.id);
                                return (
                                    <TableRow 
                                        key={line.id} 
                                        selected={isSelected}
                                        onClick={() => toggleLedgerSelection(line.id)}
                                        hover
                                        sx={{ cursor: 'pointer', backgroundColor: isSelected ? colors.primary[300] : 'inherit' }}
                                    >
                                        <TableCell padding="checkbox">
                                            <Checkbox checked={isSelected} color="secondary" />
                                        </TableCell>
                                        <TableCell>{line.journal_entry?.transaction_date}</TableCell>
                                        <TableCell>{line.journal_entry?.description}</TableCell>
                                        <TableCell align="right" sx={{ color: amount > 0 ? colors.greenAccent[500] : colors.redAccent[500] }}>
                                            {formatMoney(amount)}
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </Paper>
        </Grid>
      </Grid>
      )}
    </Box>
  );
};

export default BankReconciliation;