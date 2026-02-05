// src/scenes/accounting/journal/JournalEntries.jsx (adjust path as needed)
import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  Box,
  Button,
  Typography,
  useTheme,
  Chip,
  IconButton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  Paper,
  CircularProgress,
  Tooltip,
  Fade,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Divider,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";

import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import RefreshIcon from "@mui/icons-material/Refresh";
import PrintOutlinedIcon from "@mui/icons-material/PrintOutlined";

import Header from "../../components/Header";
import { tokens } from "../../theme";

// ✅ Use the same auth client pattern as Team.jsx
import { useAuth } from "../../api/AuthProvider";

// ✅ improved print util (async)
import { globalPrint } from "../../utils/print";

const JournalEntries = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const navigate = useNavigate();

  const { apiClient, isAuthenticated, user } = useAuth();

  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  const [dialogType, setDialogType] = useState(null);
  const [selectedEntry, setSelectedEntry] = useState(null);

  const [refreshing, setRefreshing] = useState(false);
  const [viewLoading, setViewLoading] = useState(false);

  const [printingList, setPrintingList] = useState(false);
  const [printingEntryId, setPrintingEntryId] = useState(null);

  /** ─── Helpers ───────────────────────────────────────────────────────── */
  const toNumber = (v) => {
    const n = Number.parseFloat(v ?? 0);
    return Number.isFinite(n) ? n : 0;
  };

  const formatDate = (value) => {
    return value
      ? new Date(value).toLocaleDateString("en-GB", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      : "N/A";
  };

  const formatCurrency = (value) => {
    return toNumber(value).toLocaleString("en-KE", {
      style: "currency",
      currency: "KES",
      maximumFractionDigits: 2,
    });
  };

  const chipSx = useMemo(
    () => ({
      height: 22,
      "& .MuiChip-label": { px: 1, py: 0, fontSize: 12, lineHeight: 1.2 },
      fontWeight: 700,
    }),
    []
  );

  const escapeHtml = (s) =>
    String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  /** ─── Company Letterhead (same style as Team.jsx) ───────────────────── */
  const company = useMemo(() => {
    return {
      name: user?.company?.name || "LIGCO TECHNOLOGIES",
      tagline: user?.company?.tagline || "",
      // IMPORTANT: align the key to how you store it (Team.jsx uses logoUrl)
      logoUrl:
        user?.company?.logoUrl ||
        user?.company?.logo_url || // fallback if backend uses snake_case
        "",
      tel: user?.company?.tel || user?.company?.phone || "N/A",
      email: user?.company?.email || "N/A",
      website: user?.company?.website || "",
      poBox: user?.company?.poBox || user?.company?.po_box || "",
    };
  }, [user]);

  const buildHeaderHtml = (title) => {
    return `
      <div style="text-align: center; padding-bottom: 5px; font-family: 'Source Sans Pro', sans-serif;">
        ${
          company.logoUrl
            ? `<img src="${company.logoUrl}" alt="Logo" style="width: 70px; height: 70px; object-fit: contain; margin-bottom: 5px;" />`
            : ""
        }
        <h2 style="margin: 0; font-size: 18px; letter-spacing: 1px; color: #1a1a1a;">${escapeHtml(
          company.name.toUpperCase()
        )}</h2>
        ${
          company.tagline
            ? `<p style="margin: 2px 0; font-size: 10px; color: #555;">${escapeHtml(company.tagline)}</p>`
            : ""
        }
        <p style="margin: 4px 0; font-size: 12px; color: #444; line-height: 1.4;">
          ${
            company.poBox ? `P.O. Box: ${escapeHtml(company.poBox)} | ` : ""
          }Tel: ${escapeHtml(company.tel)} | Email: ${escapeHtml(company.email)}
          ${company.website ? ` | Web: ${escapeHtml(company.website)}` : ""}
        </p>
        <hr style="margin: 10px 0 0; border: none; border-top: 1px solid rgba(0, 0, 0, 0.15);" />
        <h3 style="margin: 5px 0 0; font-size: 14px; color: #333;">${escapeHtml(
          title
        )}</h3>
      </div>
    `;
  };

  /** ─── Printed by (from auth user) ───────────────────────────────────── */
  const printedBy = useMemo(() => {
    // adjust to your actual user fields
    return user?.name || user?.full_name || user?.email || "System";
  }, [user]);

  const printedByMeta = useMemo(() => {
    // adjust to your actual user fields
    return {
      email: user?.email || "",
      role: user?.role || user?.accessLevel || "",
    };
  }, [user]);

  /** ─── Fetch Journal Entries (Index) ─────────────────────────────────── */
  const fetchEntries = useCallback(async () => {
    setRefreshing(true);
    setLoading(true);
    try {
      if (!isAuthenticated) throw new Error("Not authenticated");

      const { data } = await apiClient.get("/accounting/journal-entries");

      // Controller returns: { status: 'success', data: paginator }
      if (data?.status === "success") {
        setEntries(data?.data?.data || []);
      } else {
        toast.error(data?.message || "Failed to fetch journal entries");
      }
    } catch (err) {
      console.error("Error fetching journal entries:", err);
      toast.error(
        err?.response?.data?.message ||
          err?.message ||
          "Server error while loading entries"
      );
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, [apiClient, isAuthenticated]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  /** ─── Fetch Single Entry (Show) ─────────────────────────────────────── */
  const fetchEntryById = useCallback(
    async (id) => {
      setViewLoading(true);
      try {
        if (!isAuthenticated) throw new Error("Not authenticated");

        const { data } = await apiClient.get(`/accounting/journal-entries/${id}`);
        if (data?.status === "success") {
          setSelectedEntry(data.data);
          return data.data;
        }
        toast.error(data?.message || "Failed to load journal entry");
        setSelectedEntry(null);
        return null;
      } catch (err) {
        console.error("Error fetching journal entry:", err);
        toast.error(
          err?.response?.data?.message ||
            err?.message ||
            "Server error while loading entry"
        );
        setSelectedEntry(null);
        return null;
      } finally {
        setViewLoading(false);
      }
    },
    [apiClient, isAuthenticated]
  );

  /** ─── Dialog Handlers ───────────────────────────────────────────────── */
  const handleOpenDialog = async (type, entry = null) => {
    setDialogType(type);

    if (type === "view" && entry?.id) {
      setSelectedEntry(null);
      await fetchEntryById(entry.id);
      return;
    }

    setSelectedEntry(entry);
  };

  const handleCloseDialog = () => {
    setDialogType(null);
    setSelectedEntry(null);
    setViewLoading(false);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedEntry) return;

    try {
      if (!isAuthenticated) throw new Error("Not authenticated");

      const { data } = await apiClient.delete(
        `/accounting/journal-entries/${selectedEntry.id}`
      );

      if (data?.status === "success") {
        setEntries((prev) => prev.filter((e) => e.id !== selectedEntry.id));
        toast.success(data?.message || "Journal entry deleted successfully");
      } else {
        toast.error(data?.message || "Failed to delete journal entry");
      }
    } catch (err) {
      console.error("Error deleting entry:", err);
      toast.error(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to delete journal entry"
      );
    } finally {
      handleCloseDialog();
    }
  };

  /** ─── Print Builders ────────────────────────────────────────────────── */
  const buildListPrintContent = (rows) => {
    const now = new Date().toLocaleString("en-GB");

    return `
      <div style="display:flex;justify-content:space-between;align-items:flex-end;gap:16px;">
        <div>
          <div style="font-size:18px;font-weight:800;">Journal Entries</div>
          <div style="font-size:12px;color:#444;">Generated: ${escapeHtml(now)} · Records: ${rows.length}</div>
        </div>
      </div>

      <div style="height:12px;"></div>

      <table style="width:100%;border-collapse:collapse;font-size:12px;">
        <thead>
          <tr>
            <th style="border:1px solid #ddd;background:#f2f2f2;text-align:left;padding:6px;width:70px;">ID</th>
            <th style="border:1px solid #ddd;background:#f2f2f2;text-align:left;padding:6px;width:110px;">Date</th>
            <th style="border:1px solid #ddd;background:#f2f2f2;text-align:left;padding:6px;">Description</th>
            <th style="border:1px solid #ddd;background:#f2f2f2;text-align:left;padding:6px;width:160px;">Source</th>
            <th style="border:1px solid #ddd;background:#f2f2f2;text-align:right;padding:6px;width:130px;">Total (KES)</th>
            <th style="border:1px solid #ddd;background:#f2f2f2;text-align:left;padding:6px;width:90px;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${
            rows.length
              ? rows
                  .map((r) => {
                    const source = r.source || "Unknown";
                    const status = (r.status || "posted").toUpperCase();
                    return `
                      <tr>
                        <td style="border:1px solid #ddd;padding:6px;">${escapeHtml(r.id)}</td>
                        <td style="border:1px solid #ddd;padding:6px;">${escapeHtml(
                          formatDate(r.transaction_date)
                        )}</td>
                        <td style="border:1px solid #ddd;padding:6px;">${escapeHtml(r.description)}</td>
                        <td style="border:1px solid #ddd;padding:6px;">${escapeHtml(source)}</td>
                        <td style="border:1px solid #ddd;padding:6px;text-align:right;">${escapeHtml(
                          formatCurrency(r.total)
                        )}</td>
                        <td style="border:1px solid #ddd;padding:6px;">${escapeHtml(status)}</td>
                      </tr>
                    `;
                  })
                  .join("")
              : `<tr><td colspan="6" style="border:1px solid #ddd;padding:6px;">No data.</td></tr>`
          }
        </tbody>
      </table>
    `;
  };

  const buildSinglePrintContent = (entry) => {
    const now = new Date().toLocaleString("en-GB");
    const lines = entry?.lines || [];

    const lineRows = lines
      .map((l) => {
        const acct = `(${l.account?.account_code || "—"}) ${l.account?.account_name || "Unknown"}`;
        const debit = toNumber(l.debit) > 0 ? formatCurrency(l.debit) : "-";
        const credit = toNumber(l.credit) > 0 ? formatCurrency(l.credit) : "-";
        return `
          <tr>
            <td style="border:1px solid #ddd;padding:6px;">${escapeHtml(acct)}</td>
            <td style="border:1px solid #ddd;padding:6px;text-align:right;">${escapeHtml(debit)}</td>
            <td style="border:1px solid #ddd;padding:6px;text-align:right;">${escapeHtml(credit)}</td>
          </tr>
        `;
      })
      .join("");

    return `
      <div style="display:flex;justify-content:space-between;align-items:flex-end;gap:16px;">
        <div>
          <div style="font-size:18px;font-weight:800;">Journal Entry #${escapeHtml(entry?.id)}</div>
          <div style="font-size:12px;color:#444;">Generated: ${escapeHtml(now)}</div>
        </div>
      </div>

      <div style="height:12px;"></div>

      <div style="display:grid;grid-template-columns: 1fr 1fr;gap:12px;">
        <div>
          <div style="font-size:11px;color:#666;margin-bottom:3px;">Date</div>
          <div style="font-size:13px;font-weight:700;">${escapeHtml(
            formatDate(entry?.transaction_date)
          )}</div>
        </div>
        <div>
          <div style="font-size:11px;color:#666;margin-bottom:3px;">Source</div>
          <div style="font-size:13px;font-weight:700;">${escapeHtml(entry?.source || "Unknown")}</div>
        </div>
        <div style="grid-column: 1 / -1;">
          <div style="font-size:11px;color:#666;margin-bottom:3px;">Description</div>
          <div style="font-size:13px;">${escapeHtml(entry?.description || "")}</div>
        </div>
      </div>

      <div style="height:12px;"></div>

      <table style="width:100%;border-collapse:collapse;font-size:12px;">
        <thead>
          <tr>
            <th style="border:1px solid #ddd;background:#f2f2f2;text-align:left;padding:6px;">Account</th>
            <th style="border:1px solid #ddd;background:#f2f2f2;text-align:right;padding:6px;width:140px;">Debit</th>
            <th style="border:1px solid #ddd;background:#f2f2f2;text-align:right;padding:6px;width:140px;">Credit</th>
          </tr>
        </thead>
        <tbody>
          ${lineRows || `<tr><td colspan="3" style="border:1px solid #ddd;padding:6px;">No lines.</td></tr>`}
          <tr>
            <th style="border:1px solid #ddd;background:#f2f2f2;text-align:left;padding:6px;">Totals</th>
            <th style="border:1px solid #ddd;background:#f2f2f2;text-align:right;padding:6px;">${escapeHtml(
              formatCurrency(entry?.total)
            )}</th>
            <th style="border:1px solid #ddd;background:#f2f2f2;text-align:right;padding:6px;">${escapeHtml(
              formatCurrency(entry?.total)
            )}</th>
          </tr>
        </tbody>
      </table>

      <div style="height:10px;"></div>
      <div style="text-align:right;font-size:14px;font-weight:800;">
        Total: ${escapeHtml(formatCurrency(entry?.total))}
      </div>
    `;
  };

  /** ─── Print Actions (use improved function fields) ──────────────────── */
  const handlePrintList = async () => {
    if (!entries?.length) {
      toast.info("No journal entries to print.");
      return;
    }

    setPrintingList(true);
    try {
      await globalPrint({
        title: "Journal Entries",
        content: buildListPrintContent(entries),
        orientation: "portrait",
        margin: "15mm",
        includeGlobalStyles: true,

        // ✅ letterhead + guaranteed logo embedding when possible
        header: buildHeaderHtml("JOURNAL ENTRIES REPORT"),
        assets: { logoUrl: company.logoUrl },

        // ✅ printed by always included
        printedBy,
        printedByMeta,

        // optional: additional footer html; printed-by line is appended automatically
        footer: `
          <div style="text-align:right;font-size:8pt;color:#555;">
            Report Generated: ${escapeHtml(new Date().toLocaleString("en-GB"))}
          </div>
        `,
        styles: `
          table { width: 100%; border-collapse: collapse; font-size: 9.5pt; }
          th, td { border: 1px solid #ddd; padding: 4px 6px; }
          th { background: #f2f2f2 !important; }
          tr:nth-child(even) { background: #f9f9f9; }
        `,
      });
    } catch (e) {
      console.error(e);
      toast.error("Print failed. Check logo/letterhead asset loading.");
    } finally {
      setPrintingList(false);
    }
  };

  const handlePrintEntry = async (id) => {
    setPrintingEntryId(id);
    try {
      const entry = await fetchEntryById(id);
      if (!entry) return;

      await globalPrint({
        title: `Journal Entry #${entry.id}`,
        content: buildSinglePrintContent(entry),
        orientation: "portrait",
        margin: "15mm",
        includeGlobalStyles: true,

        header: buildHeaderHtml(`JOURNAL ENTRY #${entry.id}`),
        assets: { logoUrl: company.logoUrl },

        printedBy,
        printedByMeta,

        footer: `
          <div style="text-align:right;font-size:8pt;color:#555;">
            Document Generated: ${escapeHtml(new Date().toLocaleString("en-GB"))}
          </div>
        `,
        styles: `
          table { width: 100%; border-collapse: collapse; font-size: 10pt; }
          th, td { border: 1px solid #ddd; padding: 4px 6px; }
          th { background: #f2f2f2 !important; }
        `,
      });
    } catch (e) {
      console.error(e);
      toast.error("Print failed. Check logo/letterhead asset loading.");
    } finally {
      setPrintingEntryId(null);
    }
  };

  /** ─── Ledger Lines Renderer ─────────────────────────────────────────── */
  const renderLedgerLines = () => {
    if (viewLoading) {
      return (
        <Box display="flex" justifyContent="center" py={3}>
          <CircularProgress />
        </Box>
      );
    }

    if (!selectedEntry?.lines?.length) {
      return (
        <Typography variant="body2" color={colors.grey[300]}>
          No ledger lines found.
        </Typography>
      );
    }

    return (
      <Paper
        elevation={1}
        sx={{
          backgroundColor: colors.primary[800],
          borderRadius: 2,
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "1fr 0.5fr 0.5fr",
            p: 1,
            backgroundColor: colors.primary[700],
            borderBottom: `1px solid ${colors.grey[700]}`,
          }}
        >
          <Typography fontWeight="bold" fontSize={13}>
            Account
          </Typography>
          <Typography fontWeight="bold" fontSize={13} textAlign="right">
            Debit
          </Typography>
          <Typography fontWeight="bold" fontSize={13} textAlign="right">
            Credit
          </Typography>
        </Box>

        {selectedEntry.lines.map((line, i) => {
          const debit = toNumber(line.debit);
          const credit = toNumber(line.credit);

          return (
            <Box
              key={line.id || i}
              sx={{
                display: "grid",
                gridTemplateColumns: "1fr 0.5fr 0.5fr",
                p: 1,
                backgroundColor: i % 2 === 0 ? colors.primary[900] : colors.primary[800],
                borderBottom: `1px solid ${colors.primary[700]}`,
                "&:hover": { backgroundColor: colors.primary[700] },
              }}
            >
              <Typography fontSize={13}>
                ({line.account?.account_code || "—"}){" "}
                {line.account?.account_name || "Unknown Account"}
              </Typography>

              <Typography fontSize={13} textAlign="right">
                {debit > 0 ? formatCurrency(debit) : "-"}
              </Typography>

              <Typography fontSize={13} textAlign="right">
                {credit > 0 ? formatCurrency(credit) : "-"}
              </Typography>
            </Box>
          );
        })}

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "1fr 0.5fr 0.5fr",
            p: 1,
            backgroundColor: colors.primary[700],
            borderTop: `1px solid ${colors.grey[700]}`,
          }}
        >
          <Typography fontWeight="bold" fontSize={13}>
            Totals
          </Typography>
          <Typography fontWeight="bold" fontSize={13} textAlign="right">
            {formatCurrency(selectedEntry.total)}
          </Typography>
          <Typography fontWeight="bold" fontSize={13} textAlign="right">
            {formatCurrency(selectedEntry.total)}
          </Typography>
        </Box>
      </Paper>
    );
  };

  /** ─── Component Render ──────────────────────────────────────────────── */
  return (
    <Box m="20px">
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Header title="Journal Entries" subtitle="View and manage all ledger journal entries" />

        <Box display="flex" alignItems="center" gap={1}>
          <Tooltip title="Print list">
            <span>
              <IconButton
                onClick={handlePrintList}
                disabled={loading || !entries.length || printingList}
              >
                {printingList ? <CircularProgress size={18} /> : <PrintOutlinedIcon />}
              </IconButton>
            </span>
          </Tooltip>

          <Tooltip title="Refresh">
            <span>
              <IconButton onClick={fetchEntries} disabled={refreshing}>
                {refreshing ? <CircularProgress size={20} /> : <RefreshIcon />}
              </IconButton>
            </span>
          </Tooltip>

          <Button
            variant="contained"
            color="secondary"
            startIcon={<AddCircleOutlineIcon />}
            onClick={() => navigate("/accounts/journal-entries/new")}
          >
            New Entry
          </Button>
        </Box>
      </Box>

      {/* Table (condensed) */}
      <TableContainer component={Paper} sx={{ height: "75vh", backgroundColor: colors.primary[400] }}>
        <Table stickyHeader size="small" aria-label="journal entries table">
          <TableHead>
            <TableRow
              sx={{
                "& .MuiTableCell-root": {
                  backgroundColor: colors.blueAccent[700],
                  fontWeight: "bold",
                  borderBottom: "none",
                  py: 1,
                  fontSize: 13,
                },
              }}
            >
              <TableCell sx={{ width: 70 }}>ID</TableCell>
              <TableCell sx={{ width: 110 }}>Date</TableCell>
              <TableCell>Description</TableCell>
              <TableCell sx={{ width: 170 }}>Source</TableCell>
              <TableCell sx={{ width: 140 }} align="right">
                Total (KES)
              </TableCell>
              <TableCell sx={{ width: 110 }}>Status</TableCell>
              <TableCell sx={{ width: 140 }}>Actions</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 5, borderBottom: "none" }}>
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : entries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 5, borderBottom: "none" }}>
                  <Typography color={colors.grey[300]}>No journal entries found.</Typography>
                </TableCell>
              </TableRow>
            ) : (
              entries.map((row) => (
                <TableRow
                  key={row.id}
                  sx={{
                    "&:hover": { backgroundColor: colors.primary[500] },
                    "& .MuiTableCell-root": {
                      borderBottom: `1px solid ${colors.primary[700]}`,
                      py: 0.75,
                      fontSize: 13,
                    },
                  }}
                >
                  <TableCell>{row.id}</TableCell>
                  <TableCell>{formatDate(row.transaction_date)}</TableCell>

                  <TableCell>
                    <Typography fontSize={13} noWrap title={row.description}>
                      {row.description}
                    </Typography>
                  </TableCell>

                  <TableCell>
                    <Chip
                      label={row.source || "Unknown"}
                      size="small"
                      sx={{
                        ...chipSx,
                        backgroundColor:
                          row.source === "Manual Entry"
                            ? colors.greenAccent[700]
                            : row.source === "Invoice"
                            ? colors.blueAccent[700]
                            : row.source === "Customer Payment"
                            ? colors.blueAccent[800]
                            : colors.redAccent[700],
                        color: "#fff",
                      }}
                    />
                  </TableCell>

                  <TableCell align="right">
                    <Typography fontWeight={800} fontSize={13}>
                      {formatCurrency(row.total)}
                    </Typography>
                  </TableCell>

                  <TableCell>
                    <Chip
                      label={(row.status || "posted").toUpperCase()}
                      size="small"
                      variant="outlined"
                      color={row.status === "posted" ? "success" : "default"}
                      sx={chipSx}
                    />
                  </TableCell>

                  <TableCell>
                    <Box display="flex" alignItems="center" gap={0.5}>
                      <Tooltip title="View Entry">
                        <IconButton size="small" onClick={() => handleOpenDialog("view", row)}>
                          <VisibilityOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>

                      <Tooltip title="Print Entry">
                        <span>
                          <IconButton
                            size="small"
                            onClick={() => handlePrintEntry(row.id)}
                            disabled={printingEntryId === row.id}
                          >
                            {printingEntryId === row.id ? (
                              <CircularProgress size={16} />
                            ) : (
                              <PrintOutlinedIcon fontSize="small" />
                            )}
                          </IconButton>
                        </span>
                      </Tooltip>

                      <Tooltip title="Delete Entry">
                        <span>
                          <IconButton
                            size="small"
                            onClick={() => handleOpenDialog("delete", row)}
                            color="error"
                            disabled={row.source !== "Manual Entry"}
                          >
                            <DeleteOutlinedIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* View Dialog */}
      <Dialog
        open={dialogType === "view"}
        onClose={handleCloseDialog}
        fullWidth
        maxWidth="md"
        TransitionComponent={Fade}
      >
        <DialogTitle
          sx={{
            backgroundColor: colors.primary[600],
            fontWeight: "bold",
            borderBottom: `1px solid ${colors.grey[700]}`,
          }}
        >
          <Box display="flex" alignItems="center" justifyContent="space-between" gap={2}>
            <Typography fontWeight={800}>
              Journal Entry #{selectedEntry?.id || "—"}
            </Typography>

            <Tooltip title="Print this entry">
              <span>
                <IconButton
                  onClick={() => selectedEntry?.id && handlePrintEntry(selectedEntry.id)}
                  disabled={viewLoading || !selectedEntry || printingEntryId === selectedEntry?.id}
                >
                  {printingEntryId === selectedEntry?.id ? (
                    <CircularProgress size={18} />
                  ) : (
                    <PrintOutlinedIcon />
                  )}
                </IconButton>
              </span>
            </Tooltip>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ backgroundColor: colors.primary[400], py: 2.5 }}>
          {viewLoading ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
            </Box>
          ) : selectedEntry ? (
            <Box>
              <Grid container spacing={2} mb={2}>
                <Grid item xs={6}>
                  <Typography color={colors.grey[300]} fontSize={12}>
                    Date
                  </Typography>
                  <Typography fontWeight={700} fontSize={13}>
                    {formatDate(selectedEntry.transaction_date)}
                  </Typography>
                </Grid>

                <Grid item xs={6}>
                  <Typography color={colors.grey[300]} fontSize={12}>
                    Source
                  </Typography>
                  <Chip label={selectedEntry.source || "Unknown"} size="small" sx={chipSx} />
                </Grid>

                <Grid item xs={12}>
                  <Typography color={colors.grey[300]} fontSize={12}>
                    Description
                  </Typography>
                  <Typography fontSize={13}>{selectedEntry.description}</Typography>
                </Grid>
              </Grid>

              <Divider sx={{ mb: 2, borderColor: colors.primary[700] }} />

              {renderLedgerLines()}

              <Box mt={2} textAlign="right">
                <Typography variant="subtitle1" fontWeight="bold">
                  Total: {formatCurrency(selectedEntry.total)}
                </Typography>
              </Box>
            </Box>
          ) : (
            <Typography color={colors.grey[300]}>No entry loaded.</Typography>
          )}
        </DialogContent>

        <DialogActions sx={{ backgroundColor: colors.primary[600] }}>
          <Button onClick={handleCloseDialog} color="secondary">
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={dialogType === "delete"} onClose={handleCloseDialog} TransitionComponent={Fade}>
        <DialogTitle
          sx={{
            backgroundColor: colors.primary[600],
            fontWeight: "bold",
            borderBottom: `1px solid ${colors.grey[700]}`,
          }}
        >
          Confirm Deletion
        </DialogTitle>

        <DialogContent sx={{ backgroundColor: colors.primary[400], py: 2 }}>
          <Typography>
            Are you sure you want to delete journal entry{" "}
            <strong>#{selectedEntry?.id}</strong>? This action cannot be undone.
          </Typography>
        </DialogContent>

        <DialogActions sx={{ backgroundColor: colors.primary[600] }}>
          <Button onClick={handleCloseDialog} color="secondary">
            Cancel
          </Button>
          <Button onClick={handleDeleteConfirm} variant="contained" color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <ToastContainer
        position="bottom-right"
        autoClose={3000}
        theme={theme.palette.mode === "dark" ? "dark" : "light"}
      />
    </Box>
  );
};

export default JournalEntries;
