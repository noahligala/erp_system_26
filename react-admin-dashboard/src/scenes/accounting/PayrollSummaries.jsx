import React, { useEffect, useState, useMemo } from "react";
import {
  Box,
  Button,
  Typography,
  IconButton,
  Tooltip,
  useTheme,
  CircularProgress,
  Grid,
  Paper,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableFooter,
  TextField,
  Divider,
  Collapse,
  Tabs,
  Tab,
} from "@mui/material";
import {
  Refresh as RefreshIcon,
  Print as PrintIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from "@mui/icons-material";
// Assuming paths relative to src/scenes/accounting/PayrollSummaries.jsx
import Header from "../../components/Header.jsx";
import {apiClient} from "../../api/apiClient.js";
import { tokens } from "../../theme.js";
import { AdapterLuxon } from "@mui/x-date-pickers/AdapterLuxon";
import { LocalizationProvider, DatePicker } from "@mui/x-date-pickers";
import { DateTime } from "luxon";
import { toast } from 'react-toastify';

// --- Utility Function ---
const formatCurrency = (amount, currency = 'KES') => {
    const num = parseFloat(amount) || 0;
    return num.toLocaleString('en-KE', { style: 'currency', currency: currency });
};
// --- End Utility Function ---

// --- Helper for Summary Sections with Print ---
const SummarySection = ({ title, children, printData, printTitle, sx = {} }) => {
    const theme = useTheme();
    const colors = tokens(theme.palette.mode);

    const handlePrint = () => {
        if (!printData) {
            toast.warn("No data available to print.");
            return;
        }
        const printHtml = printData(); // Call the function to get HTML
        if (!printHtml) {
             toast.warn("No data available to print.");
            return;
        }
        
        const printWindow = window.open('', '_blank', 'height=800,width=1000');
        if (printWindow) {
            printWindow.document.write(printHtml);
            printWindow.document.close();
            printWindow.focus();
            setTimeout(() => { printWindow.print(); }, 500);
        } else {
            toast.error("Could not open print window. Please disable popup blockers.");
        }
    };

    return (
        <Paper elevation={2} sx={{ p: 2, mb: 3, backgroundColor: colors.primary[400], ...sx }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h5" sx={{ color: colors.greenAccent[400] }}>{title}</Typography>
                {printData && (
                    <Tooltip title={`Print ${printTitle || title}`}>
                        <IconButton onClick={handlePrint} size="small" sx={{ color: colors.blueAccent[400] }} className="no-print"> <PrintIcon /> </IconButton>
                    </Tooltip>
                )}
            </Box>
            <Divider sx={{ mb: 2, borderColor: colors.grey[700] }} />
            {children}
        </Paper>
    );
};
// --- End Helper ---

// --- Helper for Detailed Summary Tables ---
const DetailSummaryTable = ({ title, data, totalLabel, totalValue, columns, sx = {} }) => {
    const theme = useTheme();
    const colors = tokens(theme.palette.mode);
    const detailsArray = Array.isArray(data) ? data : [];

    return (
        <Box sx={sx}>
             <Typography variant="h4" sx={{ color: colors.grey[100], mb: 1, fontWeight: 'bold' }}>
                Total {totalLabel}: {formatCurrency(totalValue)}
             </Typography>
            <TableContainer sx={{ maxHeight: 350 }}>
                <Table stickyHeader size="small">
                    <TableHead>
                        <TableRow sx={{ '& .MuiTableCell-head': { backgroundColor: colors.blueAccent[700], color: colors.grey[100], fontWeight: 'bold', whiteSpace: 'nowrap' } }}>
                            {columns.map((col) => (
                                <TableCell key={col.field} align={col.align || 'left'} sx={{minWidth: col.minWidth || 'auto'}}>{col.headerName}</TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {detailsArray.length === 0 ? (
                             <TableRow><TableCell colSpan={columns.length} align="center" sx={{ fontStyle: 'italic', color: colors.grey[500], py: 3 }}> No data available. </TableCell></TableRow>
                        ) : (
                            detailsArray.map((row, index) => (
                                <TableRow key={row.employee_name || index} hover sx={{ '& .MuiTableCell-body': { color: colors.grey[200], fontSize: '0.8rem', whiteSpace: 'nowrap' } }}>
                                    {columns.map((col, colIndex) => (
                                        <TableCell key={`${col.field}-${index}-${colIndex}`} align={col.align || 'left'} sx={col.bold ? { fontWeight: 'bold', color: colors.greenAccent[300] } : {}}>
                                            {col.formatter ? col.formatter(row[col.field]) : (row[col.field] ?? 'N/A')}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                    {/* Footer Row */}
                    {detailsArray.length > 0 && (
                        <TableFooter>
                            <TableRow sx={{ '& .MuiTableCell-root': { fontWeight: 'bold', backgroundColor: colors.blueAccent[900], color: colors.grey[100], borderTop: `2px solid ${colors.blueAccent[500]}` } }}>
                                <TableCell colSpan={columns.length - 1} component="th" scope="row">TOTAL</TableCell>
                                <TableCell align="right">{formatCurrency(totalValue)}</TableCell>
                            </TableRow>
                        </TableFooter>
                    )}
                </Table>
            </TableContainer>
        </Box>
    );
};
// --- End Helper ---

const PayrollSummaries = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const [selectedMonth, setSelectedMonth] = useState(DateTime.now().minus({ months: 1 }));
  const [summaryData, setSummaryData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedBankTab, setSelectedBankTab] = useState(0);
  // const [expandedLoan, setExpandedLoan] = useState(false); // No longer needed
  // const [expandedAdvance, setExpandedAdvance] = useState(false); // No longer needed

  // Memoize bank tabs
   const bankTabs = useMemo(() => {
       return Array.isArray(summaryData?.bank_summary) ? summaryData.bank_summary.map(bank => bank.bank_name || 'Unspecified') : [];
   }, [summaryData?.bank_summary]);

    // Update selected tab if bank summary changes
    useEffect(() => {
        if (selectedBankTab >= bankTabs.length) {
            setSelectedBankTab(0);
        }
    }, [bankTabs, selectedBankTab]);


  const fetchSummary = async (date) => {
    if (!date) return;
    setLoading(true);
    setSummaryData(null);
    try {
      const year = date.year;
      const month = date.month;
      const res = await apiClient.get(`/payroll/reports/summary`, { params: { year, month } });
      setSummaryData(res.data);
    } catch (err) {
      console.error("Error fetching payroll summary:", err);
      toast.error(err.response?.data?.message || `Failed to fetch summary for ${date.toFormat("LLL yyyy")}.`);
      setSummaryData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary(selectedMonth);
  }, [selectedMonth]);

  const handleMonthChange = (newValue) => {
    setSelectedMonth(newValue);
  };

  // --- Print Data Generation Functions ---
  const generateBankPrintData = () => {
      if (!summaryData?.bank_summary) return null;
      let html = `<html><head><title>Bank Payroll Summary - ${summaryData.report_period}</title><style>body{font-family:sans-serif;font-size:9pt;} table{width:100%; border-collapse:collapse;} th,td{border:1px solid #ccc; padding:5px;} th{background:#f0f0f0;} .right{text-align:right;} .bold{font-weight:bold;} h2,h3{text-align:center;} @media print { .no-print{display:none;} tbody tr:nth-child(even){background:#f9f9f9 !important; -webkit-print-color-adjust: exact;} th{background:#f0f0f0 !important; -webkit-print-color-adjust: exact;}}</style></head><body><h2>Bank Payroll Summary - ${summaryData.report_period}</h2>`;
      let grandTotal = 0;
      summaryData.bank_summary.forEach(bank => {
          html += `<h3>${bank.bank_name} (${bank.employee_count} Employees) - Total: ${formatCurrency(bank.total_net_pay)}</h3>`;
          html += '<table><thead><tr><th>Employee</th><th>Branch</th><th>Account Number</th><th class="right">Net Pay</th></tr></thead><tbody>';
          (bank.details || []).forEach(emp => {
              html += `<tr><td>${emp.employee_name}</td><td>${emp.bank_branch || 'N/A'}</td><td>${emp.account_number}</td><td class="right">${formatCurrency(emp.net_pay)}</td></tr>`;
          });
          html += `</tbody><tfoot><tr><td colspan="3" class="bold">Bank Total</td><td class="right bold">${formatCurrency(bank.total_net_pay)}</td></tr></tfoot></table><br/>`;
          grandTotal += bank.total_net_pay;
      });
       html += `<hr/><p style="text-align: right; font-size: 1.2em; font-weight: bold;">Grand Total Net Pay: ${formatCurrency(grandTotal)}</p>`;
       html += `</body></html>`;
       return html;
  };

  const generateStatutoryPrintData = (title, dataKey, idField, idHeader) => {
        if (!summaryData || !summaryData[dataKey]?.details) return null;
        const details = summaryData[dataKey].details;
        const total = summaryData[dataKey][`total_${dataKey.split('_')[0]}`]; // e.g., total_paye

        let html = `<html><head><title>${title} Summary - ${summaryData.report_period}</title><style>body{font-family:sans-serif;font-size:9pt;} table{width:100%; border-collapse:collapse;} th,td{border:1px solid #ccc; padding:5px;} th{background:#f0f0f0;} .right{text-align:right;} .bold{font-weight:bold;} h2{text-align:center;} @media print { tbody tr:nth-child(even){background:#f9f9f9 !important; -webkit-print-color-adjust: exact;} th{background:#f0f0f0 !important; -webkit-print-color-adjust: exact;}}</style></head><body><h2>${title} Summary - ${summaryData.report_period}</h2>`;
        html += `<table><thead><tr><th>Employee</th><th>${idHeader}</th><th class="right">Amount</th></tr></thead><tbody>`;
        if (details.length === 0) {
             html += `<tr><td colspan="3" style="text-align:center; font-style: italic;">No data available.</td></tr>`;
        } else {
             details.forEach(emp => {
                 html += `<tr><td>${emp.employee_name}</td><td>${emp[idField] || 'N/A'}</td><td class="right">${formatCurrency(emp.amount)}</td></tr>`;
             });
        }
        html += `</tbody><tfoot><tr><td colspan="2" class="bold">Total</td><td class="right bold">${formatCurrency(total)}</td></tr></tfoot></table>`;
        html += `</body></html>`;
        return html;
   };

   const generateLoanAdvancePrintData = (title, data) => {
        if (!data || !data.details || data.details.length === 0) return null;
         let html = `<html><head><title>${title} Repayment Summary - ${summaryData.report_period}</title><style>body{font-family:sans-serif;font-size:9pt;} table{width:100%; border-collapse:collapse;} th,td{border:1px solid #ccc; padding:5px;} th{background:#f0f0f0;} .right{text-align:right;} .bold{font-weight:bold;} h2{text-align:center;} @media print { tbody tr:nth-child(even){background:#f9f9f9 !important; -webkit-print-color-adjust: exact;} th{background:#f0f0f0 !important; -webkit-print-color-adjust: exact;}}</style></head><body><h2>${title} Repayment Summary - ${summaryData.report_period}</h2>`;
         html += `<p>Total Repaid: <strong>${formatCurrency(data.total_repayment)}</strong> (${data.count} employees)</p>`;
         html += '<table><thead><tr><th>Employee</th><th class="right">Amount Repaid</th></tr></thead><tbody>';
          (data.details || []).forEach(emp => {
              html += `<tr><td>${emp.employee_name}</td><td class="right">${formatCurrency(emp.amount)}</td></tr>`;
          });
          html += `</tbody><tfoot><tr><td class="bold">Total</td><td class="right bold">${formatCurrency(data.total_repayment)}</td></tr></tfoot></table>`;
          html += `</body></html>`;
          return html;
   };
  // --- End Print Data ---


  return (
    <Box m={{ xs: "10px", md: "20px" }}>
      <Header title="Payroll Summaries" subtitle="View monthly payroll breakdowns" />

      {/* --- Month Selector --- */}
      <Paper sx={{ p: 2, mb: 3, backgroundColor: colors.primary[400], borderRadius: '8px' }}>
          <LocalizationProvider dateAdapter={AdapterLuxon}>
            <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
              <DatePicker
                label="Select Month" value={selectedMonth} onChange={handleMonthChange} views={['year', 'month']} openTo="month"
                InputProps={{ readOnly: true }} disabled={loading}
                slotProps={{ textField: { size: "small", sx: { width: 200, '& .MuiInputBase-root': { height: 40, color: colors.grey[100] }, '& .MuiOutlinedInput-notchedOutline': { borderColor: colors.grey[600] }, '& .MuiSvgIcon-root': { color: colors.grey[300] } } } }}
              />
               <Typography sx={{ color: colors.grey[300] }}>
                    Viewing: <Typography component="span" fontWeight="bold">{summaryData?.report_period || (loading ? 'Loading...' : 'Select month')}</Typography>
               </Typography>
              <Tooltip title="Refresh Summary">
                 <span><IconButton onClick={() => fetchSummary(selectedMonth)} disabled={loading || !selectedMonth} sx={{ ml: 'auto', color: colors.grey[300] }}> <RefreshIcon /> </IconButton></span>
              </Tooltip>
            </Box>
          </LocalizationProvider>
      </Paper>

       {/* --- Summary Display --- */}
      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" height="50vh"><CircularProgress size={50}/></Box>
      ) : !summaryData ? (
        <Paper sx={{ p: 3, backgroundColor: colors.primary[200], textAlign: 'center', borderRadius: '8px' }}>
            <Typography sx={{color: colors.grey[300]}}>No summary data found for {selectedMonth.toFormat("LLL yyyy")}. Please close the month's payroll to view summaries.</Typography>
        </Paper>
      ) : (
        <Grid container spacing={3}>

            {/* --- Bank Summary (Using Tabs) --- */}
            <Grid item xs={12}>
                <SummarySection title="Bank Payment Summary" printData={generateBankPrintData} printTitle="Bank Summary" sx={{ p: 0 /* Remove outer padding */ }}>
                    <Box sx={{ borderBottom: 1, borderColor: 'divider', backgroundColor: colors.primary[400] }}>
                        <Tabs
                            value={selectedBankTab}
                            onChange={(event, newValue) => setSelectedBankTab(newValue)}
                            variant="scrollable"
                            scrollButtons="auto"
                            aria-label="Bank summary tabs"
                             sx={{
                                '& .MuiTabs-indicator': { backgroundColor: colors.greenAccent[400] },
                                '& .MuiTab-root': { color: colors.grey[300], textTransform: 'none', fontWeight: 600 },
                                '& .Mui-selected': { color: colors.greenAccent[400] + ' !important', fontWeight: 'bold' },
                             }}
                        >
                            {bankTabs.map((bankName, index) => (
                                <Tab label={`${bankName} (${summaryData.bank_summary[index]?.employee_count || 0})`} key={bankName || index} />
                            ))}
                        </Tabs>
                    </Box>
                    {/* Content for selected tab */}
                     {summaryData.bank_summary?.map((bank, index) => (
                        <Box
                          key={bank.bank_name || index}
                          role="tabpanel"
                          hidden={selectedBankTab !== index}
                          sx={{ p: 2 }} // Add padding to tab content
                        >
                          {selectedBankTab === index && (
                             <DetailSummaryTable
                                title={`${bank.bank_name} Payments`}
                                data={bank.details}
                                totalLabel="Bank Total"
                                totalValue={bank.total_net_pay}
                                columns={[
                                    { field: 'employee_name', headerName: 'Employee', minWidth: 150 },
                                    { field: 'bank_branch', headerName: 'Branch', minWidth: 120 },
                                    { field: 'account_number', headerName: 'Account No.', minWidth: 120 },
                                    { field: 'net_pay', headerName: 'Net Pay', align: 'right', formatter: formatCurrency, bold: true, minWidth: 100 },
                                ]}
                             />
                          )}
                        </Box>
                      ))}
                      {/* Grand Total Display */}
                      <Box sx={{ p: 2, borderTop: `1px solid ${colors.grey[400]}`, backgroundColor: colors.blueAccent[500], textAlign: 'right' }}>
                         <Typography variant="h6" sx={{ color: colors.grey[100] }}>
                             Grand Total Net Pay: {formatCurrency(summaryData.bank_summary?.reduce((sum, bank) => sum + (bank.total_net_pay || 0), 0))}
                         </Typography>
                      </Box>
                </SummarySection>
            </Grid>

            {/* --- Statutory Summaries (Now Detailed) --- */}
            <Grid item xs={12} md={6} lg={4}>
                 <SummarySection title="KRA (PAYE)" printData={() => generateStatutoryPrintData("KRA (PAYE)", "kra_summary", "kra_pin", "KRA PIN")} printTitle="KRA Summary">
                     <DetailSummaryTable
                        data={summaryData.kra_summary?.details}
                        totalLabel="PAYE"
                        totalValue={summaryData.kra_summary?.total_paye}
                        columns={[
                            { field: 'employee_name', headerName: 'Employee', minWidth: 150 },
                            { field: 'kra_pin', headerName: 'KRA PIN', minWidth: 100 },
                            { field: 'amount', headerName: 'Amount', align: 'right', formatter: formatCurrency, bold: true, minWidth: 100 },
                        ]}
                     />
                 </SummarySection>
            </Grid>
            <Grid item xs={12} md={6} lg={4}>
                 <SummarySection title="NSSF" printData={() => generateStatutoryPrintData("NSSF", "nssf_summary", "nssf_no", "NSSF No.")} printTitle="NSSF Summary">
                     <DetailSummaryTable
                        data={summaryData.nssf_summary?.details}
                        totalLabel="NSSF"
                        totalValue={summaryData.nssf_summary?.total_nssf}
                        columns={[
                            { field: 'employee_name', headerName: 'Employee', minWidth: 150 },
                            { field: 'nssf_no', headerName: 'NSSF No.', minWidth: 100 },
                            { field: 'amount', headerName: 'Amount', align: 'right', formatter: formatCurrency, bold: true, minWidth: 100 },
                        ]}
                     />
                 </SummarySection>
            </Grid>
            <Grid item xs={12} md={6} lg={4}>
                 <SummarySection title="NHIF" printData={() => generateStatutoryPrintData("NHIF", "nhif_summary", "nhif_no", "NHIF No.")} printTitle="NHIF Summary">
                      <DetailSummaryTable
                        data={summaryData.nhif_summary?.details}
                        totalLabel="NHIF"
                        totalValue={summaryData.nhif_summary?.total_nhif}
                        columns={[
                            { field: 'employee_name', headerName: 'Employee', minWidth: 150 },
                            { field: 'nhif_no', headerName: 'NHIF No.', minWidth: 100 },
                            { field: 'amount', headerName: 'Amount', align: 'right', formatter: formatCurrency, bold: true, minWidth: 100 },
                        ]}
                     />
                 </SummarySection>
            </Grid>

             {/* --- Loan & Advance Summaries (Using Detail Table Helper) --- */}
             <Grid item xs={12} md={6}>
                 <SummarySection title="Loan Repayments" printData={() => generateLoanAdvancePrintData("Loan", summaryData.loan_summary)} printTitle="Loan Summary">
                     <DetailSummaryTable
                        data={summaryData.loan_summary?.details}
                        totalLabel="Loan Repayments"
                        totalValue={summaryData.loan_summary?.total_repayment}
                        columns={[
                            { field: 'employee_name', headerName: `Employee (${summaryData.loan_summary?.count || 0})`, minWidth: 150 },
                            { field: 'amount', headerName: 'Amount Repaid', align: 'right', formatter: formatCurrency, bold: true, minWidth: 100 },
                        ]}
                     />
                 </SummarySection>
             </Grid>
             <Grid item xs={12} md={6}>
                 <SummarySection title="Advance Repayments" printData={() => generateLoanAdvancePrintData("Advance", summaryData.advance_summary)} printTitle="Advance Summary">
                     <DetailSummaryTable
                        data={summaryData.advance_summary?.details}
                        totalLabel="Advance Repayments"
                        totalValue={summaryData.advance_summary?.total_repayment}
                        columns={[
                            { field: 'employee_name', headerName: `Employee (${summaryData.advance_summary?.count || 0})`, minWidth: 150 },
                            { field: 'amount', headerName: 'Amount Repaid', align: 'right', formatter: formatCurrency, bold: true, minWidth: 100 },
                        ]}
                     />
                 </SummarySection>
             </Grid>

        </Grid>
      )}
    </Box>
  );
};

export default PayrollSummaries;