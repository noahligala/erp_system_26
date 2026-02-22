// src/scenes/accounting/Payroll.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
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
  TableFooter,
  Divider,
  Chip,
  Stack,
  Alert,
  Snackbar,
  TextField,
  InputAdornment,
} from "@mui/material";
import { DataGrid, GridActionsCellItem } from "@mui/x-data-grid";
import {
  Refresh as RefreshIcon,
  Close as CloseIcon,
  Visibility as VisibilityIcon,
  Print as PrintIcon,
  Summarize as SummarizeIcon,
  Search as SearchIcon,
} from "@mui/icons-material";

import Header from "../../components/Header.jsx";
import { apiClient } from "../../api/apiClient.js";
import { tokens } from "../../theme.js";

import { AdapterLuxon } from "@mui/x-date-pickers/AdapterLuxon";
import { LocalizationProvider, DatePicker } from "@mui/x-date-pickers";
import { DateTime } from "luxon";
import { toast } from "react-toastify";

/* ----------------------------- helpers ----------------------------- */

const formatCurrency = (amount, currency = "KES") => {
  const num = Number.parseFloat(amount) || 0;
  return num.toLocaleString("en-KE", { style: "currency", currency });
};

const safeObject = (v) => (v && typeof v === "object" && !Array.isArray(v) ? v : {});

/** Build a month key: 2025-12 */
const monthKeyFromISO = (iso) => {
  if (!iso) return "";
  const dt = DateTime.fromISO(iso);
  if (!dt.isValid) return "";
  return dt.toFormat("yyyy-LL");
};

const monthLabelFromISO = (iso) => {
  if (!iso) return "";
  const dt = DateTime.fromISO(iso);
  return dt.isValid ? dt.toFormat("LLL yyyy") : "";
};

/* ------------------------ modal: archive details ------------------------ */

