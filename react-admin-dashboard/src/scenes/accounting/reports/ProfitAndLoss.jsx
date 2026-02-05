// src/scenes/accounting/reports/ProfitAndLoss.jsx

import React, { useState, useRef } from "react";
import {
  Box,
  Paper,
  Typography,
  useTheme,
  Grid,
  TextField, // Keep TextField for generic inputs/form structure
  Button,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Divider,
  IconButton,
  Tooltip,
  Stack,
} from "@mui/material";
import { DatePicker } from '@mui/x-date-pickers/DatePicker'; // 💡 NEW: MUI DatePicker
import { tokens } from "../../../theme"; 
import Header from "../../../components/Header"; 
import {apiClient} from "../../../api/apiClient"; 
import { toast } from "react-toastify";
import { DateTime } from 'luxon'; 

// Icons for new buttons
import PrintOutlinedIcon from "@mui/icons-material/PrintOutlined";
import PictureAsPdfOutlinedIcon from "@mui/icons-material/PictureAsPdfOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined"; // CSV

// Print & Export Libs
import { useReactToPrint } from "react-to-print";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// *** REPLACE THIS with the actual path to your auth context/hook ***
import { useAuth } from "../../../api/AuthProvider"; // eslint-disable-line no-unused-vars

// --- Helper Functions ---
const formatCurrency = (amount) => {
  return (amount ?? 0).toLocaleString("en-US", {
    style: "currency",
    currency: "KES",
  });
};

const defaultStartDate = DateTime.local().startOf('month');
const defaultEndDate = DateTime.local();

