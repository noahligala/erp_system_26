import React, { useEffect, useState, useMemo } from "react"; // Added useMemo
import {
  Box,
  Button,
  Typography,
  IconButton,
  Tooltip,
  useTheme,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Paper,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableFooter, // Import TableFooter
  TextField,
} from "@mui/material";
import { DataGrid, GridActionsCellItem } from "@mui/x-data-grid";
import {
  Refresh as RefreshIcon,
  Close as CloseIcon,
  Visibility as VisibilityIcon,
  Print as PrintIcon // Import Print Icon
} from "@mui/icons-material";
// Assuming paths relative to src/scenes/accounting/Payroll.jsx
// Please verify these paths based on your project structure
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
    // Using 'en-KE' for Kenyan Shilling formatting
    return num.toLocaleString('en-KE', { style: 'currency', currency: currency });
};
// --- End Utility Function ---


// --- Detail Modal Component ---
const PayrollDetailModal = ({ open, onClose, archiveDetails, loading }) => {
    const theme = useTheme();
    const colors = tokens(theme.palette.mode);

    // Safely access payslips and ensure it's an array before mapping
    const payslipsArray = Array.isArray(archiveDetails?.payslips)
        ? archiveDetails.payslips
        : [];

    // --- Calculate Totals using useMemo for efficiency ---
    const columnTotals = useMemo(() => {
        if (!payslipsArray || payslipsArray.length === 0) {
            // Return zeroed object if no data
            return {
                gross_income: 0, allowances: 0, nssf: 0, nhif: 0, tax_paid: 0,
                loan_repayment: 0, advance_repayment: 0, other_deductions: 0, net_pay: 0
            };
        }

        // Use reduce to sum up values
        return payslipsArray.reduce((totals, slip) => {
            const allowances = (slip.allowances && typeof slip.allowances === 'object') ? slip.allowances : {};
            const deductions = (slip.statutory_deductions && typeof slip.statutory_deductions === 'object') ? slip.statutory_deductions : {};

            const allowancesTotal = Object.values(allowances).reduce((s, a) => s + parseFloat(a || 0), 0);
            const nssf = parseFloat(deductions?.nssf || 0);
            const nhif = parseFloat(deductions?.nhif || 0);
            let otherDeductionsTotal = 0;
            for (const key in deductions) {
                if (key !== 'nssf' && key !== 'nhif') {
                    otherDeductionsTotal += parseFloat(deductions[key] || 0);
                }
            }

            totals.gross_income += parseFloat(slip.gross_income || 0);
            totals.allowances += allowancesTotal;
            totals.nssf += nssf;
            totals.nhif += nhif;
            totals.tax_paid += parseFloat(slip.tax_paid || 0);
            totals.loan_repayment += parseFloat(slip.loan_repayment || 0);
            totals.advance_repayment += parseFloat(slip.advance_repayment || 0);
            totals.other_deductions += otherDeductionsTotal;
            totals.net_pay += parseFloat(slip.net_pay || 0);

            return totals;
        }, {
            // Initial totals object
            gross_income: 0, allowances: 0, nssf: 0, nhif: 0, tax_paid: 0,
            loan_repayment: 0, advance_repayment: 0, other_deductions: 0, net_pay: 0
        });
    }, [payslipsArray]); // Recalculate only when payslipsArray changes
    // --- End Calculate Totals ---


     // --- Print Handler for Modal Content (Updated to include totals row) ---
     const handlePrintReport = () => {
        if (!archiveDetails || payslipsArray.length === 0) {
            toast.warn("No data available to print.");
            return;
        }

        let printHtml = `
        <html><head><title>Payroll Report - ${archiveDetails.report_period}</title>
        <style>
            body { font-family: system-ui, sans-serif; font-size: 9pt; margin: 15px; }
            h1, h2, h3 { text-align: center; color: #1a237e; margin-bottom: 5px; } h1 {font-size: 1.4em;} h3 {font-size: 1.1em;} h2 { margin-bottom: 15px; font-size: 1em; color: #555;}
            table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
            th, td { border: 1px solid #ccc; padding: 4px 6px; text-align: left; vertical-align: top; word-wrap: break-word; } /* Added word-wrap */
            th { background-color: #f0f0f0; font-weight: 600; color: #333;}
            .section-title { font-weight: 600; margin-top: 15px; border-bottom: 2px solid #3f51b5; padding-bottom: 4px; margin-bottom: 8px; font-size: 1.1em; color: #3f51b5; }
            .totals-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; margin-bottom: 15px; padding: 10px; background-color: #f9f9f9; border: 1px solid #eee; border-radius: 4px; }
            .totals-grid div { font-size: 0.9em; }
            .totals-grid strong { display: block; font-size: 1.1em; color: #004d40; }
            .right { text-align: right; }
            .bold { font-weight: bold; }
            thead th { position: sticky; top: 0; z-index: 1; background-color: #f0f0f0; /* Ensure header bg */}
            tbody tr:nth-child(even) { background-color: #fafafa; } /* Zebra striping */
            tfoot td { font-weight: bold; background-color: #e8f5e9; border-top: 2px solid #555; } /* Style for footer */
             @media print {
                 body { font-size: 8pt; margin: 10mm; }
                 th, td { padding: 3px 5px;}
                 .totals-grid { background-color: #f9f9f9 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact;} /* Force background color print */
                 th { background-color: #f0f0f0 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                 tbody tr:nth-child(even) { background-color: #fafafa !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                 tfoot td { background-color: #e8f5e9 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; } /* Force footer background */
                 .no-print { display: none; } /* Class to hide elements in print */
             }
        </style>
        </head><body>
            <h1>Payroll Report</h1>
            <h2>${archiveDetails.report_period}</h2>
            <div class="section-title">Company Totals</div>
            <div class="totals-grid">
                <div>Gross Income: <strong>${formatCurrency(archiveDetails.company_totals?.total_gross_income)}</strong></div>
                <div>Total Deductions: <strong>${formatCurrency(archiveDetails.company_totals?.total_deductions)}</strong></div>
                <div>Net Pay: <strong>${formatCurrency(archiveDetails.company_totals?.total_net_pay)}</strong></div>
                <div>Payslip Count: <strong>${archiveDetails.company_totals?.payslip_count ?? 'N/A'}</strong></div>
            </div>

            <div class="section-title">Individual Payslips</div>
            <table>
                <thead>
                    <tr>
                        <th>Employee</th><th>Bank</th><th>Account No.</th>
                        <th class="right">Gross</th><th class="right">Allowances</th>
                        <th class="right">NSSF</th><th class="right">NHIF</th><th class="right">PAYE</th>
                        <th class="right">Loan Repay</th><th class="right">Adv Repay</th><th class="right">Other Ded.</th>
                        <th class="right bold">Net Pay</th>
                    </tr>
                </thead>
                <tbody>
        `;

        if (payslipsArray.length === 0) {
            printHtml += '<tr><td colspan="12" style="text-align: center; font-style: italic;">No individual payslip data found in this archive.</td></tr>';
        } else {
            payslipsArray.forEach(slip => {
                // Ensure allowances and deductions are objects
                const allowances = (slip.allowances && typeof slip.allowances === 'object') ? slip.allowances : {};
                const deductions = (slip.statutory_deductions && typeof slip.statutory_deductions === 'object') ? slip.statutory_deductions : {};

                const allowancesTotal = Object.values(allowances).reduce((s, a) => s + parseFloat(a || 0), 0);
                const nssf = deductions?.nssf || 0;
                const nhif = deductions?.nhif || 0;
                let otherDeductionsTotal = 0;
                for(const key in deductions){
                    if(key !== 'nssf' && key !== 'nhif'){
                        otherDeductionsTotal += parseFloat(deductions[key] || 0);
                    }
                }

                printHtml += `
                    <tr>
                        <td>${slip.employee_name || 'N/A'}</td>
                        <td>${slip.bank_details?.bank_name || 'N/A'}</td>
                        <td>${slip.bank_details?.bank_account_number || 'N/A'}</td>
                        <td class="right">${formatCurrency(slip.gross_income)}</td>
                        <td class="right">${formatCurrency(allowancesTotal)}</td>
                        <td class="right">${formatCurrency(nssf)}</td>
                        <td class="right">${formatCurrency(nhif)}</td>
                        <td class="right">${formatCurrency(slip.tax_paid)}</td>
                        <td class="right">${formatCurrency(slip.loan_repayment)}</td>
                        <td class="right">${formatCurrency(slip.advance_repayment)}</td>
                        <td class="right">${formatCurrency(otherDeductionsTotal)}</td>
                        <td class="right bold">${formatCurrency(slip.net_pay)}</td>
                    </tr>
                `;
            });
        }

        // --- Add Footer Row to Print HTML ---
        printHtml += `
                </tbody>
                <tfoot>
                    <tr>
                        <td colspan="3"><strong>TOTALS</strong></td>
                        <td class="right">${formatCurrency(columnTotals.gross_income)}</td>
                        <td class="right">${formatCurrency(columnTotals.allowances)}</td>
                        <td class="right">${formatCurrency(columnTotals.nssf)}</td>
                        <td class="right">${formatCurrency(columnTotals.nhif)}</td>
                        <td class="right">${formatCurrency(columnTotals.tax_paid)}</td>
                        <td class="right">${formatCurrency(columnTotals.loan_repayment)}</td>
                        <td class="right">${formatCurrency(columnTotals.advance_repayment)}</td>
                        <td class="right">${formatCurrency(columnTotals.other_deductions)}</td>
                        <td class="right bold">${formatCurrency(columnTotals.net_pay)}</td>
                    </tr>
                </tfoot>
            </table>
            </body></html>`;
        // --- End Add Footer Row ---

        const printWindow = window.open('', '_blank', 'height=700,width=1000');
        if (printWindow) {
            printWindow.document.write(printHtml);
            printWindow.document.close();
            printWindow.focus();
            setTimeout(() => { printWindow.print(); }, 500); // Delay for rendering
        } else {
            toast.error("Could not open print window. Disable popup blockers.");
        }
     };
     // --- END Print Handler ---


    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="xl">
            <DialogTitle sx={{ backgroundColor: colors.blueAccent[700], color: colors.grey[100], fontWeight: 'bold' }}>
                Payroll Details - {archiveDetails?.report_period || 'Loading...'}
                 <Tooltip title="Print This Report">
                    <IconButton onClick={handlePrintReport} disabled={loading || !archiveDetails || payslipsArray.length === 0} sx={{ position: 'absolute', right: 8, top: 8, color: colors.grey[100] }} className="no-print"> <PrintIcon /> </IconButton>
                 </Tooltip>
            </DialogTitle>
            <DialogContent sx={{ backgroundColor: colors.primary[400], color: colors.grey[100] }}>
                {loading ? ( <Box display="flex" justifyContent="center" alignItems="center" sx={{ height: 300 }}><CircularProgress color="secondary" /></Box> )
                 : !archiveDetails ? ( <Typography sx={{mt: 2}}>Could not load archive details.</Typography> )
                 : (
                    <Box sx={{ mt: 2 }}>
                        {/* Company Totals */}
                        <Paper elevation={1} sx={{ p: 2, mb: 3, backgroundColor: colors.primary[900] }}>
                            <Typography variant="h5" sx={{ mb: 2, color: colors.greenAccent[400] }}>Company Totals</Typography>
                            <Grid container spacing={2}>
                                <Grid item xs={6} sm={3}><Typography color={colors.grey[300]}>Gross Income:</Typography><Typography fontWeight="bold">{formatCurrency(archiveDetails.company_totals?.total_gross_income)}</Typography></Grid>
                                <Grid item xs={6} sm={3}><Typography color={colors.grey[300]}>Total Deductions:</Typography><Typography fontWeight="bold">{formatCurrency(archiveDetails.company_totals?.total_deductions)}</Typography></Grid>
                                <Grid item xs={6} sm={3}><Typography color={colors.grey[300]}>Net Pay:</Typography><Typography fontWeight="bold">{formatCurrency(archiveDetails.company_totals?.total_net_pay)}</Typography></Grid>
                                <Grid item xs={6} sm={3}><Typography color={colors.grey[300]}>Payslip Count:</Typography><Typography fontWeight="bold">{archiveDetails.company_totals?.payslip_count ?? 'N/A'}</Typography></Grid>
                            </Grid>
                        </Paper>

                        {/* Individual Payslips Table */}
                        <Typography variant="h5" sx={{ mb: 1, color: colors.greenAccent[400] }}>Individual Payslips</Typography>
                        <TableContainer component={Paper} sx={{ maxHeight: 500, backgroundColor: colors.primary[900] }}>
                            <Table stickyHeader size="small">
                                <TableHead>
                                    <TableRow sx={{ '& .MuiTableCell-head': { backgroundColor: colors.blueAccent[800], color: colors.grey[100], fontWeight: 'bold', whiteSpace: 'nowrap' } }}>
                                         <TableCell>Employee</TableCell><TableCell>Bank</TableCell><TableCell>Account No.</TableCell>
                                         <TableCell align="right">Gross</TableCell><TableCell align="right">Allowances</TableCell>
                                         <TableCell align="right">NSSF</TableCell><TableCell align="right">NHIF</TableCell>
                                         <TableCell align="right">PAYE</TableCell><TableCell align="right">Loan</TableCell>
                                         <TableCell align="right">Advance</TableCell><TableCell align="right">Other Ded.</TableCell>
                                         <TableCell align="right">Net Pay</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {payslipsArray.length === 0 ? (
                                        <TableRow><TableCell colSpan={12} align="center" sx={{ fontStyle: 'italic', color: colors.grey[500], py: 3 }}> No individual payslip data found. </TableCell></TableRow>
                                    ) : (
                                        payslipsArray.map((slip) => {
                                            const allowances = (slip.allowances && typeof slip.allowances === 'object') ? slip.allowances : {};
                                            const deductions = (slip.statutory_deductions && typeof slip.statutory_deductions === 'object') ? slip.statutory_deductions : {};
                                            const allowancesTotal = Object.values(allowances).reduce((s, a) => s + parseFloat(a || 0), 0);
                                            const nssf = deductions?.nssf || 0; const nhif = deductions?.nhif || 0; let otherDeductionsTotal = 0;
                                            for(const key in deductions){ if(key !== 'nssf' && key !== 'nhif'){ otherDeductionsTotal += parseFloat(deductions[key] || 0); } }

                                            return ( <TableRow key={slip.employee_id || slip.id} hover sx={{ '& .MuiTableCell-body': { color: colors.grey[200], whiteSpace: 'nowrap', fontSize: '0.8rem' } }}>
                                                     <TableCell component="th" scope="row">{slip.employee_name}</TableCell><TableCell>{slip.bank_details?.bank_name || 'N/A'}</TableCell><TableCell>{slip.bank_details?.bank_account_number || 'N/A'}</TableCell>
                                                     <TableCell align="right">{formatCurrency(slip.gross_income)}</TableCell><TableCell align="right">{formatCurrency(allowancesTotal)}</TableCell>
                                                     <TableCell align="right">{formatCurrency(nssf)}</TableCell><TableCell align="right">{formatCurrency(nhif)}</TableCell>
                                                     <TableCell align="right">{formatCurrency(slip.tax_paid)}</TableCell><TableCell align="right">{formatCurrency(slip.loan_repayment)}</TableCell>
                                                     <TableCell align="right">{formatCurrency(slip.advance_repayment)}</TableCell><TableCell align="right">{formatCurrency(otherDeductionsTotal)}</TableCell>
                                                     <TableCell align="right" sx={{ fontWeight: 'bold', color: colors.greenAccent[300] }}>{formatCurrency(slip.net_pay)}</TableCell>
                                                 </TableRow> );
                                        })
                                     )}
                                </TableBody>
                                {/* --- NEW: Table Footer --- */}
                                {payslipsArray.length > 0 && (
                                    <TableFooter>
                                        <TableRow sx={{ '& .MuiTableCell-root': { fontWeight: 'bold', backgroundColor: colors.blueAccent[900], color: colors.grey[100], borderTop: `2px solid ${colors.blueAccent[500]}`, fontSize: '0.85rem', whiteSpace: 'nowrap' } }}>
                                            <TableCell colSpan={3} component="th" scope="row">TOTALS</TableCell>
                                            <TableCell align="right">{formatCurrency(columnTotals.gross_income)}</TableCell>
                                            <TableCell align="right">{formatCurrency(columnTotals.allowances)}</TableCell>
                                            <TableCell align="right">{formatCurrency(columnTotals.nssf)}</TableCell>
                                            <TableCell align="right">{formatCurrency(columnTotals.nhif)}</TableCell>
                                            <TableCell align="right">{formatCurrency(columnTotals.tax_paid)}</TableCell>
                                            <TableCell align="right">{formatCurrency(columnTotals.loan_repayment)}</TableCell>
                                            <TableCell align="right">{formatCurrency(columnTotals.advance_repayment)}</TableCell>
                                            <TableCell align="right">{formatCurrency(columnTotals.other_deductions)}</TableCell>
                                            <TableCell align="right" sx={{ color: colors.greenAccent[200] }}>{formatCurrency(columnTotals.net_pay)}</TableCell>
                                        </TableRow>
                                    </TableFooter>
                                )}
                                {/* --- END: Table Footer --- */}
                            </Table>
                        </TableContainer>
                    </Box>
                )}
            </DialogContent>
            <DialogActions sx={{ backgroundColor: colors.primary[400], borderTop: `1px solid ${colors.grey[700]}`, px: 3, py: 2 }}>
                <Button onClick={onClose} color="secondary">Close</Button>
            </DialogActions>
        </Dialog>
    );
};
// --- End Detail Modal Component ---


