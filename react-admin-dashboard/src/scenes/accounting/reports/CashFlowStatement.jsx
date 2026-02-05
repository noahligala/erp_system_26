// src/scenes/accounting/reports/CashFlowStatement.jsx

import React, { useState, useRef, useCallback } from "react";
import {
  Box,
  Paper,
  Typography,
  useTheme,
  Grid,
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
import { DatePicker } from '@mui/x-date-pickers/DatePicker'; // Requires @mui/x-date-pickers/DatePicker
import { tokens } from "../../../theme"; 
import Header from "../../../components/Header"; 
import { apiClient } from "../../../api/apiClient"; 
import { toast } from "react-toastify";
import { DateTime } from 'luxon'; 

// Icons
import PrintOutlinedIcon from "@mui/icons-material/PrintOutlined";
import PictureAsPdfOutlinedIcon from "@mui/icons-material/PictureAsPdfOutlined";

// 💡 Import globalPrint (Assuming location)
import { globalPrint } from "../../../utils/print"; 

// --- Helper Functions ---
const formatCurrency = (amount) => {
  return (amount ?? 0).toLocaleString("en-US", {
    style: "currency",
    currency: "KES",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const defaultStartDate = DateTime.local().startOf('year');
const defaultEndDate = DateTime.local();

/**
 * Renders a single section (Operating, Investing, or Financing).
 */
const CashFlowSection = ({ title, details, total, isFinal = false }) => {
    const theme = useTheme();
    const colors = tokens(theme.palette.mode);

    const totalColor = total >= 0 ? colors.greenAccent[400] : colors.redAccent[400];
    const totalBg = total >= 0 ? colors.greenAccent[900] : colors.redAccent[900];

    return (
        <Box mb={4}>
            <Typography 
                variant="h5" 
                fontWeight="600" 
                sx={{ mb: 1, borderBottom: `2px solid ${colors.grey[700]}`, pb: 0.5, color: colors.grey[100] }}
            >
                {title}
            </Typography>
            
            <TableContainer component={Paper} elevation={0} sx={{ backgroundColor: 'transparent' }}>
                <Table size="small">
                    <TableBody>
                        {details.map((item, index) => (
                            <TableRow key={index}>
                                <TableCell sx={{ pl: 4, border: 0, py: 0.5 }}>{item.account}</TableCell>
                                <TableCell align="right" sx={{ border: 0, py: 0.5 }}>{formatCurrency(item.adjustment)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            <Box 
                p={1} 
                mt={1} 
                sx={{ backgroundColor: isFinal ? totalBg : colors.primary[600], borderRadius: 1 }}
            >
                <Typography 
                    variant={isFinal ? "h4" : "h6"} 
                    fontWeight="bold" 
                    display="flex" 
                    justifyContent="space-between"
                >
                    <span>{isFinal ? `NET CASH FLOW` : `Total ${title}`}</span>
                    <span style={{ color: isFinal ? totalColor : colors.grey[100] }}>
                        {formatCurrency(total)}
                    </span>
                </Typography>
            </Box>
        </Box>
    );
};


// --- Main Component ---
export default function CashFlowStatement() {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const reportContentRef = useRef();

  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultEndDate);
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dateError, setDateError] = useState(false);
  
  // NOTE: This report does not require archiving yet, but structure is ready.

  const handleGenerateReport = async () => {
    if (!startDate?.isValid || !endDate?.isValid || startDate > endDate) {
      toast.error("Please select a valid date range (Start date must be before End date).");
      setDateError(true);
      return;
    }
    setDateError(false);
    setLoading(true);
    setReportData(null);
    toast.dismiss();

    try {
      // API call to the new Cash Flow endpoint
      const res = await apiClient.get("/accounting/cash-flow-statement", {
        params: {
          start_date: startDate.toISODate(),
          end_date: endDate.toISODate(),
        },
      });
      
      setReportData(res.data);
      toast.success("Cash Flow Statement generated successfully!");
    } catch (err) {
      console.error("Error fetching Cash Flow report:", err.response || err);
      toast.error(err.response?.data?.message || "Failed to generate Cash Flow Statement.");
    } finally {
      setLoading(false);
    }
  };

  // --- Print Handler (Global Print Integration) ---
  const handlePrint = useCallback(() => {
    if (!reportData) {
        toast.error("Generate the report first.");
        return;
    }
    
    // Helper to generate HTML rows for one section
    const renderDetailRows = (details) => {
        return details.map(item => `
            <tr>
                <td style="padding-left: 20px; width: 70%;">${item.account}</td>
                <td style="text-align: right; width: 30%;">${formatCurrency(item.adjustment)}</td>
            </tr>
        `).join('');
    };

    // Helper to generate HTML for a full section box
    const renderSectionHtml = (title, details, total, isFinal = false) => {
        const totalColor = total >= 0 ? '#4CAF50' : '#F44336';
        const totalBg = isFinal ? (total >= 0 ? '#e8f5e9' : '#ffebee') : '#f5f5f5';
        const totalFontSize = isFinal ? '18px' : '14px';

        return `
            <div style="margin-bottom: 20px;">
                <h3 style="font-size: 16px; font-weight: bold; border-bottom: 1px solid #ccc; padding-bottom: 5px;">${title}</h3>
                
                <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                    <tbody>
                        ${renderDetailRows(details)}
                    </tbody>
                </table>

                <div style="padding: 8px 10px; margin-top: 5px; background-color: ${totalBg}; border-radius: 4px;">
                    <p style="font-size: ${totalFontSize}; font-weight: bold; display: flex; justify-content: space-between; margin: 0;">
                        <span>${isFinal ? 'NET CASH FLOW' : `Total ${title}`}</span>
                        <span style="color: ${totalColor};">${formatCurrency(total)}</span>
                    </p>
                </div>
            </div>
        `;
    };

    const printableContent = `
        <div style="padding: 10px;">
            ${renderSectionHtml(
                "Cash Flow from Operating Activities",
                [{ account: "Net Income", adjustment: reportData.net_income }, ...reportData.operating.details],
                reportData.operating.total
            )}
            
            ${renderSectionHtml(
                "Cash Flow from Investing Activities",
                reportData.investing.details,
                reportData.investing.total
            )}
            
            ${renderSectionHtml(
                "Cash Flow from Financing Activities",
                reportData.financing.details,
                reportData.financing.total
            )}

            <div style="border-top: 2px solid #000; padding-top: 10px; margin-top: 20px;">
                <h3 style="font-size: 18px; font-weight: bold; display: flex; justify-content: space-between; margin: 0;">
                    <span>ENDING CASH BALANCE</span>
                    <span style="color: #1e88e5;">${formatCurrency(reportData.ending_cash_balance)}</span>
                </h3>
            </div>
        </div>
    `;

    // 💡 Call globalPrint utility
    globalPrint({
        title: `Statement of Cash Flows - ${reportData.report_period}`,
        content: printableContent,
        orientation: 'portrait',
        header: `
            <div style="text-align: center; font-size: 18px; font-weight: bold;">Statement of Cash Flows</div>
            <div style="text-align: center; font-size: 12px; color: #555;">Period: ${reportData.report_period}</div>
        `,
        styles: `
            body { font-family: Arial, sans-serif; }
            table { page-break-inside: avoid; }
            td { padding: 3px 5px; border: none; }
        `
    });
  }, [reportData]);


  return (
    <Box m="20px">
      <Header
        title="CASH FLOW STATEMENT"
        subtitle="Analyze liquidity from operating, investing, and financing activities (Indirect Method)."
      />

      {/* --- Date Selection Form --- */}
      <Paper elevation={3} sx={{ p: 3, mb: 3, backgroundColor: colors.primary[400] }}>
        <Grid container spacing={3} alignItems="center">
          
          <Grid item xs={12} md={4}>
            {/* MUI DatePicker input */}
            <DatePicker
              label="Start Date"
              value={startDate}
              onChange={setStartDate}
              slotProps={{ 
                textField: { 
                  fullWidth: true, 
                  variant: "outlined",
                  error: dateError, 
                }
              }}
            />
          </Grid>
          
          <Grid item xs={12} md={4}>
            {/* MUI DatePicker input */}
            <DatePicker
              label="End Date"
              value={endDate}
              onChange={setEndDate}
              slotProps={{ 
                textField: { 
                  fullWidth: true, 
                  variant: "outlined",
                  error: dateError, 
                  helperText: dateError ? "Start date cannot be after End date." : null
                }
              }}
            />
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Button
              fullWidth
              variant="contained"
              color="secondary"
              onClick={handleGenerateReport}
              disabled={loading}
              sx={{ height: "56px", fontSize: "16px" }}
            >
              {loading ? <CircularProgress size={24} /> : "Generate Report"}
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* --- Report Output --- */}
      {loading && (
        <Box display="flex" justifyContent="center" p={5}>
          <CircularProgress />
        </Box>
      )}

      {reportData && (
        <Paper ref={reportContentRef} elevation={3} sx={{ p: 4, backgroundColor: colors.primary[400] }}>
            
            <Stack direction="row" justifyContent="space-between" mb={3} borderBottom={`1px solid ${colors.grey[700]}`}>
                <Box>
                    <Typography variant="h3" fontWeight="bold">Statement of Cash Flows</Typography>
                    <Typography variant="subtitle1" color="text.secondary">
                        {reportData.report_period}
                    </Typography>
                </Box>
                <IconButton onClick={handlePrint} sx={{ color: colors.grey[100] }}>
                  <PrintOutlinedIcon />
                </IconButton>
            </Stack>

            {/* --- OPERATING ACTIVITIES --- */}
            <CashFlowSection 
                title="Cash Flow from Operating Activities" 
                details={[
                    { account: "Net Income", adjustment: reportData.net_income },
                    ...reportData.operating.details
                ]}
                total={reportData.operating.total}
            />

            <Divider sx={{ my: 3 }} />
            
            {/* --- INVESTING ACTIVITIES --- */}
            <CashFlowSection 
                title="Cash Flow from Investing Activities" 
                details={reportData.investing.details}
                total={reportData.investing.total}
            />

            <Divider sx={{ my: 3 }} />

            {/* --- FINANCING ACTIVITIES --- */}
            <CashFlowSection 
                title="Cash Flow from Financing Activities" 
                details={reportData.financing.details}
                total={reportData.financing.total}
            />

            <Divider sx={{ my: 3 }} />

            {/* --- NET CHANGE IN CASH --- */}
            <CashFlowSection 
                title="Net Change in Cash"
                details={[
                    { account: "Opening Balance (Not Calculated)", adjustment: 0 }, 
                    { account: "Net Change During Period", adjustment: reportData.net_change_in_cash } 
                ]}
                total={reportData.net_change_in_cash}
                isFinal={true}
            />

            <Box mt={3} p={2} sx={{ borderTop: `2px solid ${colors.grey[300]}` }}>
                <Typography variant="h5" fontWeight="bold" display="flex" justifyContent="space-between">
                    <span>ENDING CASH BALANCE</span>
                    <span style={{ color: colors.greenAccent[400] }}>
                        {formatCurrency(reportData.ending_cash_balance)}
                    </span>
                </Typography>
            </Box>
        </Paper>
      )}
      
      {!loading && !reportData && (
        <Box textAlign="center" p={5}>
          <Typography variant="h6" color={colors.grey[500]}>
            Select a date range to generate the Cash Flow Statement.
          </Typography>
        </Box>
      )}
    </Box>
  );
}