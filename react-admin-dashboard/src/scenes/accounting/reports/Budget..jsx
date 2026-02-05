import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  Button,
  IconButton,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Paper,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Tooltip,
  Tabs,
  Tab,
  Chip,
} from "@mui/material";
import { Add, Delete, Refresh, Visibility, Edit } from "@mui/icons-material";
import { apiClient } from "../../../api/apiClient";
import { toast } from "react-toastify";
import { DateTime } from "luxon";
import { tokens } from "../../../theme";
import Header from "../../../components/Header";
import { useTheme } from "@mui/material";

// Helper to format currency
const formatCurrency = (amount) => {
  return (amount ?? 0).toLocaleString("en-US", {
    style: "currency",
    currency: "KES",
    minimumFractionDigits: 2,
  });
};

const Budget = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  
  // --- State ---
  const [currentTab, setCurrentTab] = useState(0); // 0: Report, 1: Manage
  const [loading, setLoading] = useState(false);
  
  // Report State
  const [reportPeriod, setReportPeriod] = useState(DateTime.local().toFormat('yyyy-MM')); // "2025-11"
  const [reportData, setReportData] = useState(null);

  // Manage State
  const [budgets, setBudgets] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [formData, setFormData] = useState({
    chart_of_account_id: "",
    period: DateTime.local().toFormat('yyyy-MM'),
    amount: "",
  });

  // --- Fetch Logic ---

  const fetchAccounts = async () => {
    try {
      const res = await apiClient.get("/accounting/chart-of-accounts");
      // Filter for P&L accounts only
      const plAccounts = (res.data.data || res.data || [])
        .filter(acc => ['Revenue', 'Expense', 'Cost of Goods Sold', 'Income', 'Other Income', 'Other Expense'].includes(acc.account_type))
        .sort((a, b) => a.account_code.localeCompare(b.account_code));
      setAccounts(plAccounts);
    } catch (e) {
      console.error("Error fetching accounts:", e);
    }
  };

  const fetchBudgets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("/accounting/budgets", {
        params: { period: reportPeriod }
      });
      setBudgets(res.data || []);
    } catch (e) {
      toast.error("Failed to fetch budgets.");
    } finally {
      setLoading(false);
    }
  }, [reportPeriod]);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const startDate = DateTime.fromFormat(reportPeriod, 'yyyy-MM').startOf('month').toISODate();
      const endDate = DateTime.fromFormat(reportPeriod, 'yyyy-MM').endOf('month').toISODate();

      const res = await apiClient.get("/accounting/budget-vs-actuals", {
        params: { start_date: startDate, end_date: endDate }
      });
      setReportData(res.data);
    } catch (e) {
      console.error("Error fetching report:", e);
      toast.error("Failed to generate Budget vs Actuals report.");
    } finally {
      setLoading(false);
    }
  }, [reportPeriod]);

  // Initial Load
  useEffect(() => {
    fetchAccounts();
  }, []);

  // Tab Switch Effect
  useEffect(() => {
    if (currentTab === 0) {
      fetchReport();
    } else {
      fetchBudgets();
    }
  }, [currentTab, reportPeriod, fetchBudgets, fetchReport]);


  // --- Handlers ---

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  const handleSaveBudget = async () => {
    if (!formData.chart_of_account_id || !formData.amount || !formData.period) {
      toast.warning("All fields are required.");
      return;
    }

    try {
      await apiClient.post("/accounting/budgets", formData);
      toast.success("Budget target saved.");
      setOpenDialog(false);
      fetchBudgets(); // Refresh list
      setFormData({ ...formData, amount: "" }); // Reset amount only
    } catch (e) {
      toast.error("Failed to save budget.");
    }
  };

  const handleDeleteBudget = async (id) => {
    if (!window.confirm("Remove this budget target?")) return;
    try {
      await apiClient.delete(`/accounting/budgets/${id}`);
      toast.success("Budget removed.");
      fetchBudgets();
    } catch (e) {
      toast.error("Failed to delete budget.");
    }
  };

  // --- Render Helpers ---

  const renderVarianceChip = (variance, isRevenue) => {
    const isGood = isRevenue ? variance >= 0 : variance <= 0; // Revenue > Budget is good, Expense < Budget is good
    const color = isGood ? "success" : "error";
    return <Chip label={formatCurrency(variance)} color={color} size="small" variant="outlined" />;
  };

  return (
    <Box m="20px">
      <Header title="BUDGETING & FORECASTING" subtitle="Plan financial targets and monitor performance variances." />

      {/* Controls */}
      <Paper elevation={3} sx={{ p: 2, mb: 3, backgroundColor: colors.primary[400], display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Tabs value={currentTab} onChange={handleTabChange} indicatorColor="secondary" textColor="secondary">
          <Tab label="Budget vs. Actuals Report" />
          <Tab label="Manage Targets" />
        </Tabs>

        <Box display="flex" gap={2} alignItems="center">
           <TextField
              label="Select Period"
              type="month"
              value={reportPeriod}
              onChange={(e) => setReportPeriod(e.target.value)}
              InputLabelProps={{ shrink: true }}
              size="small"
              sx={{ width: 200 }}
            />
            {currentTab === 1 && (
                <Button variant="contained" color="secondary" startIcon={<Add />} onClick={() => setOpenDialog(true)}>
                    Set Target
                </Button>
            )}
             <IconButton onClick={currentTab === 0 ? fetchReport : fetchBudgets}>
              <Refresh />
            </IconButton>
        </Box>
      </Paper>

      {loading ? (
         <Box display="flex" justifyContent="center" p={5}><CircularProgress /></Box>
      ) : (
        <Box>
            {/* --- TAB 0: REPORT VIEW --- */}
            {currentTab === 0 && reportData && (
                <Paper elevation={3} sx={{ p: 3, backgroundColor: colors.primary[400] }}>
                     <Typography variant="h5" fontWeight="bold" mb={2} textAlign="center">
                        Performance Report: {reportData.report_period}
                     </Typography>

                     {/* REVENUE SECTION */}
                     <Typography variant="h6" color={colors.greenAccent[500]} mt={2} mb={1}>REVENUE</Typography>
                     <TableContainer>
                        <Table size="small">
                            <TableHead sx={{ backgroundColor: colors.primary[700] }}>
                                <TableRow>
                                    <TableCell>Account</TableCell>
                                    <TableCell align="right">Actual</TableCell>
                                    <TableCell align="right">Budget</TableCell>
                                    <TableCell align="right">Variance</TableCell>
                                    <TableCell align="right">%</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {reportData.revenue.map((row, i) => (
                                    <TableRow key={i}>
                                        <TableCell>{row.account_name}</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>{formatCurrency(row.actual)}</TableCell>
                                        <TableCell align="right">{formatCurrency(row.budget)}</TableCell>
                                        <TableCell align="right">{renderVarianceChip(row.variance, true)}</TableCell>
                                        <TableCell align="right" sx={{ color: row.variance >= 0 ? colors.greenAccent[400] : colors.redAccent[400] }}>
                                            {row.variance_percent}%
                                        </TableCell>
                                    </TableRow>
                                ))}
                                <TableRow sx={{ backgroundColor: colors.primary[600] }}>
                                    <TableCell fontWeight="bold">TOTAL REVENUE</TableCell>
                                    <TableCell align="right" fontWeight="bold">{formatCurrency(reportData.totals.revenue_actual)}</TableCell>
                                    <TableCell align="right" fontWeight="bold">{formatCurrency(reportData.totals.revenue_budget)}</TableCell>
                                    <TableCell colSpan={2}></TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                     </TableContainer>

                     {/* EXPENSE SECTION */}
                     <Typography variant="h6" color={colors.redAccent[500]} mt={4} mb={1}>EXPENSES</Typography>
                     <TableContainer>
                        <Table size="small">
                            <TableHead sx={{ backgroundColor: colors.primary[700] }}>
                                <TableRow>
                                    <TableCell>Account</TableCell>
                                    <TableCell align="right">Actual</TableCell>
                                    <TableCell align="right">Budget</TableCell>
                                    <TableCell align="right">Variance</TableCell>
                                    <TableCell align="right">%</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {reportData.expenses.map((row, i) => (
                                    <TableRow key={i}>
                                        <TableCell>{row.account_name}</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>{formatCurrency(row.actual)}</TableCell>
                                        <TableCell align="right">{formatCurrency(row.budget)}</TableCell>
                                        <TableCell align="right">{renderVarianceChip(row.variance, false)}</TableCell>
                                        <TableCell align="right" sx={{ color: row.variance <= 0 ? colors.greenAccent[400] : colors.redAccent[400] }}>
                                            {row.variance_percent}%
                                        </TableCell>
                                    </TableRow>
                                ))}
                                <TableRow sx={{ backgroundColor: colors.primary[600] }}>
                                    <TableCell fontWeight="bold">TOTAL EXPENSES</TableCell>
                                    <TableCell align="right" fontWeight="bold">{formatCurrency(reportData.totals.expense_actual)}</TableCell>
                                    <TableCell align="right" fontWeight="bold">{formatCurrency(reportData.totals.expense_budget)}</TableCell>
                                    <TableCell colSpan={2}></TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                     </TableContainer>
                </Paper>
            )}

            {/* --- TAB 1: MANAGE TARGETS --- */}
            {currentTab === 1 && (
                <TableContainer component={Paper} sx={{ backgroundColor: colors.primary[400] }}>
                    <Table>
                        <TableHead sx={{ backgroundColor: colors.primary[700] }}>
                            <TableRow>
                                <TableCell>Account Code</TableCell>
                                <TableCell>Account Name</TableCell>
                                <TableCell>Type</TableCell>
                                <TableCell>Budget Period</TableCell>
                                <TableCell align="right">Target Amount</TableCell>
                                <TableCell align="center">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {budgets.length > 0 ? budgets.map((b) => (
                                <TableRow key={b.id}>
                                    <TableCell>{b.account?.account_code}</TableCell>
                                    <TableCell>{b.account?.account_name}</TableCell>
                                    <TableCell>{b.account?.account_type}</TableCell>
                                    <TableCell>{b.period}</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 'bold', color: colors.greenAccent[400] }}>
                                        {formatCurrency(b.amount)}
                                    </TableCell>
                                    <TableCell align="center">
                                        <IconButton color="error" onClick={() => handleDeleteBudget(b.id)}>
                                            <Delete />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow><TableCell colSpan={6} align="center">No budgets set for this period.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
        </Box>
      )}

      {/* --- Add Budget Dialog --- */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} fullWidth maxWidth="sm">
        <DialogTitle>Set Budget Target</DialogTitle>
        <DialogContent>
            <Box display="grid" gap={2} mt={1}>
                <TextField
                    select
                    label="GL Account"
                    value={formData.chart_of_account_id}
                    onChange={(e) => setFormData({...formData, chart_of_account_id: e.target.value})}
                    fullWidth
                >
                    {accounts.map((acc) => (
                        <MenuItem key={acc.id} value={acc.id}>
                            {acc.account_code} - {acc.account_name} ({acc.account_type})
                        </MenuItem>
                    ))}
                </TextField>
                <TextField
                    label="Period (Month)"
                    type="month"
                    value={formData.period}
                    onChange={(e) => setFormData({...formData, period: e.target.value})}
                    InputLabelProps={{ shrink: true }}
                    fullWidth
                />
                <TextField
                    label="Target Amount"
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({...formData, amount: e.target.value})}
                    fullWidth
                />
            </Box>
        </DialogContent>
        <DialogActions>
            <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
            <Button variant="contained" onClick={handleSaveBudget} color="secondary">Save Target</Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
};

export default Budget;