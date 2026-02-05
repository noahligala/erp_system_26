// src/scenes/accounting/reports/TrialBalance.jsx

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Box,
  Paper,
  Typography,
  useTheme,
  Grid,
  Button,
  CircularProgress,
  Divider,
  IconButton,
  Tooltip,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import { DatePicker } from '@mui/x-date-pickers/DatePicker'; 
import { DateTime } from 'luxon'; 
import { tokens } from "../../../theme";
import Header from "../../../components/Header";
import { apiClient } from "../../../api/apiClient";
import { toast } from "react-toastify";

// NEW: Import globalPrint (Assuming path is correct)
import { globalPrint } from "../../../utils/print"; 

// Icons
import PrintOutlinedIcon from "@mui/icons-material/PrintOutlined";
import PictureAsPdfOutlinedIcon from "@mui/icons-material/PictureAsPdfOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";

// Print & Export Libs (Keep jspdf/autotable for PDF export)
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// --- Helper Functions ---
const formatCurrency = (amount) => { 
    const numericAmount = Number(amount);
    if (isNaN(numericAmount)) { return ""; }
    if (Math.abs(numericAmount) < 0.01) return ""; 
    return numericAmount.toLocaleString("en-US", { style: "currency", currency: "KES", minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
const formatCurrencyTotal = (amount) => {
    const numericAmount = Number(amount);
    if (isNaN(numericAmount)) { return ""; }
    return numericAmount.toLocaleString("en-US", { style: "currency", currency: "KES", minimumFractionDigits: 2, maximumFractionDigits: 2 });
};


const TrialBalance = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  // printRef is no longer needed for globalPrint, but kept for PDF export
  const printRef = useRef(); 

  const [reportData, setReportData] = useState(null);
  
  const [startDate, setStartDate] = useState(DateTime.local().startOf('month')); // Default to start of month for better period context
  const [endDate, setEndDate] = useState(DateTime.local());
  
  const [loading, setLoading] = useState(false);
  const [isBalanced, setIsBalanced] = useState(null);

  // --- Data Fetching ---
  const fetchReport = useCallback(async () => {
    if (!startDate || !endDate) {
      toast.error("Please select both a start and end date.");
      return;
    }
    setLoading(true);
    setReportData(null);
    setIsBalanced(null);

    const formattedStartDate = startDate.toISODate();
    const formattedEndDate = endDate.toISODate();

    try {
      // FIX: Use the correct API path /accounts/reports/trial-balance (or whatever your final route is)
      // I'm using '/accounts/reports/trial-balance' as it's the standard convention
      const response = await apiClient.get('/accounting/trial-balance', { 
        params: { 
            start_date: formattedStartDate, 
            end_date: formattedEndDate 
        },
      });
      
      const data = response.data;
      setReportData(data);
      setIsBalanced(data.is_balanced);

      if (data.is_balanced) {
        toast.success("Trial Balance generated successfully and is balanced.");
      } else {
        toast.warning("Trial Balance generated, but Debits do not equal Credits.");
      }

    } catch (error) {
      const backendMessage = error.response?.data?.message;
      const validationErrors = error.response?.data?.errors;
      let displayMessage = "Failed to fetch Trial Balance.";

      if (backendMessage) {
          displayMessage = backendMessage;
      } else if (validationErrors) {
          displayMessage = Object.values(validationErrors).flat().join(' | ');
      }
      
      toast.error(displayMessage);
      
      console.error("Trial Balance Fetch Error:", error.response || error.message); 

      setReportData(null);
      setIsBalanced(false);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  // --- Global Print Handler (FIX) ---
  const handlePrint = () => {
    if (!reportData || !reportData.accounts.length) {
        toast.info("No data to print.");
        return;
    }

    // 1. Generate Table HTML
    const tableRowsHtml = reportData.accounts.map(row => `
        <tr>
            <td>${row.account_code}</td>
            <td>${row.account_name}</td>
            <td style="text-align:right;">${formatCurrency(row.debit)}</td>
            <td style="text-align:right;">${formatCurrency(row.credit)}</td>
        </tr>
    `).join('');

    const printableContent = `
        <h2 style="text-align:center; margin-bottom: 5px;">TRIAL BALANCE</h2>
        <p style="text-align:center; margin-top:0; font-size: 11px;">Period: ${reportData.report_date || `${startDate.toISODate()} to ${endDate.toISODate()}`}</p>
        
        <table style="width:100%; border-collapse: collapse; font-size: 10px; margin-top: 15px;">
            <thead>
                <tr style="background-color: #f2f2f2;">
                    <th style="border:1px solid #ccc; padding: 6px; text-align: left;">Account Code</th>
                    <th style="border:1px solid #ccc; padding: 6px; text-align: left;">Account Name</th>
                    <th style="border:1px solid #ccc; padding: 6px; text-align: right;">Debit (KES)</th>
                    <th style="border:1px solid #ccc; padding: 6px; text-align: right;">Credit (KES)</th>
                </tr>
            </thead>
            <tbody>
                ${tableRowsHtml}
                <tr style="background-color: #e0e0e0; font-weight: bold;">
                    <td colspan="2" style="border:1px solid #ccc; padding: 6px;">GRAND TOTALS</td>
                    <td style="border:1px solid #ccc; padding: 6px; text-align: right;">${formatCurrencyTotal(reportData.total_debit)}</td>
                    <td style="border:1px solid #ccc; padding: 6px; text-align: right;">${formatCurrencyTotal(reportData.total_credit)}</td>
                </tr>
            </tbody>
        </table>
        <p style="text-align: left; font-size: 10px; margin-top: 15px; font-weight: bold; color: ${reportData.is_balanced ? 'green' : 'red'};">
             STATUS: ${reportData.is_balanced ? 'BALANCED' : 'UNBALANCED'} (Difference: ${formatCurrencyTotal(reportData.total_debit - reportData.total_credit)})
        </p>
    `;

    // 2. Call globalPrint
    globalPrint({
        title: `Trial Balance - ${endDate.toISODate()}`,
        content: printableContent,
        orientation: 'landscape',
        // Optional custom styling if needed beyond basic HTML
        styles: `
            table td, table th { border: 1px solid #aaa !important; }
        `,
        footer: `
            <div style="text-align: right; font-size: 9px; color: #555;">
                Generated by LigcoSync on ${DateTime.local().toLocaleString(DateTime.DATETIME_SHORT)}
            </div>
        `,
    });
  };

  // --- PDF Export Handler (Unchanged) ---
  const handleExportPDF = () => {
    if (!reportData || !reportData.accounts || !reportData.accounts.length) {
      toast.info("No data to export.");
      return;
    }
    
    const doc = new jsPDF({ orientation: 'landscape' });
    const tableColumn = ["Account Code", "Account Name", "Debit (KES)", "Credit (KES)"];
    
    // Prepare table rows
    const tableRows = reportData.accounts.map(item => [
      item.account_code,
      item.account_name,
      formatCurrencyTotal(item.debit),
      formatCurrencyTotal(item.credit),
    ]);

    // Add totals row
    tableRows.push([
      { content: 'TOTALS', colSpan: 2, styles: { fontStyle: 'bold', fillColor: colors.primary[700] } },
      formatCurrencyTotal(reportData.total_debit),
      formatCurrencyTotal(reportData.total_credit),
    ]);

    // Header Content
    doc.setFontSize(14);
    doc.text("Trial Balance Report", 15, 20);
    doc.setFontSize(10);
    doc.text(`Period: ${reportData.report_date || `${startDate.toISODate()} to ${endDate.toISODate()}`}`, 15, 26);
    doc.text(`Generated: ${DateTime.local().toLocaleString(DateTime.DATETIME_SHORT)}`, 15, 32);

    // AutoTable generation
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 40,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: colors.primary[700], textColor: 255 },
      columnStyles: {
        2: { halign: 'right' }, // Debit
        3: { halign: 'right' }, // Credit
      },
    });

    doc.save(`Trial_Balance_${endDate.toISODate()}.pdf`);
  };

  return (
    <Box m="20px">
      <Header title="TRIAL BALANCE" subtitle="Summary of all General Ledger account balances." />

      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={3} alignItems="flex-end">
          
          <Grid item xs={12} sm={4} md={3}>
            <DatePicker
              label="Start Date"
              value={startDate}
              onChange={(newValue) => setStartDate(newValue)}
              slotProps={{ textField: { fullWidth: true, helperText: 'Filter transactions from this date.' } }}
            />
          </Grid>
          
          <Grid item xs={12} sm={4} md={3}>
            <DatePicker
              label="End Date"
              value={endDate}
              onChange={(newValue) => setEndDate(newValue)}
              slotProps={{ textField: { fullWidth: true, helperText: 'All transactions up to this date.' } }}
            />
          </Grid>
          
          <Grid item xs={12} sm={4} md={2}>
            <Button
              variant="contained"
              color="secondary"
              onClick={fetchReport}
              disabled={loading || !endDate}
              fullWidth
              sx={{ height: '56px' }}
            >
              {loading ? <CircularProgress size={24} /> : "Generate Report"}
            </Button>
          </Grid>
          
          <Grid item xs={12} md={4} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            <Tooltip title="Print Report (Global Print)">
                <IconButton onClick={handlePrint} disabled={!reportData}>
                    <PrintOutlinedIcon />
                </IconButton>
            </Tooltip>
            <Tooltip title="Export to PDF">
                <IconButton onClick={handleExportPDF} disabled={!reportData}>
                    <PictureAsPdfOutlinedIcon />
                </IconButton>
            </Tooltip>
          </Grid>
        </Grid>
      </Paper>

      {/* --- Report Output --- */}
      {reportData && (
        <Paper elevation={3} sx={{ p: 3 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h5" color={colors.grey[100]}>
              Report Period: {reportData.report_date || `${startDate.toISODate()} to ${endDate.toISODate()}`}
            </Typography>
            <Chip
              icon={isBalanced ? <CheckCircleOutlineIcon /> : <ErrorOutlineIcon />}
              label={isBalanced ? "BALANCED" : "UNBALANCED"}
              color={isBalanced ? "success" : "error"}
              sx={{ fontWeight: 'bold' }}
            />
          </Box>
          <Divider sx={{ mb: 2 }} />

          {/* Display Table (MUI) */}
          <Box>
            <Typography variant="h4" textAlign="center" gutterBottom>TRIAL BALANCE</Typography>
            <Typography variant="body1" textAlign="center" mb={2}>Period: {reportData.report_date || `${startDate.toISODate()} to ${endDate.toISODate()}`}</Typography>
            
            <TableContainer component={Paper} elevation={0}>
              <Table size="small">
                <TableHead sx={{ backgroundColor: colors.primary[700] }}>
                  <TableRow>
                    <TableCell sx={{ color: colors.grey[100], fontWeight: 'bold' }}>Account Code</TableCell>
                    <TableCell sx={{ color: colors.grey[100], fontWeight: 'bold' }}>Account Name</TableCell>
                    <TableCell align="right" sx={{ color: colors.grey[100], fontWeight: 'bold' }}>Debit (KES)</TableCell>
                    <TableCell align="right" sx={{ color: colors.grey[100], fontWeight: 'bold' }}>Credit (KES)</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {reportData.accounts.map((row) => (
                    <TableRow key={row.account_code}>
                      <TableCell>{row.account_code}</TableCell>
                      <TableCell>{row.account_name}</TableCell>
                      <TableCell align="right">{formatCurrency(row.debit)}</TableCell>
                      <TableCell align="right">{formatCurrency(row.credit)}</TableCell>
                    </TableRow>
                  ))}
                  
                  {/* Totals Row */}
                  <TableRow sx={{ backgroundColor: colors.primary[800] }}>
                    <TableCell colSpan={2} sx={{ fontWeight: 'bold', fontSize: '1rem' }}>GRAND TOTALS</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold', fontSize: '1rem' }}>
                      {formatCurrencyTotal(reportData.total_debit)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold', fontSize: '1rem' }}>
                      {formatCurrencyTotal(reportData.total_credit)}
                    </TableCell>
                  </TableRow>

                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </Paper>
      )}

      {loading === false && !reportData && (
        <Box textAlign="center" p={5}>
          <DescriptionOutlinedIcon sx={{ fontSize: 50, color: colors.grey[500] }} />
          <Typography variant="h6" color={colors.grey[500]}>
            Select a date range and click 'Generate Report' to view the Trial Balance.
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default TrialBalance;