// --- Report Component (Remains Unchanged) ---
const ProfitLossReport = React.forwardRef(({ data, metadata, colors }, ref) => {
  // 🛡️ Guard Clause: If data is null/undefined, render nothing or a placeholder.
  if (!data) {
    return (
        <Box ref={ref} sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h5" color={colors.grey[300]}>
                No report data available.
            </Typography>
        </Box>
    );
  }

  // Safely access revenue and expenses with fallbacks
  const revenueAccounts = data.revenue?.accounts || [];
  const revenueTotal = data.revenue?.total || 0;
  
  const expenseAccounts = data.expenses?.accounts || [];
  const expenseTotal = data.expenses?.total || 0;

  const netIncome = data.net_income || 0;


  return (
    <Box ref={ref} sx={{ p: { xs: 2, md: 4 } }}>
      {/* Report Header */}
      <Box textAlign="center" mb={4}>
        <Typography variant="h3" fontWeight="600">
          Ligco Technologies
        </Typography>
        <Typography variant="h4" fontWeight="500">
          Profit & Loss Statement
        </Typography>
        <Typography variant="h5" color={colors.grey[300]}>
          {data.report_period || "Period N/A"}
        </Typography>
      </Box>

      {/* Revenue Section */}
      <Box mb={3}>
        <Typography variant="h4" sx={{ mb: 1, color: colors.greenAccent[400] }}>
          Revenue
        </Typography>
        <TableContainer
          component={Paper}
          sx={{ backgroundColor: "transparent", boxShadow: "none" }}
        >
          <Table size="small">
            <TableBody>
              {revenueAccounts.length > 0 ? (
                revenueAccounts.map((acc, index) => (
                  <TableRow
                    key={acc.account_name || index} // Fallback key
                    sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
                  >
                    <TableCell sx={{ pl: 4, fontSize: "1rem" }}>
                      {acc.account_name || "Unknown Account"}
                    </TableCell>
                    <TableCell align="right" sx={{ fontSize: "1rem" }}>
                      {formatCurrency(acc.balance)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={2} align="center" sx={{ pl: 4 }}>
                    No revenue recorded for this period.
                  </TableCell>
                </TableRow>
              )}
              <TableRow>
                <TableCell colSpan={2}>
                  <Divider sx={{ my: 1 }} />
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell
                  sx={{
                    pl: 2,
                    fontWeight: "bold",
                    fontSize: "1.1rem",
                  }}
                >
                  Total Revenue
                </TableCell>
                <TableCell
                  align="right"
                  sx={{ fontWeight: "bold", fontSize: "1.1rem" }}
                >
                  {formatCurrency(revenueTotal)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* Expenses Section */}
      <Box mb={3}>
        <Typography variant="h4" sx={{ mb: 1, color: colors.redAccent[400] }}>
          Expenses
        </Typography>
        <TableContainer
          component={Paper}
          sx={{ backgroundColor: "transparent", boxShadow: "none" }}
        >
          <Table size="small">
            <TableBody>
              {expenseAccounts.length > 0 ? (
                expenseAccounts.map((acc, index) => (
                  <TableRow
                    key={acc.account_name || index}
                    sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
                  >
                    <TableCell sx={{ pl: 4, fontSize: "1rem" }}>
                      {acc.account_name || "Unknown Account"}
                    </TableCell>
                    <TableCell align="right" sx={{ fontSize: "1rem" }}>
                      {formatCurrency(acc.balance)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={2} align="center" sx={{ pl: 4 }}>
                    No expenses recorded for this period.
                  </TableCell>
                </TableRow>
              )}
              <TableRow>
                <TableCell colSpan={2}>
                  <Divider sx={{ my: 1 }} />
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell
                  sx={{
                    pl: 2,
                    fontWeight: "bold",
                    fontSize: "1.1rem",
                  }}
                >
                  Total Expenses
                </TableCell>
                <TableCell
                  align="right"
                  sx={{ fontWeight: "bold", fontSize: "1.1rem" }}
                >
                  {formatCurrency(expenseTotal)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* Net Income Section */}
      <Divider sx={{ my: 3, borderColor: colors.grey[700] }} />
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        p={2}
        sx={{
          backgroundColor:
            netIncome >= 0
              ? colors.greenAccent[900]
              : colors.redAccent[900],
          borderRadius: "8px",
        }}
      >
        <Typography variant="h3" fontWeight="600">
          Net Income
        </Typography>
        <Typography
          variant="h3"
          fontWeight="600"
          color={
            netIncome >= 0
              ? colors.greenAccent[300]
              : colors.redAccent[300]
          }
        >
          {formatCurrency(netIncome)}
        </Typography>
      </Box>

      {/* Metadata Footer */}
      {metadata && (
        <Box mt={4} pt={2} borderTop={1} borderColor={colors.grey[700]}>
          <Typography variant="body2" color={colors.grey[300]}>
            Report ID: {metadata.serial || 'N/A'}
          </Typography>
          <Typography variant="body2" color={colors.grey[300]}>
            Generated At: {metadata.generatedAt || 'N/A'}
          </Typography>
          <Typography variant="body2" color={colors.grey[300]}>
            Generated By: {metadata.generatedBy || 'N/A'}
          </Typography>
        </Box>
      )}
    </Box>
  );
});

// --- Main Component ---
export default function ProfitAndLoss() {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const reportContentRef = useRef(); 

  const { user } = useAuth(); // Assumes useAuth is correctly imported

  // State
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultEndDate);
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dateError, setDateError] = useState(false); 

  const [reportMetadata, setReportMetadata] = useState(null);


  const handleGenerateReport = async () => {
    // 💡 Validation Check
    if (!startDate?.isValid || !endDate?.isValid) {
      toast.error("Please select valid start and end dates.");
      return;
    }
    if (startDate > endDate) {
        toast.error("Start date cannot be after the end date.");
        setDateError(true);
        return;
    }
    setDateError(false);


    setLoading(true);
    setReportData(null);
    setReportMetadata(null); // Clear old metadata
    toast.dismiss();

    try {
      // 💡 Format dates to ISO string for API
      const res = await apiClient.get("/accounting/profit-loss", {
        params: {
          start_date: startDate.toISODate(),
          end_date: endDate.toISODate(),
        },
      });
      setReportData(res.data);

      const meta = {
        serial: `PL-${DateTime.local().toMillis()}`, // Use Luxon for serial
        generatedAt: DateTime.local().toLocaleString(DateTime.DATETIME_FULL), // Luxon formatting
        generatedBy: user ? user.name : "N/A",
      };
      setReportMetadata(meta); 
      toast.success("Report generated successfully!");
    } catch (err) {
      console.error("Error fetching P&L report:", err);
      toast.error(err.response?.data?.message || "Failed to generate report.");
    } finally {
      setLoading(false);
    }
  };

// --- Print Handler ---
  const handlePrint = () => {
    if (!reportData) {
        toast.error("Generate the report first.");
        return;
    }

    if (reportContentRef.current) {
        triggerPrint();
    } else {
        toast.error("Print failed: Component ref is not ready.");
    }
  };
  
  const triggerPrint = useReactToPrint({
    content: () => reportContentRef.current,
    documentTitle: `Profit-Loss-Statement-${startDate.toISODate()}-to-${endDate.toISODate()}`,
    pageStyle: `
      @media print {
        body {
          -webkit-print-color-adjust: exact;
          color-adjust: exact;
        }
        @page {
          size: auto;
          margin: 0.5in;
        }
      }
    `,
  });

  // --- Export Handlers (Updated to use Luxon formatting) ---
  const handleExportPDF = () => {
    if (!reportData || !reportMetadata) return;

    const doc = new jsPDF();
    const companyName = "Ligco Technologies";
    const reportTitle = "Profit & Loss Statement";
    const reportPeriod = reportData.report_period;

    // --- PDF Header ---
    doc.setFontSize(18);
    doc.text(companyName, 14, 22);
    doc.setFontSize(14);
    doc.text(reportTitle, 14, 30);
    doc.setFontSize(10);
    doc.text(reportPeriod, 14, 36);

    // --- NEW: Add Metadata to PDF ---
    doc.setFontSize(9);
    doc.text(`Report ID: ${reportMetadata.serial}`, 14, 42);
    doc.text(`Generated At: ${reportMetadata.generatedAt}`, 14, 46);
    doc.text(`Generated By: ${reportMetadata.generatedBy}`, 14, 50);

    // --- Revenue Table ---
    const revenueBody = [
      ...(Array.isArray(reportData.revenue.accounts)
        ? reportData.revenue.accounts.map((acc) => [
            acc.account_name,
            formatCurrency(acc.balance),
          ])
        : [["No revenue recorded", ""]]),
      [
        {
          content: "Total Revenue",
          styles: { fontStyle: "bold", halign: "right" },
        },
        {
          content: formatCurrency(reportData.revenue.total),
          styles: { fontStyle: "bold", halign: "right" },
        },
      ],
    ];

    autoTable(doc, {
      startY: 54, // Adjusted startY to make space for metadata
      head: [
        [
          {
            content: "Revenue",
            styles: {
              fillColor: colors.greenAccent[700],
              textColor: 255,
              fontSize: 12,
            },
          },
          "",
        ],
      ],
      body: revenueBody,
      theme: "striped",
      headStyles: { fillColor: colors.greenAccent[700] },
      columnStyles: {
        0: { cellWidth: 140 },
        1: { halign: "right", cellWidth: 36 },
      },
      didParseCell: (data) => {
        if (data.row.section === "head") {
          data.cell.styles.fillColor = colors.greenAccent[600];
        }
      },
    });

    // --- Expenses Table ---
    const expensesBody = [
      ...(Array.isArray(reportData.expenses.accounts)
        ? reportData.expenses.accounts.map((acc) => [
            acc.account_name,
            formatCurrency(acc.balance),
          ])
        : [["No expenses recorded", ""]]),
      [
        {
          content: "Total Expenses",
          styles: { fontStyle: "bold", halign: "right" },
        },
        {
          content: formatCurrency(reportData.expenses.total),
          styles: { fontStyle: "bold", halign: "right" },
        },
      ],
    ];

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 10,
      head: [
        [
          {
            content: "Expenses",
            styles: {
              fillColor: colors.redAccent[700],
              textColor: 255,
              fontSize: 12,
            },
          },
          "",
        ],
      ],
      body: expensesBody,
      theme: "striped",
      headStyles: { fillColor: colors.redAccent[700] },
      columnStyles: {
        0: { cellWidth: 140 },
        1: { halign: "right", cellWidth: 36 },
      },
      didParseCell: (data) => {
        if (data.row.section === "head") {
          data.cell.styles.fillColor = colors.redAccent[600];
        }
      },
    });

    // --- Net Income Total ---
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 10,
      body: [
        [
          {
            content: "Net Income",
            styles: { fontStyle: "bold", fontSize: 14, halign: "right" },
          },
          {
            content: formatCurrency(reportData.net_income),
            styles: { fontStyle: "bold", fontSize: 14, halign: "right" },
          },
        ],
      ],
      theme: "plain",
      styles: {
        fillColor:
          reportData.net_income >= 0
            ? colors.greenAccent[800]
            : colors.redAccent[800],
        textColor: 255,
      },
      columnStyles: {
        0: { cellWidth: 140 },
        1: { halign: "right", cellWidth: 36 },
      },
    });

    doc.save(`Profit-Loss-Statement-${reportMetadata.serial}.pdf`);
  };

  const handleExportCSV = () => {
    if (!reportData || !reportMetadata) return;

    let csvContent = "data:text/csv;charset=utf-8,\uFEFF"; // Add BOM for better Excel compatibility
    csvContent += "Profit & Loss Statement\n";
    csvContent += `Period: ${reportData.report_period}\n`;

    // --- NEW: Add Metadata to CSV ---
    csvContent += `Report ID,${reportMetadata.serial}\n`;
    csvContent += `Generated At,${reportMetadata.generatedAt}\n`;
    csvContent += `Generated By,${reportMetadata.generatedBy}\n\n`;

    // Revenue
    csvContent += "REVENUE\n";
    csvContent += "Account,Amount\n";
    if (Array.isArray(reportData.revenue.accounts)) {
      reportData.revenue.accounts.forEach((acc) => {
        csvContent += `"${acc.account_name}",${acc.balance}\n`;
      });
    }
    csvContent += "Total Revenue," + reportData.revenue.total + "\n\n";

    // Expenses
    csvContent += "EXPENSES\n";
    csvContent += "Account,Amount\n";
    if (Array.isArray(reportData.expenses.accounts)) {
      reportData.expenses.accounts.forEach((acc) => {
        csvContent += `"${acc.account_name}",${acc.balance}\n`;
      });
    }
    csvContent += "Total Expenses," + reportData.expenses.total + "\n\n";

    // Net Income
    csvContent += "NET INCOME," + reportData.net_income + "\n";

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `Profit-Loss-Statement-${reportMetadata.serial}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Box m={{ xs: "10px", md: "20px" }}>
      <Header
        title="Profit & Loss Report"
        subtitle="Generate an income statement for a specific period"
      />

      {/* --- Date Selection Form --- */}
      <Paper
        elevation={3}
        sx={{
          p: { xs: 2, md: 3 },
          mb: 3,
          backgroundColor: colors.primary[400],
        }}
      >
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={5}>
            {/* 💡 LUXON FIX 5: Use simple TextField for ISO date input */}
            <TextField
              fullWidth
              label="Start Date"
              type="date"
              value={startDate?.toISODate() || ''} // Use ISODate for input value
              onChange={(e) => setStartDate(DateTime.fromISO(e.target.value))} // Convert back to Luxon
              InputLabelProps={{ shrink: true }}
              variant="outlined"
              error={dateError}
              helperText={dateError ? "Start date cannot be after end date." : null}
            />
          </Grid>
          <Grid item xs={12} md={5}>
            {/* 💡 LUXON FIX 5: Use simple TextField for ISO date input */}
            <TextField
              fullWidth
              label="End Date"
              type="date"
              value={endDate?.toISODate() || ''} // Use ISODate for input value
              onChange={(e) => setEndDate(DateTime.fromISO(e.target.value))} // Convert back to Luxon
              InputLabelProps={{ shrink: true }}
              variant="outlined"
              error={dateError}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <Button
              fullWidth
              variant="contained"
              color="secondary"
              onClick={handleGenerateReport}
              disabled={loading}
              sx={{ height: "56px", fontSize: "16px" }}
            >
              {loading ? <CircularProgress size={24} /> : "Generate"}
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* --- Loading Spinner --- */}
      {loading && (
        <Box display="flex" justifyContent="center" p={5}>
          <CircularProgress />
        </Box>
      )}

      {/* --- Report Display --- */}
      {reportData && (
        <Paper
          elevation={3}
          sx={{
            p: { xs: 2, md: 3 },
            backgroundColor: colors.primary[400],
          }}
        >
          {/* Action Buttons */}
          <Box display="flex" justifyContent="flex-end" mb={2}>
            <Stack direction="row" spacing={1}>
              <Tooltip title="Print Report">
                <IconButton
                  onClick={handlePrint} 
                  sx={{ color: colors.grey[100] }}
                >
                  <PrintOutlinedIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Export as PDF">
                <IconButton
                  onClick={handleExportPDF}
                  sx={{ color: colors.grey[100] }}
                >
                  <PictureAsPdfOutlinedIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Export as CSV">
                <IconButton
                  onClick={handleExportCSV}
                  sx={{ color: colors.grey[100] }}
                >
                  <DescriptionOutlinedIcon />
                </IconButton>
              </Tooltip>
            </Stack>
          </Box>
          <Divider sx={{ mb: 2 }} />

          {/* The Report itself */}
          <ProfitLossReport
            ref={reportContentRef}
            data={reportData}
            metadata={reportMetadata} // Pass metadata
            colors={colors}
          />
        </Paper>
      )}
    </Box>
  );
}