const PayrollDetailModal = ({ open, onClose, archiveDetails, loading }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  const payslipsArray = Array.isArray(archiveDetails?.payslips) ? archiveDetails.payslips : [];

  const columnTotals = useMemo(() => {
    if (!payslipsArray.length) {
      return {
        gross_income: 0,
        allowances: 0,
        nssf: 0,
        nhif: 0,
        tax_paid: 0,
        loan_repayment: 0,
        advance_repayment: 0,
        other_deductions: 0,
        net_pay: 0,
      };
    }

    return payslipsArray.reduce(
      (totals, slip) => {
        const allowances = safeObject(slip.allowances);
        const deductions = safeObject(slip.statutory_deductions);

        const allowancesTotal = Object.values(allowances).reduce((s, a) => s + (Number.parseFloat(a) || 0), 0);
        const nssf = Number.parseFloat(deductions?.nssf) || 0;
        const nhif = Number.parseFloat(deductions?.nhif) || 0;

        let other = 0;
        for (const k of Object.keys(deductions)) {
          if (k !== "nssf" && k !== "nhif") other += Number.parseFloat(deductions[k]) || 0;
        }

        totals.gross_income += Number.parseFloat(slip.gross_income) || 0;
        totals.allowances += allowancesTotal;
        totals.nssf += nssf;
        totals.nhif += nhif;
        totals.tax_paid += Number.parseFloat(slip.tax_paid) || 0;
        totals.loan_repayment += Number.parseFloat(slip.loan_repayment) || 0;
        totals.advance_repayment += Number.parseFloat(slip.advance_repayment) || 0;
        totals.other_deductions += other;
        totals.net_pay += Number.parseFloat(slip.net_pay) || 0;
        return totals;
      },
      {
        gross_income: 0,
        allowances: 0,
        nssf: 0,
        nhif: 0,
        tax_paid: 0,
        loan_repayment: 0,
        advance_repayment: 0,
        other_deductions: 0,
        net_pay: 0,
      }
    );
  }, [payslipsArray]);

  const handlePrintReport = () => {
    if (!archiveDetails || !payslipsArray.length) {
      toast.warn("No data available to print.");
      return;
    }

    const totals = columnTotals;

    let html = `
      <html>
        <head>
          <title>Payroll Report - ${archiveDetails.report_period || ""}</title>
          <style>
            body { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; font-size: 9pt; margin: 12mm; color: #111; }
            h1,h2 { text-align:center; margin: 0; }
            h1 { font-size: 16pt; }
            h2 { font-size: 11pt; margin-top: 4px; color: #444; }
            .card { border: 1px solid #e5e7eb; border-radius: 10px; padding: 10px; margin: 10px 0 14px; }
            .grid { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 10px; }
            .k { color:#6b7280; font-size: 9pt; }
            .v { font-weight: 700; font-size: 10pt; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #d1d5db; padding: 5px 6px; vertical-align: top; }
            th { background: #f3f4f6; text-align:left; font-weight: 700; }
            .right { text-align:right; }
            tfoot td { background: #ecfeff; font-weight: 800; border-top: 2px solid #111827; }
            tbody tr:nth-child(even) { background: #fafafa; }
            @media print {
              th { background: #f3f4f6 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              tfoot td { background: #ecfeff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              tbody tr:nth-child(even) { background: #fafafa !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          <h1>Payroll Report</h1>
          <h2>${archiveDetails.report_period || ""}</h2>

          <div class="card">
            <div class="grid">
              <div><div class="k">Gross Income</div><div class="v">${formatCurrency(archiveDetails.company_totals?.total_gross_income)}</div></div>
              <div><div class="k">Total Deductions</div><div class="v">${formatCurrency(archiveDetails.company_totals?.total_deductions)}</div></div>
              <div><div class="k">Net Pay</div><div class="v">${formatCurrency(archiveDetails.company_totals?.total_net_pay)}</div></div>
              <div><div class="k">Payslip Count</div><div class="v">${archiveDetails.company_totals?.payslip_count ?? "N/A"}</div></div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Bank</th>
                <th>Account No.</th>
                <th class="right">Gross</th>
                <th class="right">Allowances</th>
                <th class="right">NSSF</th>
                <th class="right">NHIF</th>
                <th class="right">PAYE</th>
                <th class="right">Loan</th>
                <th class="right">Advance</th>
                <th class="right">Other Ded.</th>
                <th class="right">Net Pay</th>
              </tr>
            </thead>
            <tbody>
    `;

    for (const slip of payslipsArray) {
      const allowances = safeObject(slip.allowances);
      const deductions = safeObject(slip.statutory_deductions);

      const allowancesTotal = Object.values(allowances).reduce((s, a) => s + (Number.parseFloat(a) || 0), 0);
      const nssf = Number.parseFloat(deductions?.nssf) || 0;
      const nhif = Number.parseFloat(deductions?.nhif) || 0;

      let other = 0;
      for (const k of Object.keys(deductions)) {
        if (k !== "nssf" && k !== "nhif") other += Number.parseFloat(deductions[k]) || 0;
      }

      html += `
        <tr>
          <td>${slip.employee_name || "N/A"}</td>
          <td>${slip.bank_details?.bank_name || "N/A"}</td>
          <td>${slip.bank_details?.bank_account_number || "N/A"}</td>
          <td class="right">${formatCurrency(slip.gross_income)}</td>
          <td class="right">${formatCurrency(allowancesTotal)}</td>
          <td class="right">${formatCurrency(nssf)}</td>
          <td class="right">${formatCurrency(nhif)}</td>
          <td class="right">${formatCurrency(slip.tax_paid)}</td>
          <td class="right">${formatCurrency(slip.loan_repayment)}</td>
          <td class="right">${formatCurrency(slip.advance_repayment)}</td>
          <td class="right">${formatCurrency(other)}</td>
          <td class="right"><b>${formatCurrency(slip.net_pay)}</b></td>
        </tr>
      `;
    }

    html += `
            </tbody>
            <tfoot>
              <tr>
                <td colspan="3">TOTALS</td>
                <td class="right">${formatCurrency(totals.gross_income)}</td>
                <td class="right">${formatCurrency(totals.allowances)}</td>
                <td class="right">${formatCurrency(totals.nssf)}</td>
                <td class="right">${formatCurrency(totals.nhif)}</td>
                <td class="right">${formatCurrency(totals.tax_paid)}</td>
                <td class="right">${formatCurrency(totals.loan_repayment)}</td>
                <td class="right">${formatCurrency(totals.advance_repayment)}</td>
                <td class="right">${formatCurrency(totals.other_deductions)}</td>
                <td class="right">${formatCurrency(totals.net_pay)}</td>
              </tr>
            </tfoot>
          </table>
        </body>
      </html>
    `;

    const w = window.open("", "_blank", "height=800,width=1100");
    if (!w) {
      toast.error("Could not open print window. Disable popup blockers.");
      return;
    }
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 350);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xl">
      <DialogTitle
        sx={{
          backgroundColor: colors.blueAccent[700],
          color: colors.grey[100],
          fontWeight: 900,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="h6" fontWeight={900}>
            Payroll Details
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.9 }}>
            {archiveDetails?.report_period || "Loading…"}
          </Typography>
        </Box>

        <Stack direction="row" spacing={1} alignItems="center">
          <Tooltip title="Print report">
            <span>
              <IconButton
                onClick={handlePrintReport}
                disabled={loading || !archiveDetails || payslipsArray.length === 0}
                sx={{ color: colors.grey[100] }}
              >
                <PrintIcon />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ backgroundColor: colors.primary[400], color: colors.grey[100] }}>
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" sx={{ height: 320 }}>
            <CircularProgress color="secondary" />
          </Box>
        ) : !archiveDetails ? (
          <Alert severity="error" sx={{ mt: 2 }}>
            Could not load archive details.
          </Alert>
        ) : (
          <Box sx={{ mt: 2 }}>
            {/* Company Totals */}
            <Paper
              elevation={0}
              sx={{
                p: 2,
                mb: 2,
                borderRadius: 3,
                backgroundColor: colors.primary[900],
                border: `1px solid ${colors.grey[800]}`,
              }}
            >
              <Stack direction={{ xs: "column", md: "row" }} spacing={1} alignItems={{ xs: "flex-start", md: "center" }} justifyContent="space-between">
                <Box>
                  <Typography variant="h6" fontWeight={900} sx={{ color: colors.greenAccent[400] }}>
                    Company totals
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.85 }}>
                    Summary for {archiveDetails.report_period}
                  </Typography>
                </Box>

                <Chip
                  label={`${archiveDetails.company_totals?.payslip_count ?? 0} payslips`}
                  sx={{
                    fontWeight: 800,
                    backgroundColor: colors.blueAccent[700],
                    color: colors.grey[100],
                  }}
                />
              </Stack>

              <Divider sx={{ my: 2, borderColor: colors.grey[800] }} />

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="caption" sx={{ color: colors.grey[400] }}>
                    Gross Income
                  </Typography>
                  <Typography fontWeight={900}>{formatCurrency(archiveDetails.company_totals?.total_gross_income)}</Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="caption" sx={{ color: colors.grey[400] }}>
                    Total Deductions
                  </Typography>
                  <Typography fontWeight={900}>{formatCurrency(archiveDetails.company_totals?.total_deductions)}</Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="caption" sx={{ color: colors.grey[400] }}>
                    Net Pay
                  </Typography>
                  <Typography fontWeight={900} sx={{ color: colors.greenAccent[300] }}>
                    {formatCurrency(archiveDetails.company_totals?.total_net_pay)}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="caption" sx={{ color: colors.grey[400] }}>
                    Journal Entry ID
                  </Typography>
                  <Typography fontWeight={900}>{archiveDetails.journal_entry_id ?? "N/A"}</Typography>
                </Grid>
              </Grid>
            </Paper>

            {/* Payslips Table */}
            <Paper
              elevation={0}
              sx={{
                p: 2,
                borderRadius: 3,
                backgroundColor: colors.primary[900],
                border: `1px solid ${colors.grey[800]}`,
              }}
            >
              <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
                <Box>
                  <Typography variant="h6" fontWeight={900} sx={{ color: colors.greenAccent[400] }}>
                    Individual payslips
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.85 }}>
                    Detailed breakdown
                  </Typography>
                </Box>

                <Chip
                  label={`Totals: ${formatCurrency(columnTotals.net_pay)} net`}
                  sx={{
                    fontWeight: 900,
                    backgroundColor: colors.blueAccent[800],
                    color: colors.grey[100],
                  }}
                />
              </Stack>

              <Divider sx={{ my: 2, borderColor: colors.grey[800] }} />

              <TableContainer sx={{ maxHeight: 520, borderRadius: 2, overflow: "auto" }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow
                      sx={{
                        "& .MuiTableCell-head": {
                          backgroundColor: colors.blueAccent[800],
                          color: colors.grey[100],
                          fontWeight: 900,
                          whiteSpace: "nowrap",
                          borderBottom: `1px solid ${colors.grey[800]}`,
                        },
                      }}
                    >
                      <TableCell>Employee</TableCell>
                      <TableCell>Bank</TableCell>
                      <TableCell>Account No.</TableCell>
                      <TableCell align="right">Gross</TableCell>
                      <TableCell align="right">Allowances</TableCell>
                      <TableCell align="right">NSSF</TableCell>
                      <TableCell align="right">NHIF</TableCell>
                      <TableCell align="right">PAYE</TableCell>
                      <TableCell align="right">Loan</TableCell>
                      <TableCell align="right">Advance</TableCell>
                      <TableCell align="right">Other Ded.</TableCell>
                      <TableCell align="right">Net Pay</TableCell>
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {!payslipsArray.length ? (
                      <TableRow>
                        <TableCell colSpan={12} align="center" sx={{ py: 4, color: colors.grey[400], fontStyle: "italic" }}>
                          No payslip rows in this archive.
                        </TableCell>
                      </TableRow>
                    ) : (
                      payslipsArray.map((slip) => {
                        const allowances = safeObject(slip.allowances);
                        const deductions = safeObject(slip.statutory_deductions);

                        const allowancesTotal = Object.values(allowances).reduce(
                          (s, a) => s + (Number.parseFloat(a) || 0),
                          0
                        );
                        const nssf = Number.parseFloat(deductions?.nssf) || 0;
                        const nhif = Number.parseFloat(deductions?.nhif) || 0;

                        let other = 0;
                        for (const k of Object.keys(deductions)) {
                          if (k !== "nssf" && k !== "nhif") other += Number.parseFloat(deductions[k]) || 0;
                        }

                        return (
                          <TableRow
                            key={slip.employee_id || slip.id}
                            hover
                            sx={{
                              "& .MuiTableCell-body": {
                                color: colors.grey[200],
                                whiteSpace: "nowrap",
                                fontSize: "0.82rem",
                                borderBottom: `1px solid ${colors.grey[850] || colors.grey[800]}`,
                              },
                            }}
                          >
                            <TableCell sx={{ fontWeight: 800 }}>{slip.employee_name || "N/A"}</TableCell>
                            <TableCell>{slip.bank_details?.bank_name || "N/A"}</TableCell>
                            <TableCell>{slip.bank_details?.bank_account_number || "N/A"}</TableCell>
                            <TableCell align="right">{formatCurrency(slip.gross_income)}</TableCell>
                            <TableCell align="right">{formatCurrency(allowancesTotal)}</TableCell>
                            <TableCell align="right">{formatCurrency(nssf)}</TableCell>
                            <TableCell align="right">{formatCurrency(nhif)}</TableCell>
                            <TableCell align="right">{formatCurrency(slip.tax_paid)}</TableCell>
                            <TableCell align="right">{formatCurrency(slip.loan_repayment)}</TableCell>
                            <TableCell align="right">{formatCurrency(slip.advance_repayment)}</TableCell>
                            <TableCell align="right">{formatCurrency(other)}</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 900, color: colors.greenAccent[300] }}>
                              {formatCurrency(slip.net_pay)}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>

                  {payslipsArray.length > 0 && (
                    <TableFooter>
                      <TableRow
                        sx={{
                          "& .MuiTableCell-root": {
                            fontWeight: 900,
                            backgroundColor: colors.blueAccent[900],
                            color: colors.grey[100],
                            borderTop: `2px solid ${colors.blueAccent[500]}`,
                            fontSize: "0.85rem",
                            whiteSpace: "nowrap",
                          },
                        }}
                      >
                        <TableCell colSpan={3}>TOTALS</TableCell>
                        <TableCell align="right">{formatCurrency(columnTotals.gross_income)}</TableCell>
                        <TableCell align="right">{formatCurrency(columnTotals.allowances)}</TableCell>
                        <TableCell align="right">{formatCurrency(columnTotals.nssf)}</TableCell>
                        <TableCell align="right">{formatCurrency(columnTotals.nhif)}</TableCell>
                        <TableCell align="right">{formatCurrency(columnTotals.tax_paid)}</TableCell>
                        <TableCell align="right">{formatCurrency(columnTotals.loan_repayment)}</TableCell>
                        <TableCell align="right">{formatCurrency(columnTotals.advance_repayment)}</TableCell>
                        <TableCell align="right">{formatCurrency(columnTotals.other_deductions)}</TableCell>
                        <TableCell align="right" sx={{ color: colors.greenAccent[200] }}>
                          {formatCurrency(columnTotals.net_pay)}
                        </TableCell>
                      </TableRow>
                    </TableFooter>
                  )}
                </Table>
              </TableContainer>
            </Paper>
          </Box>
        )}
      </DialogContent>

      <DialogActions
        sx={{
          backgroundColor: colors.primary[400],
          borderTop: `1px solid ${colors.grey[800]}`,
          px: 2,
          py: 1.5,
        }}
      >
        <Button onClick={onClose} color="secondary" variant="outlined">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

/* ----------------------------- main page ----------------------------- */

const Payroll = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  const [archives, setArchives] = useState([]);
  const [monthEnd, setMonthEnd] = useState(null);

  const [loading, setLoading] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [archiveDetails, setArchiveDetails] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [searchText, setSearchText] = useState("");

  const [snack, setSnack] = useState({ open: false, severity: "info", msg: "" });
  const showSnack = (severity, msg) => setSnack({ open: true, severity, msg });
  const closeSnack = () => setSnack((p) => ({ ...p, open: false }));

  const fetchArchives = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("/payroll/reports");
      setArchives(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Error fetching payroll archives:", err);
      toast.error(err.response?.data?.message || "Failed to fetch payroll archives.");
      setArchives([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchArchiveDetail = useCallback(async (id) => {
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
  }, []);

  useEffect(() => {
    fetchArchives();
  }, [fetchArchives]);

  const handleViewDetails = (id) => {
    fetchArchiveDetail(id);
    setDetailModalOpen(true);
  };

  const handleCloseDetailModal = () => {
    setDetailModalOpen(false);
    setArchiveDetails(null);
  };

  const handleOpenSummary = (row) => {
    // You said: keep summaries as a separate page, and open from each row.
    // We create a robust "best guess" navigation:
    // - prefer query by year/month (if you have a summary page that accepts them)
    // - fallback to archive id.
    const iso = row?.report_period_end;
    const dt = iso ? DateTime.fromISO(iso) : null;

    // Change these routes to match your app:
    // Option A: /payroll/summary?year=2025&month=12
    // Option B: /payroll/summary/:archiveId
    // For now, we open in a new tab with BOTH options supported by your future route handling.
    let url = "payroll/reports/summary";
    if (dt?.isValid) {
      url += `?year=${dt.year}&month=${dt.month}`;
    } else if (row?.id) {
      url += `?archiveId=${row.id}`;
    }

    window.open(url, "noopener,noreferrer");
  };

  const handleCloseMonth = async () => {
    if (!monthEnd) return toast.warn("Please select a month to close.");

    // enforce "month end" date consistently (endOf('month'))
    const monthEndDate = monthEnd.endOf("month");

    const label = monthEndDate.toFormat("LLL yyyy");
    const ok = window.confirm(`Close payroll for ${label}? This will archive the month.`);
    if (!ok) return;

    setIsClosing(true);
    try {
      const res = await apiClient.post("/payroll/close-month", {
        month_end_date: monthEndDate.toISODate(),
      });
      toast.success(res.data?.message || "Month closed successfully!");
      showSnack("success", res.data?.message || "Month closed successfully!");

      await fetchArchives();
      setMonthEnd(null);
    } catch (err) {
      console.error("Error closing payroll month:", err);
      const msg = err.response?.data?.message || "Failed to close payroll month.";
      toast.error(msg);
      showSnack("error", msg);
    } finally {
      setIsClosing(false);
    }
  };

  const filteredArchives = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return archives;

    return archives.filter((r) => {
      const period = monthLabelFromISO(r?.report_period_end).toLowerCase();
      const id = String(r?.id ?? "").toLowerCase();
      const count = String(r?.summary_details?.payslip_count ?? "").toLowerCase();
      return period.includes(q) || id.includes(q) || count.includes(q);
    });
  }, [archives, searchText]);

  const kpi = useMemo(() => {
    const arr = Array.isArray(archives) ? archives : [];
    const totalNet = arr.reduce((s, r) => s + (Number(r?.summary_details?.total_net_pay) || 0), 0);
    const totalGross = arr.reduce((s, r) => s + (Number(r?.summary_details?.total_gross_income) || 0), 0);
    const totalDeductions = arr.reduce((s, r) => s + (Number(r?.summary_details?.total_deductions) || 0), 0);
    return {
      archivesCount: arr.length,
      totalNet,
      totalGross,
      totalDeductions,
    };
  }, [archives]);

  const columns = useMemo(
    () => [
      {
        field: "report_period_end",
        headerName: "Period",
        width: 170,
        renderCell: (params) => (params.value ? DateTime.fromISO(params.value).toFormat("LLL yyyy") : ""),
        valueGetter: (params) => (params?.row?.report_period_end ? DateTime.fromISO(params.row.report_period_end).toISODate() : null),
        type: "date",
      },
      {
        field: "payslip_count",
        headerName: "Payslips",
        width: 110,
        align: "center",
        headerAlign: "center",
        valueGetter: (params) => params?.row?.summary_details?.payslip_count ?? 0,
        renderCell: (params) => (
          <Chip
            size="small"
            label={params.value ?? 0}
            sx={{
              fontWeight: 900,
              backgroundColor: colors.primary[500],
              border: `1px solid ${colors.grey[800]}`,
              color: colors.grey[100],
            }}
          />
        ),
      },
      {
        field: "total_gross_income",
        headerName: "Total Gross",
        width: 170,
        align: "right",
        headerAlign: "right",
        type: "number",
        valueGetter: (params) => params?.row?.summary_details?.total_gross_income ?? 0,
        renderCell: (params) => <Typography fontWeight={800}>{formatCurrency(params.value)}</Typography>,
      },
      {
        field: "total_deductions",
        headerName: "Deductions",
        width: 170,
        align: "right",
        headerAlign: "right",
        type: "number",
        valueGetter: (params) => params?.row?.summary_details?.total_deductions ?? 0,
        renderCell: (params) => <Typography fontWeight={800}>{formatCurrency(params.value)}</Typography>,
      },
      {
        field: "total_net_pay",
        headerName: "Net Pay",
        width: 170,
        align: "right",
        headerAlign: "right",
        type: "number",
        valueGetter: (params) => params?.row?.summary_details?.total_net_pay ?? 0,
        renderCell: (params) => (
          <Typography fontWeight={900} sx={{ color: colors.greenAccent[300] }}>
            {formatCurrency(params.value)}
          </Typography>
        ),
      },
      {
        field: "actions",
        headerName: "Actions",
        width: 150,
        align: "center",
        headerAlign: "center",
        sortable: false,
        disableColumnMenu: true,
        type: "actions",
        getActions: (params) => [
          <GridActionsCellItem
            key={`view-${params.id}`}
            icon={<VisibilityIcon />}
            label="View archive"
            onClick={() => handleViewDetails(params.id)}
            sx={{ color: colors.grey[200] }}
            showInMenu
          />,
          <GridActionsCellItem
            key={`summary-${params.id}`}
            icon={<SummarizeIcon />}
            label="Open summary"
            onClick={() => handleOpenSummary(params.row)}
            sx={{ color: colors.grey[200] }}
            showInMenu
          />,
        ],
      },
    ],
    [colors, handleViewDetails]
  );

  return (
    <Box m={{ xs: "10px", md: "20px" }}>
      <Header title="Payroll Dashboard" subtitle="Close months, view archives, and open summaries per period" />

      {/* Top KPIs */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} md={4}>
          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: 3,
              backgroundColor: colors.primary[400],
              border: `1px solid ${colors.grey[800]}`,
            }}
          >
            <Typography variant="caption" sx={{ color: colors.grey[400] }}>
              Archived periods
            </Typography>
            <Typography variant="h4" fontWeight={900}>
              {kpi.archivesCount}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: 3,
              backgroundColor: colors.primary[400],
              border: `1px solid ${colors.grey[800]}`,
            }}
          >
            <Typography variant="caption" sx={{ color: colors.grey[400] }}>
              Total net pay (all archives)
            </Typography>
            <Typography variant="h5" fontWeight={900} sx={{ color: colors.greenAccent[300] }}>
              {formatCurrency(kpi.totalNet)}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: 3,
              backgroundColor: colors.primary[400],
              border: `1px solid ${colors.grey[800]}`,
            }}
          >
            <Typography variant="caption" sx={{ color: colors.grey[400] }}>
              Gross & deductions (all archives)
            </Typography>
            <Typography variant="body1" fontWeight={900}>
              {formatCurrency(kpi.totalGross)}{" "}
              <Typography component="span" sx={{ color: colors.grey[400], fontWeight: 800 }}>
                gross
              </Typography>
            </Typography>
            <Typography variant="body1" fontWeight={900}>
              {formatCurrency(kpi.totalDeductions)}{" "}
              <Typography component="span" sx={{ color: colors.grey[400], fontWeight: 800 }}>
                deductions
              </Typography>
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Controls */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 2,
          borderRadius: 3,
          backgroundColor: colors.primary[400],
          border: `1px solid ${colors.grey[800]}`,
        }}
      >
        <LocalizationProvider dateAdapter={AdapterLuxon}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ xs: "stretch", md: "center" }}>
            <DatePicker
              label="Month to close"
              value={monthEnd}
              onChange={(newValue) => setMonthEnd(newValue)}
              views={["year", "month"]}
              openTo="month"
              disabled={loading || isClosing}
              slotProps={{
                textField: {
                  size: "small",
                  sx: {
                    width: { xs: "100%", md: 220 },
                    "& .MuiInputBase-root": { height: 42, color: colors.grey[100] },
                    "& .MuiOutlinedInput-notchedOutline": { borderColor: colors.grey[700] },
                    "& .MuiSvgIcon-root": { color: colors.grey[400] },
                  },
                },
              }}
            />

            <Tooltip title="Finalize and archive payroll for the selected month">
              <span>
                <Button
                  variant="contained"
                  color="error"
                  startIcon={isClosing ? <CircularProgress size={18} color="inherit" /> : <CloseIcon />}
                  onClick={handleCloseMonth}
                  disabled={isClosing || loading || !monthEnd}
                  sx={{
                    height: 42,
                    fontWeight: 900,
                    borderRadius: 2,
                  }}
                >
                  {isClosing ? "Closing…" : "Close Month"}
                </Button>
              </span>
            </Tooltip>

            <TextField
              size="small"
              placeholder="Search periods…"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              sx={{
                width: { xs: "100%", md: 320 },
                ml: { xs: 0, md: "auto" },
                "& .MuiInputBase-root": { height: 42, color: colors.grey[100] },
                "& .MuiOutlinedInput-notchedOutline": { borderColor: colors.grey[700] },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: colors.grey[400] }} />
                  </InputAdornment>
                ),
              }}
            />

            <Tooltip title="Refresh archives">
              <span>
                <IconButton
                  onClick={fetchArchives}
                  disabled={loading || isClosing}
                  sx={{
                    height: 42,
                    width: 42,
                    borderRadius: 2,
                    border: `1px solid ${colors.grey[800]}`,
                    color: colors.grey[200],
                  }}
                >
                  <RefreshIcon />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>

          <Alert severity="info" sx={{ mt: 2 }}>
            Tip: use the row menu → <b>Open summary</b> to view statutory + bank summaries for that month.
          </Alert>
        </LocalizationProvider>
      </Paper>

      {/* DataGrid */}
      <Box
        height="62vh"
        sx={{
          "& .MuiDataGrid-root": {
            border: "none",
            borderRadius: 16,
            overflow: "hidden",
            backgroundColor: colors.primary[400],
            border: `1px solid ${colors.grey[800]}`,
          },
          "& .MuiDataGrid-cell": {
            borderBottom: `1px solid ${colors.grey[850] || colors.grey[800]}`,
            color: colors.grey[100],
          },
          "& .MuiDataGrid-columnHeaders": {
            backgroundColor: colors.blueAccent[700],
            borderBottom: "none",
            color: colors.grey[100],
            fontWeight: 900,
          },
          "& .MuiDataGrid-virtualScroller": {
            backgroundColor: colors.primary[400],
          },
          "& .MuiDataGrid-footerContainer": {
            borderTop: `1px solid ${colors.grey[800]}`,
            backgroundColor: colors.primary[500],
            color: colors.grey[100],
          },
          "& .MuiTablePagination-root, & .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows, & .MuiSelect-select": {
            color: colors.grey[300],
          },
          "& .MuiSelect-icon": { color: colors.grey[400] },
          "& .MuiIconButton-root": { color: colors.grey[200] },
          "& .MuiDataGrid-overlay": { backgroundColor: `${colors.primary[400]}CC`, color: colors.grey[300] },
          "& .MuiDataGrid-cell:focus, & .MuiDataGrid-cell:focus-within": { outline: "none !important" },
          "& .MuiDataGrid-columnHeader:focus, & .MuiDataGrid-columnHeader:focus-within": { outline: "none !important" },
        }}
      >
        <DataGrid
          rows={filteredArchives}
          columns={columns}
          getRowId={(row) => row.id}
          loading={loading}
          disableRowSelectionOnClick
          initialState={{
            sorting: { sortModel: [{ field: "report_period_end", sort: "desc" }] },
            pagination: { paginationModel: { pageSize: 10 } },
          }}
          pageSizeOptions={[10, 25, 50]}
          sx={{
            "& .MuiDataGrid-row:hover": {
              backgroundColor: `${colors.primary[500]} !important`,
            },
          }}
        />
      </Box>

      {/* Details modal */}
      <PayrollDetailModal open={detailModalOpen} onClose={handleCloseDetailModal} archiveDetails={archiveDetails} loading={detailLoading} />

      <Snackbar open={snack.open} autoHideDuration={3500} onClose={closeSnack}>
        <Alert severity={snack.severity} variant="filled" onClose={closeSnack}>
          {snack.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Payroll;