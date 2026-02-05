// src/scenes/accounting/reports/GeneralLedger.jsx

import React, { useState, useRef, useEffect } from "react";
import {
  Box,
  Paper,
  Typography,
  useTheme,
  Grid,
  TextField,
  Button,
  CircularProgress,
  Divider,
  IconButton,
  Tooltip,
  Stack,
  Autocomplete, // For account selection
  Table,        // For summary rows (Opening/Closing)
  TableBody,
  TableCell,
  TableRow,
  TableContainer
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { tokens } from "../../../theme";
import Header from "../../../components/Header";
import {apiClient} from "../../../api/apiClient";
import { toast } from "react-toastify";
import { useAuth } from "../../../api/AuthProvider";

// Icons
import PrintOutlinedIcon from "@mui/icons-material/PrintOutlined";
import PictureAsPdfOutlinedIcon from "@mui/icons-material/PictureAsPdfOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined"; // CSV

// Print & Export Libs
import { useReactToPrint } from "react-to-print";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// --- Helper Functions ---
const formatCurrency = (amount) => {
  const numericAmount = Number(amount);
  if (isNaN(numericAmount) || numericAmount === 0) {
    return ""; // Return empty string for 0 or NaN
  }
  return numericAmount.toLocaleString("en-US", {
    style: "currency",
    currency: "KES",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

// Format totals/balances, showing 0.00 if zero
const formatCurrencyBalance = (amount) => {
    const numericAmount = Number(amount);
    if (isNaN(numericAmount)) {
      return "N/A";
    }
    return numericAmount.toLocaleString("en-US", {
      style: "currency",
      currency: "KES",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
}

// Format date from API (assuming YYYY-MM-DD or similar) to a readable format
const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
        const date = new Date(dateString + 'T00:00:00'); // Ensure it's parsed as local date
        if (isNaN(date.getTime())) return dateString; // Return original if invalid
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
        return dateString; // Fallback
    }
}

const today = new Date();
const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];
const todayDate = today.toISOString().split("T")[0];

/**
 * The printable/exportable report component
 */
const GeneralLedgerReport = React.forwardRef(({ data, metadata, colors }, ref) => {
  const ledgerColumns = [
    {
        field: 'transaction_date',
        headerName: 'Date',
        flex: 0.7,
        headerAlign: 'left',
        align: 'left',
        renderCell: (params) => formatDate(params.value),
    },
    { field: 'description', headerName: 'Description', flex: 1.5, headerAlign: 'left', align: 'left' },
    {
      field: 'debit',
      headerName: 'Debit',
      flex: 0.8,
      headerAlign: 'right',
      align: 'right',
      renderCell: (params) => formatCurrency(params.value),
    },
    {
      field: 'credit',
      headerName: 'Credit',
      flex: 0.8,
      headerAlign: 'right',
      align: 'right',
      renderCell: (params) => formatCurrency(params.value),
    },
     {
      field: 'balance',
      headerName: 'Balance',
      flex: 1,
      headerAlign: 'right',
      align: 'right',
      renderCell: (params) => formatCurrencyBalance(params.value), // Show 0.00 for balance
    },
  ];

  // Add unique id for DataGrid
  const ledgerRows = (data.transactions || []).map((row, index) => ({ id: index, ...row }));

  return (
    <Box ref={ref} sx={{ p: { xs: 1, md: 2 } }}>
      {/* Report Header - Centered */}
      <Box textAlign="center" mb={3}>
        <Typography variant="h4" fontWeight="600">
          Ligco Technologies
        </Typography>
        <Typography variant="h5" fontWeight="500">
          General Ledger
        </Typography>
        <Typography variant="h6" color={colors.grey[200]}>
          Account: {data.account_name} ({data.account_code})
        </Typography>
        <Typography variant="body1" color={colors.grey[300]}>
          For the period: {formatDate(data.start_date)} to {formatDate(data.end_date)}
        </Typography>
      </Box>

      {/* --- Opening Balance --- */}
       <TableContainer component={Paper} sx={{ mb: 1, boxShadow: 'none', backgroundColor: colors.primary[400] }}>
          <Table size="small">
            <TableBody>
              <TableRow sx={{backgroundColor: colors.blueAccent[900]}}>
                <TableCell colSpan={4} sx={{ border: 0, fontWeight: 'bold', color: colors.grey[100] }}>
                  Opening Balance
                </TableCell>
                <TableCell align="right" sx={{ border: 0, fontWeight: 'bold', color: colors.grey[100] }}>
                  {formatCurrencyBalance(data.opening_balance)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
       </TableContainer>

      {/* --- DataGrid Table for Transactions --- */}
      <Box
        height="auto" // Auto height to fit content
        minHeight="300px" // Minimum height
        sx={{
          mb: 1, // Margin below grid
          "& .MuiDataGrid-root": { border: "none", fontSize: "0.9rem" },
          "& .MuiDataGrid-cell": { borderBottom: `1px solid ${colors.grey[700]} !important`, py: "2px" },
          "& .MuiDataGrid-columnHeaders": { backgroundColor: colors.blueAccent[800], borderBottom: "none", color: colors.grey[100], fontSize: "0.95rem", fontWeight: 'bold' },
          "& .MuiDataGrid-virtualScroller": { backgroundColor: colors.primary[400] },
          "& .MuiDataGrid-footerContainer": { display: 'none' }, // Hide default footer
           "& .MuiDataGrid-cell:focus, & .MuiDataGrid-cell:focus-within, & .MuiDataGrid-columnHeader:focus, & .MuiDataGrid-columnHeader:focus-within": { outline: "none" },
        }}
      >
        <DataGrid
          rows={ledgerRows}
          columns={ledgerColumns}
          density="compact"
          autoHeight={true}
          hideFooter={true}
          getRowId={(row) => row.id} // Ensure unique IDs
        />
      </Box>

      {/* --- Closing Balance --- */}
        <TableContainer component={Paper} sx={{ mt: 1, boxShadow: 'none', backgroundColor: colors.primary[400] }}>
          <Table size="small">
             <TableBody>
              <TableRow sx={{backgroundColor: colors.blueAccent[900]}}>
                <TableCell colSpan={4} sx={{ border: 0, fontWeight: 'bold', color: colors.grey[100] }}>
                  Closing Balance
                </TableCell>
                <TableCell align="right" sx={{ border: 0, fontWeight: 'bold', color: colors.grey[100] }}>
                  {formatCurrencyBalance(data.closing_balance)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>

      {/* --- Metadata Footer --- */}
      {metadata && (
        <Box mt={3} pt={2} borderTop={1} borderColor={colors.grey[700]} textAlign="center">
          <Typography variant="body2" color={colors.grey[300]}>
            Report ID: {metadata.serial} | Generated At: {metadata.generatedAt} | Generated By: {metadata.generatedBy}
          </Typography>
        </Box>
      )}
    </Box>
  );
});

// --- Main Component ---
export default function GeneralLedger() {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const reportContentRef = useRef();
  const { user } = useAuth() || {};

  // State
  const [startDate, setStartDate] = useState(firstDayOfMonth);
  const [endDate, setEndDate] = useState(todayDate);
  const [selectedAccount, setSelectedAccount] = useState(null); // { id: number, label: string }
  const [accountsList, setAccountsList] = useState([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [reportMetadata, setReportMetadata] = useState(null);
  const [loadingReport, setLoadingReport] = useState(false);

  // --- Fetch Chart of Accounts for Selector ---
  useEffect(() => {
    const fetchAccounts = async () => {
      setLoadingAccounts(true);
      try {
        // Assuming chartOfAccounts endpoint returns array like [{ id, account_code, account_name, balance }]
        const res = await apiClient.get("/accounting/chart-of-accounts");
        const formattedAccounts = res.data.map(acc => ({
            id: acc.id,
            label: `${acc.account_code} - ${acc.account_name}`
        }));
        setAccountsList(formattedAccounts);
      } catch (err) {
        console.error("Error fetching accounts list:", err);
        toast.error("Could not load accounts list.");
        setAccountsList([]);
      } finally {
        setLoadingAccounts(false);
      }
    };
    fetchAccounts();
  }, []); // Run only once on mount

  // --- Generate Report ---
  const handleGenerateReport = async () => {
    if (!selectedAccount) {
      toast.error("Please select an account.");
      return;
    }
     if (!startDate || !endDate) {
      toast.error("Please select both a start and end date.");
      return;
    }

    setLoadingReport(true);
    setReportData(null);
    setReportMetadata(null);
    toast.dismiss();

    try {
      const res = await apiClient.get("/accounting/general-ledger", {
        params: {
          account_id: selectedAccount.id,
          start_date: startDate,
          end_date: endDate,
        },
      });
      setReportData(res.data);
      const meta = {
        serial: `GL-${selectedAccount.id}-${Date.now()}`,
        generatedAt: new Date().toLocaleString(),
        generatedBy: user ? user.name : "N/A",
      };
      setReportMetadata(meta);
      toast.success("General Ledger generated successfully!");
    } catch (err) {
      console.error("Error fetching General Ledger:", err);
      toast.error(err.response?.data?.message || "Failed to generate report.");
    } finally {
      setLoadingReport(false);
    }
  };

  // --- Print Handler ---
  const triggerPrint = useReactToPrint({
    content: () => reportContentRef.current,
    documentTitle: `General-Ledger-${selectedAccount?.label?.split(' ')[0] || 'Account'}-${startDate}-to-${endDate}`,
    copyStyles: true,
    pageStyle: `
      @media print {
        body { -webkit-print-color-adjust: exact; color-adjust: exact; }
        @page { size: A4; margin: 0.7in; }
        .no-print { display: none !important; }
        .MuiDataGrid-root { border: none !important; box-shadow: none !important; }
        .MuiDataGrid-columnHeaders { background-color: #f0f0f0 !important; color: black !important; -webkit-print-color-adjust: exact; }
        .MuiDataGrid-cell { border-bottom: 1px solid #ccc !important; color: black !important; padding-top: 2px !important; padding-bottom: 2px !important; } /* Reduce cell padding */
        .MuiDataGrid-footerContainer, .MuiDataGrid-toolbarContainer { display: none !important; }
        #report-container { width: 100% !important; padding: 0 !important; }
        /* Style opening/closing balance rows */
        #opening-balance-row th, #opening-balance-row td, #closing-balance-row th, #closing-balance-row td { font-weight: bold; background-color: #eee !important; -webkit-print-color-adjust: exact; color: black !important; }
      }
    `,
  });

  const handlePrint = () => {
    if (reportContentRef.current) {
        if (reportContentRef.current.innerHTML.trim() === '') {
             console.error("Print Error: Ref exists but is empty.");
             toast.error("Print failed: Report content is empty.");
             return;
        }
      triggerPrint();
    } else {
      console.error("Print Error: reportContentRef.current is null.");
      toast.error("Print failed: Component ref is not ready.");
    }
  };

  // --- Export Handlers ---
  const handleExportPDF = () => {
    if (!reportData || !reportMetadata || !selectedAccount) return;

    const doc = new jsPDF();
    const companyName = "Ligco Technologies";
    const reportTitle = "General Ledger"; // Use reportData for consistency
    const accountInfo = `Account: ${reportData.account_name} (${reportData.account_code})`;
    const reportPeriod = `For the period: ${formatDate(reportData.start_date)} to ${formatDate(reportData.end_date)}`;

    // PDF Header (Centered)
    doc.setFontSize(16);
    doc.text(companyName, doc.internal.pageSize.width / 2, 18, { align: 'center' });
    doc.setFontSize(14);
    doc.text(reportTitle, doc.internal.pageSize.width / 2, 26, { align: 'center' });
    doc.setFontSize(10);
    doc.text(accountInfo, doc.internal.pageSize.width / 2, 32, { align: 'center' });
    doc.text(reportPeriod, doc.internal.pageSize.width / 2, 38, { align: 'center' });

    // Metadata (Centered)
    doc.setFontSize(9);
    const metaText = `Report ID: ${reportMetadata.serial} | Generated At: ${reportMetadata.generatedAt} | Generated By: ${reportMetadata.generatedBy}`;
    doc.text(metaText, doc.internal.pageSize.width / 2, 46, { align: 'center' });

    // --- Table Data ---
    const head = [['Date', 'Description', 'Debit', 'Credit', 'Balance']];
    const body = [];

    // Opening Balance Row
     body.push([
         { content: 'Opening Balance', colSpan: 4, styles: { fontStyle: 'bold', fillColor: [230, 230, 230] } },
         { content: formatCurrencyBalance(reportData.opening_balance), styles: { fontStyle: 'bold', halign: 'right', fillColor: [230, 230, 230] } }
     ]);

    // Transaction Rows
    (reportData.transactions || []).forEach(tx => {
       body.push([
         formatDate(tx.transaction_date),
         tx.description,
         // Format only non-zero numbers
         Number(tx.debit) !== 0 ? formatCurrency(tx.debit) : '',
         Number(tx.credit) !== 0 ? formatCurrency(tx.credit) : '',
         formatCurrencyBalance(tx.balance) // Always format balance
       ]);
    });

    // Closing Balance Row
     body.push([
         { content: 'Closing Balance', colSpan: 4, styles: { fontStyle: 'bold', fillColor: [230, 230, 230] } },
         { content: formatCurrencyBalance(reportData.closing_balance), styles: { fontStyle: 'bold', halign: 'right', fillColor: [230, 230, 230] } }
     ]);

    // --- Generate Table ---
    autoTable(doc, {
      startY: 54, // Start below metadata
      head: head,
      body: body,
      theme: "striped",
      styles: { textColor: [0, 0, 0], fontSize: 9 },
      headStyles: { fontStyle: 'bold', fillColor: [200, 200, 200], textColor: [0, 0, 0] }, // Slightly darker header
      columnStyles: {
        0: { cellWidth: 25 },  // Date
        1: { cellWidth: 'auto'},// Description
        2: { cellWidth: 30, halign: 'right' }, // Debit
        3: { cellWidth: 30, halign: 'right' }, // Credit
        4: { cellWidth: 35, halign: 'right' }  // Balance
      },
      didParseCell: (data) => {
          // Additional styling for opening/closing rows if needed, already handled by cell styles
           if (data.row.raw[0]?.content === 'Opening Balance' || data.row.raw[0]?.content === 'Closing Balance') {
                data.cell.styles.fontStyle = 'bold';
                data.cell.styles.fillColor = [230, 230, 230]; // Match footer fill
           }
      }
    });

    doc.save(`General-Ledger-${reportMetadata.serial}.pdf`);
  };


  const handleExportCSV = () => {
    if (!reportData || !reportMetadata || !selectedAccount) return;

    let csv = "data:text/csv;charset=utf-8,\uFEFF"; // BOM for Excel
    csv += "General Ledger\n";
    csv += `Account,"${reportData.account_name} (${reportData.account_code})"\n`;
    csv += `Period,"${formatDate(reportData.start_date)} to ${formatDate(reportData.end_date)}"\n`;
    csv += `Report ID,${reportMetadata.serial}\n`;
    csv += `Generated At,${reportMetadata.generatedAt}\n`;
    csv += `Generated By,${reportMetadata.generatedBy}\n\n`;

    // --- Headers ---
    csv += "Date,Description,Debit,Credit,Balance\n";

    // --- Opening Balance ---
    csv += `"","Opening Balance",,,${Number(reportData.opening_balance) || 0}\n`;

    // --- Body Rows ---
    (reportData.transactions || []).forEach(tx => {
        const date = formatDate(tx.transaction_date);
        const desc = `"${(tx.description || '').toString().replace(/"/g, '""')}"`;
        const debit = Number(tx.debit) || 0;
        const credit = Number(tx.credit) || 0;
        const balance = Number(tx.balance) || 0;
        csv += `${date},${desc},${debit},${credit},${balance}\n`;
    });

     // --- Closing Balance ---
    csv += `"","Closing Balance",,,${Number(reportData.closing_balance) || 0}\n`;

    // --- Download ---
    const encodedUri = encodeURI(csv);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `General-Ledger-${reportMetadata.serial}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  return (
    <Box m={{ xs: "10px", md: "20px" }}>
      <Header
        title="General Ledger"
        subtitle="View detailed transactions for a specific account"
      />

      {/* --- Parameter Selection Form --- */}
      <Paper elevation={3} sx={{ p: { xs: 2, md: 3 }, mb: 3, backgroundColor: colors.primary[400] }}>
        <Grid container spacing={3} alignItems="center">
           {/* Account Selector */}
           <Grid item xs={12} md={5}>
             <Autocomplete
                  options={accountsList}
                  loading={loadingAccounts}
                  value={selectedAccount}
                  onChange={(event, newValue) => {
                    setSelectedAccount(newValue);
                  }}
                  getOptionLabel={(option) => option.label || ""}
                  isOptionEqualToValue={(option, value) => option.id === value.id}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Select Account"
                      variant="outlined"
                      InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                          <>
                            {loadingAccounts ? <CircularProgress color="inherit" size={20} /> : null}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      }}
                    />
                  )}
                />
           </Grid>
           {/* Date Pickers */}
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              label="Start Date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              variant="outlined"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              label="End Date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              variant="outlined"
            />
          </Grid>
          {/* Generate Button */}
          <Grid item xs={12} md={1}>
            <Button
              fullWidth
              variant="contained"
              color="secondary"
              onClick={handleGenerateReport}
              disabled={loadingReport || loadingAccounts} // Disable while loading accounts or report
              sx={{ height: "56px" }} // Match TextField height
            >
              {loadingReport ? <CircularProgress size={24} /> : "View"}
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* --- Loading Report Placeholder --- */}
      {loadingReport && (
        <Box display="flex" justifyContent="center" p={5}>
          <CircularProgress size={40} />
          <Typography sx={{ ml: 2, color: colors.grey[300] }}>Loading Ledger...</Typography>
        </Box>
      )}

      {/* --- Report Display --- */}
      {reportData && !loadingReport && (
        <Paper elevation={3} sx={{ p: { xs: 2, md: 3 }, backgroundColor: colors.primary[400] }}>
          {/* Action Buttons */}
          <Box className="no-print" display="flex" justifyContent="flex-end" mb={1}>
            <Stack direction="row" spacing={1}>
              <Tooltip title="Print Report">
                <IconButton onClick={handlePrint} size="small" sx={{ color: colors.grey[100] }}><PrintOutlinedIcon /></IconButton>
              </Tooltip>
              <Tooltip title="Export as PDF">
                <IconButton onClick={handleExportPDF} size="small" sx={{ color: colors.grey[100] }}><PictureAsPdfOutlinedIcon /></IconButton>
              </Tooltip>
              <Tooltip title="Export as CSV">
                <IconButton onClick={handleExportCSV} size="small" sx={{ color: colors.grey[100] }}><DescriptionOutlinedIcon /></IconButton>
              </Tooltip>
            </Stack>
          </Box>
          <Divider sx={{ mb: 1 }} className="no-print" />

          {/* The Report itself */}
          <Box id="report-container">
              <GeneralLedgerReport
                ref={reportContentRef}
                data={reportData}
                metadata={reportMetadata}
                colors={colors}
              />
          </Box>
        </Paper>
      )}

      {/* Placeholder if no account selected or no report generated yet */}
      {!reportData && !loadingReport && (
         <Paper elevation={3} sx={{ p: 5, backgroundColor: colors.primary[400], textAlign: 'center', minHeight: '50vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
             <Typography sx={{color: colors.grey[500]}}>
                Select an account and date range, then click "View" to generate the General Ledger report.
             </Typography>
         </Paper>
      )}
    </Box>
  );
}