const Payroll = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const [archives, setArchives] = useState([]);
  const [monthEnd, setMonthEnd] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedArchiveId, setSelectedArchiveId] = useState(null);
  const [archiveDetails, setArchiveDetails] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Fetch summary archives
  const fetchArchives = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("/payroll/reports");
      setArchives(res.data || []);
    } catch (err) {
      console.error("Error fetching payroll archives:", err);
      toast.error(err.response?.data?.message || "Failed to fetch payroll archives.");
      setArchives([]);
     } finally { setLoading(false); }
  };

  // Fetch detailed data for one archive
  const fetchArchiveDetail = async (id) => {
       if (!id) return;
       setDetailLoading(true);
       setArchiveDetails(null);
       try {
           const res = await apiClient.get(`/payroll/reports/${id}`);
           setArchiveDetails(res.data);
       } catch (err) {
           console.error(`Error fetching payroll archive ${id}:`, err);
           toast.error(err.response?.data?.message || "Failed to load archive details.");
       } finally {
           setDetailLoading(false);
       }
   };

  useEffect(() => {
    fetchArchives();
  }, []);

  // Handle opening the detail modal
  const handleViewDetails = (id) => {
    setSelectedArchiveId(id);
    fetchArchiveDetail(id);
    setDetailModalOpen(true);
  };

  const handleCloseDetailModal = () => {
    setDetailModalOpen(false);
    setSelectedArchiveId(null);
    setArchiveDetails(null);
  };

  // Handle closing the month
  const handleCloseMonth = async () => {
     if (!monthEnd) return toast.warn("Please select a month-end date to close.");
     if (!window.confirm(`Are you sure you want to close the payroll period ending ${monthEnd.toFormat("LLL yyyy")}? This cannot be undone.`)) return;

     setIsClosing(true);
     try {
       const res = await apiClient.post("/payroll/close-month", { month_end_date: monthEnd.toISODate() });
       toast.success(res.data.message || "Month closed successfully!");
       fetchArchives(); // Refresh the list
       setMonthEnd(null); // Reset the date picker
     } catch (err) {
       console.error("Error closing payroll month:", err);
       toast.error(err.response?.data?.message || "Failed to close payroll month.");
     } finally {
       setIsClosing(false);
     }
   };

  // --- Define DataGrid columns ---
  const columns = [
    { field: "report_period_end", headerName: "Period End", width: 150,
      renderCell: (params) => params.value ? DateTime.fromISO(params.value).toFormat("LLL yyyy") : "",
      valueGetter: (params) => (params?.row?.report_period_end) ? DateTime.fromISO(params.row.report_period_end).toISODate() : null,
      type: 'date', sort: 'desc' // Add default sort
    },
    { field: "summary_details.payslip_count", headerName: "Payslips", width: 100, align: 'center', headerAlign: 'center',
      valueGetter: (params) => params?.row?.summary_details?.payslip_count ?? 0
    },
    { field: "summary_details.total_gross_income", headerName: "Total Gross", width: 150, align: 'right', headerAlign: 'right', type: 'number',
      renderCell: (params) => formatCurrency(params.value),
      valueGetter: (params) => params?.row?.summary_details?.total_gross_income ?? 0
    },
    { field: "summary_details.total_deductions", headerName: "Total Deductions", width: 150, align: 'right', headerAlign: 'right', type: 'number',
      renderCell: (params) => formatCurrency(params.value),
      valueGetter: (params) => params?.row?.summary_details?.total_deductions ?? 0
    },
    { field: "summary_details.total_net_pay", headerName: "Total Net Pay", width: 150, align: 'right', headerAlign: 'right', type: 'number',
      renderCell: (params) => formatCurrency(params.value),
      valueGetter: (params) => params?.row?.summary_details?.total_net_pay ?? 0
    },
    { field: "actions", headerName: "Actions", width: 100, align: 'center', headerAlign: 'center', sortable: false, disableColumnMenu: true, type: 'actions',
      getActions: (params) => [
          <GridActionsCellItem
              icon={<VisibilityIcon sx={{ color: colors.grey[300], '&:hover': { color: colors.greenAccent[400]} }} />}
              label="View Details"
              onClick={() => handleViewDetails(params.id)} // Use params.id which DataGrid provides
              key={`view-${params.id}`}
          />,
      ],
    },
  ];
  // --- End Define DataGrid columns ---

  return (
    <Box m={{ xs: "10px", md: "20px" }}>
      <Header title="Payroll Dashboard" subtitle="Close monthly payroll periods and view archives" />

      {/* --- Controls Section --- */}
      <Paper sx={{ p: 2, mb: 3, backgroundColor: colors.primary[400], borderRadius: '8px' }}>
          <LocalizationProvider dateAdapter={AdapterLuxon}>
            <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
              <DatePicker
                label="Month End to Close"
                value={monthEnd}
                onChange={(newValue) => setMonthEnd(newValue)}
                views={['year', 'month']}
                openTo="month"
                InputProps={{ readOnly: true }}
                slotProps={{ textField: { size: "small", sx: { width: 200, '& .MuiInputBase-root': { height: 40, color: colors.grey[100] }, '& .MuiOutlinedInput-notchedOutline': { borderColor: colors.grey[600] }, '& .MuiSvgIcon-root': { color: colors.grey[300] } } } }}
              />
              <Tooltip title="Finalize and archive payroll for the selected month end.">
                  <span>
                  <Button variant="contained" color="error" startIcon={isClosing ? <CircularProgress size={20} color="inherit" /> : <CloseIcon />} onClick={handleCloseMonth} disabled={isClosing || loading || !monthEnd}>
                    {isClosing ? "Closing..." : "Close Selected Month"}
                  </Button>
                  </span>
              </Tooltip>
              <Tooltip title="Refresh Archives List">
                 <span>
                    <IconButton onClick={fetchArchives} disabled={loading || isClosing} sx={{ ml: 'auto', color: colors.grey[300] }}>
                        <RefreshIcon />
                    </IconButton>
                 </span>
              </Tooltip>
            </Box>
          </LocalizationProvider>
      </Paper>

       {/* --- Archives DataGrid --- */}
      <Box height="65vh"
           sx={{
            "& .MuiDataGrid-root": { border: "none", borderRadius: '8px', overflow: 'hidden' },
            "& .MuiDataGrid-cell": { borderBottom: `1px solid ${colors.grey[800]}`, color: colors.grey[100] },
            "& .MuiDataGrid-columnHeaders": { backgroundColor: colors.blueAccent[700], borderBottom: "none", color: colors.grey[100], fontWeight: 'bold' },
            "& .MuiDataGrid-virtualScroller": { backgroundColor: colors.primary[400] },
            "& .MuiDataGrid-footerContainer": { borderTop: `1px solid ${colors.grey[700]}`, backgroundColor: colors.blueAccent[700], color: colors.grey[100] },
            "& .MuiCheckbox-root": { color: `${colors.greenAccent[200]} !important` },
            "& .MuiDataGrid-toolbarContainer .MuiButton-text": { color: `${colors.grey[100]} !important` },
            "& .MuiTablePagination-root, & .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows, & .MuiSelect-select": { color: colors.grey[300] },
            "& .MuiSelect-icon": { color: colors.grey[400]},
            "& .MuiIconButton-root": { color: colors.grey[300], '&:hover': { color: colors.greenAccent[400] } },
            "& .MuiDataGrid-actionsCell": { gap: '8px' },
             "& .MuiCircularProgress-root": { color: colors.greenAccent[500] },
             "& .MuiDataGrid-overlay": { backgroundColor: colors.primary[400] + 'CC', color: colors.grey[300] },
             "& .MuiDataGrid-cell:focus, & .MuiDataGrid-cell:focus-within": { outline: 'none !important' },
             "& .MuiDataGrid-columnHeader:focus, & .MuiDataGrid-columnHeader:focus-within": { outline: 'none !important' },
           }}
        >
        <DataGrid
          rows={archives}
          columns={columns}
          getRowId={(row) => row.id}
          loading={loading}
          disableRowSelectionOnClick
          initialState={{
             sorting: {
               sortModel: [{ field: 'report_period_end', sort: 'desc' }],
             },
             pagination: { paginationModel: { pageSize: 10 } }
          }}
          pageSizeOptions={[10, 25, 50]}
        />
      </Box>

      {/* --- Detail Modal --- */}
      <PayrollDetailModal
          open={detailModalOpen}
          onClose={handleCloseDetailModal}
          archiveDetails={archiveDetails}
          loading={detailLoading}
      />

    </Box>
  );
};

export default Payroll;