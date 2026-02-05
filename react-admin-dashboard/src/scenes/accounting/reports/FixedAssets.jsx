// src/scenes/accounting/fixedassets/FixedAssets.jsx
import React, { useEffect, useMemo, useState } from "react";
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
  Divider,
  Alert,
  Stack,
  Pagination,
  FormControl,
  InputLabel,
  Select,
  useTheme,
} from "@mui/material";
import { Add, Delete, Refresh, Visibility, SellOutlined, Close } from "@mui/icons-material";
import { apiClient } from "../../../api/apiClient";
import { toast } from "react-toastify";
import { DateTime } from "luxon";
import { tokens } from "../../../theme";

// --- Helpers ---
const formatCurrency = (amount) => {
  const n = Number(amount ?? 0);
  if (!Number.isFinite(n)) return "KES 0.00";
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "KES",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const fmtDate = (iso) => {
  if (!iso) return "-";
  const d = DateTime.fromISO(String(iso), { zone: "local" });
  return d.isValid ? d.toFormat("dd LLL yyyy") : String(iso);
};

const todayDate = DateTime.local().toISODate();
const isCashBankName = (name = "") => /cash|bank/i.test(name);
const isAccumDeprName = (name = "") => /accum.*depr|depr.*accum|accumulated|depreciation/i.test(name);

// --- Main Component ---
const FixedAssets = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  // Data state
  const [assets, setAssets] = useState([]);
  const [assetsMeta, setAssetsMeta] = useState(null); // paginator meta
  const [glAccounts, setGlAccounts] = useState([]);

  // Fetch state
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorBanner, setErrorBanner] = useState("");

  // Pagination controls (backend expects ?page= & ?per_page=)
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);

  // Add Asset dialog
  const [openDialog, setOpenDialog] = useState(false);
  const [savingAsset, setSavingAsset] = useState(false);
  const [formData, setFormData] = useState({
    asset_name: "",
    asset_code: "", // optional in backend
    purchase_date: todayDate,
    cost: "",
    useful_life_years: 5,
    salvage_value: 0,
    depreciation_account_id: "",
    accumulated_depreciation_account_id: "",
    asset_account_id: "",
  });

  // Disposal dialog
  const [openDisposalDialog, setOpenDisposalDialog] = useState(false);
  const [disposing, setDisposing] = useState(false);
  const [disposalData, setDisposalData] = useState({
    assetId: null,
    assetName: "",
    purchaseDate: "",
    currentBookValue: 0,
    disposal_date: todayDate,
    sale_price: 0,
    cash_account_id: "",
  });

  // Details dialog
  const [openDetailsDialog, setOpenDetailsDialog] = useState(false);
  const [detailsAsset, setDetailsAsset] = useState(null);

  // ----------------------------
  // Memoized account lists
  // ----------------------------
  const sortedAccounts = useMemo(() => {
    return [...(glAccounts || [])].sort((a, b) =>
      String(a.account_code ?? "").localeCompare(String(b.account_code ?? ""))
    );
  }, [glAccounts]);

  const assetAccounts = useMemo(
    () => sortedAccounts.filter((a) => a.account_type === "Asset"),
    [sortedAccounts]
  );
  const expenseAccounts = useMemo(
    () => sortedAccounts.filter((a) => a.account_type === "Expense"),
    [sortedAccounts]
  );

  // NOTE: backend strictly validates accumulated depn by name like '%Accumulated Depreciation%'
  // So we keep the UI filter aligned with that (still tolerant for displaying if needed).
  const accumulatedDeprAccounts = useMemo(
    () => assetAccounts.filter((a) => /accumulated depreciation/i.test(a.account_name || "")),
    [assetAccounts]
  );

  // Fixed asset cost accounts: assets that are NOT accumulated depreciation (rough heuristic)
  const fixedAssetCostAccounts = useMemo(
    () => assetAccounts.filter((a) => !isAccumDeprName(a.account_name)),
    [assetAccounts]
  );

  // Cash/bank accounts for disposal (backend accepts any COA id that exists; UI helps user pick correctly)
  const cashBankAccounts = useMemo(
    () => assetAccounts.filter((a) => isCashBankName(a.account_name)),
    [assetAccounts]
  );

  // ----------------------------
  // Fetching
  // ----------------------------
  const fetchData = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setErrorBanner("");

    try {
      const [assetRes, coaRes] = await Promise.all([
        apiClient.get("/accounting/assets", { params: { page, per_page: perPage } }),
        apiClient.get("/accounting/chart-of-accounts"),
      ]);

      // index() returns paginator object: { data: [...], meta: {...}, links: {...} }
      const paginator = assetRes.data || {};
      const rows = paginator.data ?? [];
      const meta = paginator.meta ?? null;

      const coaData = coaRes.data?.data ?? coaRes.data ?? [];
      const filteredAccounts = (Array.isArray(coaData) ? coaData : [])
        .filter((acc) => ["Expense", "Asset"].includes(acc.account_type))
        .map((acc) => ({
          ...acc,
          id: acc.id,
          account_code: acc.account_code ?? "",
          account_name: acc.account_name ?? "",
          account_type: acc.account_type ?? "",
        }));

      setAssets(Array.isArray(rows) ? rows : []);
      setAssetsMeta(meta);
      setGlAccounts(filteredAccounts);
    } catch (e) {
      console.error("Failed to fetch fixed assets or COA:", e);
      setErrorBanner("Failed to load asset register data. Please retry.");
      toast.error("Failed to load asset register data.");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setErrorBanner("");
      try {
        const [assetRes, coaRes] = await Promise.all([
          apiClient.get("/accounting/assets", { params: { page, per_page: perPage } }),
          apiClient.get("/accounting/chart-of-accounts"),
        ]);
        if (!alive) return;

        const paginator = assetRes.data || {};
        const rows = paginator.data ?? [];
        const meta = paginator.meta ?? null;

        const coaData = coaRes.data?.data ?? coaRes.data ?? [];
        const filteredAccounts = (Array.isArray(coaData) ? coaData : [])
          .filter((acc) => ["Expense", "Asset"].includes(acc.account_type))
          .map((acc) => ({
            ...acc,
            id: acc.id,
            account_code: acc.account_code ?? "",
            account_name: acc.account_name ?? "",
            account_type: acc.account_type ?? "",
          }));

        setAssets(Array.isArray(rows) ? rows : []);
        setAssetsMeta(meta);
        setGlAccounts(filteredAccounts);
      } catch (e) {
        console.error("Failed to fetch fixed assets or COA:", e);
        if (!alive) return;
        setErrorBanner("Failed to load asset register data. Please retry.");
        toast.error("Failed to load asset register data.");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
    // IMPORTANT: refetch on page/perPage changes
  }, [page, perPage]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchData({ silent: true });
      toast.info("Refreshed.");
    } finally {
      setRefreshing(false);
    }
  };

  // ----------------------------
  // Typed field handling
  // ----------------------------
  const numericFields = useMemo(() => new Set(["cost", "useful_life_years", "salvage_value"]), []);
  const disposalNumericFields = useMemo(() => new Set(["sale_price"]), []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const v = numericFields.has(name) ? (value === "" ? "" : Number(value)) : value;
    setFormData((p) => ({ ...p, [name]: v }));
  };

  const handleDisposalChange = (e) => {
    const { name, value } = e.target;
    const v = disposalNumericFields.has(name) ? (value === "" ? "" : Number(value)) : value;
    setDisposalData((p) => ({ ...p, [name]: v }));
  };

  // ----------------------------
  // Validation aligned to backend
  // ----------------------------
  const validateNewAsset = () => {
    if (!formData.asset_name?.trim()) return "Asset Name is required.";
    // purchase_date required Y-m-d
    if (!formData.purchase_date) return "Purchase Date is required.";
    if (formData.cost === "" || Number(formData.cost) < 0.01) return "Cost must be at least 0.01.";
    if (Number(formData.useful_life_years) < 1) return "Useful life must be at least 1 year.";
    if (Number(formData.salvage_value) < 0) return "Salvage value cannot be negative.";

    // backend requires these account IDs
    if (!formData.depreciation_account_id) return "Depreciation Expense Account is required.";
    if (!formData.accumulated_depreciation_account_id) return "Accumulated Depreciation Account is required.";
    if (!formData.asset_account_id) return "Fixed Asset Cost Account is required.";

    return "";
  };

  const validateDisposal = () => {
    if (!disposalData.disposal_date) return "Disposal Date is required.";
    if (Number(disposalData.sale_price) < 0) return "Sale price cannot be negative.";

    // backend intends cash_account_id required when sale_price > 0
    if (Number(disposalData.sale_price) > 0 && !disposalData.cash_account_id)
      return "Cash/Bank Account is required when selling.";

    // date sanity: disposal >= purchase date (if available)
    if (disposalData.purchaseDate) {
      const p = DateTime.fromISO(String(disposalData.purchaseDate));
      const d = DateTime.fromISO(String(disposalData.disposal_date));
      if (p.isValid && d.isValid && d < p) return "Disposal date cannot be before purchase date.";
    }
    return "";
  };

  // ----------------------------
  // Actions
  // ----------------------------
  const handleSubmit = async () => {
    const err = validateNewAsset();
    if (err) return toast.warning(err);

    setSavingAsset(true);
    try {
      const payload = {
        asset_name: formData.asset_name?.trim(),
        asset_code: formData.asset_code?.trim() || null,
        purchase_date: formData.purchase_date,
        cost: Number(formData.cost),
        useful_life_years: Number(formData.useful_life_years),
        salvage_value: Number(formData.salvage_value ?? 0),
        depreciation_method: "Straight-Line", // backend requires this
        depreciation_account_id: formData.depreciation_account_id,
        accumulated_depreciation_account_id: formData.accumulated_depreciation_account_id,
        asset_account_id: formData.asset_account_id,
      };

      await apiClient.post("/accounting/assets", payload);

      toast.success(`Asset "${payload.asset_name}" created successfully.`);
      setOpenDialog(false);
      setFormData({
        asset_name: "",
        asset_code: "",
        purchase_date: todayDate,
        cost: "",
        useful_life_years: 5,
        salvage_value: 0,
        depreciation_account_id: "",
        accumulated_depreciation_account_id: "",
        asset_account_id: "",
      });

      await fetchData({ silent: true });
    } catch (error) {
      const backendErrors = error.response?.data?.errors;
      const errorMessage = backendErrors
        ? Object.values(backendErrors).flat().join(" | ")
        : error.response?.data?.message || "Error recording new asset.";
      console.error("Error creating asset:", error.response || error);
      toast.error(errorMessage);
    } finally {
      setSavingAsset(false);
    }
  };

  const handleOpenDisposal = (asset) => {
    if (asset.status === "Disposed") return;

    setDisposalData({
      assetId: asset.id,
      assetName: asset.asset_name,
      purchaseDate: asset.purchase_date,
      currentBookValue: Number(asset.book_value ?? 0),
      disposal_date: todayDate,
      sale_price: 0,
      cash_account_id: "",
    });
    setOpenDisposalDialog(true);
  };

  const handleDisposeSubmit = async () => {
    const err = validateDisposal();
    if (err) return toast.warning(err);

    setDisposing(true);
    try {
      const { assetId, sale_price, disposal_date, cash_account_id } = disposalData;

      const res = await apiClient.post(`/accounting/assets/${assetId}/dispose`, {
        disposal_date,
        sale_price: Number(sale_price ?? 0),
        cash_account_id: Number(sale_price ?? 0) > 0 ? cash_account_id : null,
      });

      const gainLoss = res.data?.gain_loss;
      const msg =
        res.data?.message ||
        (gainLoss !== undefined
          ? `Asset disposed. Gain/Loss: ${formatCurrency(gainLoss)}`
          : "Asset disposed successfully.");

      toast.success(msg);
      setOpenDisposalDialog(false);
      await fetchData({ silent: true });
    } catch (error) {
      console.error("Error disposing asset:", error.response || error);
      toast.error(error.response?.data?.message || "Failed to record asset disposal.");
    } finally {
      setDisposing(false);
    }
  };

  // DELETE rule aligned to backend:
  // Allowed only if status === 'In Use' AND accumulated_depreciation == 0 (or <= 0)
  const canDelete = (asset) =>
    asset?.status === "In Use" && Number(asset?.accumulated_depreciation ?? 0) <= 0;

  const handleDelete = async (asset) => {
    if (!canDelete(asset)) {
      return toast.warning("Delete is allowed only if the asset is In Use and has no depreciation posted.");
    }

    if (
      !window.confirm(
        "Delete this asset? Allowed only if it is In Use and has no depreciation posted. This will also remove the acquisition journal entry."
      )
    )
      return;

    try {
      await apiClient.delete(`/accounting/assets/${asset.id}`);
      toast.info("Asset deleted.");
      await fetchData({ silent: true });
    } catch (e) {
      toast.error(e.response?.data?.message || "Error deleting asset.");
    }
  };

  const handleOpenDetails = (asset) => {
    setDetailsAsset(asset);
    setOpenDetailsDialog(true);
  };

  // ----------------------------
  // Render
  // ----------------------------
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" mt={5}>
        <CircularProgress />
      </Box>
    );
  }

  const totalPages = assetsMeta?.last_page ?? 1;
  const totalItems = assetsMeta?.total ?? assets.length;

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} gap={2}>
        <Box>
          <Typography variant="h4" fontWeight="bold" sx={{ color: colors.greenAccent[400] }}>
            Fixed Asset Register
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.8 }}>
            Register assets, track depreciation, and record disposals.
          </Typography>
        </Box>

        <Box display="flex" gap={1.5} alignItems="center">
          <Tooltip title="Refresh Data">
            <span>
              <IconButton onClick={handleRefresh} disabled={refreshing}>
                <Refresh />
              </IconButton>
            </span>
          </Tooltip>

          <Button variant="contained" startIcon={<Add />} onClick={() => setOpenDialog(true)} color="secondary">
            Add New Asset
          </Button>
        </Box>
      </Box>

      {errorBanner ? (
        <Box mb={2}>
          <Alert
            severity="error"
            action={
              <Button color="inherit" size="small" onClick={() => fetchData()}>
                Retry
              </Button>
            }
          >
            {errorBanner}
          </Alert>
        </Box>
      ) : null}

      {/* Pagination controls */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1} gap={2} flexWrap="wrap">
        <Typography variant="body2" sx={{ opacity: 0.8 }}>
          Showing page {page} of {totalPages} • Total assets: {totalItems}
        </Typography>

        <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel id="per-page-label">Rows per page</InputLabel>
            <Select
              labelId="per-page-label"
              label="Rows per page"
              value={perPage}
              onChange={(e) => {
                setPerPage(Number(e.target.value));
                setPage(1);
              }}
            >
              {[10, 20, 50, 100].map((n) => (
                <MenuItem key={n} value={n}>
                  {n}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Pagination
            count={totalPages}
            page={page}
            onChange={(_, value) => setPage(value)}
            shape="rounded"
            size="small"
          />
        </Box>
      </Box>

      {/* Assets Table */}
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ color: colors.greenAccent[400], fontWeight: "bold" }}>Asset Name</TableCell>
              <TableCell sx={{ color: colors.greenAccent[400], fontWeight: "bold" }}>Acquired</TableCell>
              <TableCell align="right" sx={{ color: colors.greenAccent[400], fontWeight: "bold" }}>
                Cost
              </TableCell>
              <TableCell sx={{ color: colors.greenAccent[400], fontWeight: "bold" }}>Life (Yrs)</TableCell>
              <TableCell align="right" sx={{ color: colors.greenAccent[400], fontWeight: "bold" }}>
                Accum. Depr.
              </TableCell>
              <TableCell align="right" sx={{ color: colors.greenAccent[400], fontWeight: "bold" }}>
                Book Value
              </TableCell>
              <TableCell sx={{ color: colors.greenAccent[400], fontWeight: "bold" }}>Status</TableCell>
              <TableCell align="center" sx={{ color: colors.greenAccent[400], fontWeight: "bold" }}>
                Actions
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {assets.length > 0 ? (
              assets.map((asset) => (
                <TableRow key={asset.id} hover>
                  <TableCell>{asset.asset_name}</TableCell>
                  <TableCell>{fmtDate(asset.purchase_date)}</TableCell>
                  <TableCell align="right">{formatCurrency(asset.cost)}</TableCell>
                  <TableCell>{asset.useful_life_years}</TableCell>
                  <TableCell align="right" sx={{ color: colors.redAccent[400] }}>
                    {formatCurrency(asset.accumulated_depreciation)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: "bold" }}>
                    {formatCurrency(asset.book_value)}
                  </TableCell>
                  <TableCell>{asset.status}</TableCell>

                  <TableCell align="center">
                    <Tooltip title={asset.status === "Disposed" ? "Asset already disposed" : "Dispose/Sell Asset"}>
                      <span>
                        <IconButton
                          color="secondary"
                          size="small"
                          onClick={() => handleOpenDisposal(asset)}
                          disabled={asset.status === "Disposed"}
                        >
                          <SellOutlined fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>

                    <Tooltip title="View Details">
                      <IconButton color="primary" size="small" onClick={() => handleOpenDetails(asset)}>
                        <Visibility fontSize="small" />
                      </IconButton>
                    </Tooltip>

                    <Tooltip title="Delete (only if In Use & not depreciated)">
                      <span>
                        <IconButton
                          color="error"
                          size="small"
                          onClick={() => handleDelete(asset)}
                          disabled={!canDelete(asset)}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  No fixed assets registered.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* --- 1) Add Asset Dialog --- */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} fullWidth maxWidth="sm">
        <DialogTitle>
          <Box display="flex" alignItems="center" justifyContent="space-between" gap={2}>
            Register New Fixed Asset
            <IconButton onClick={() => setOpenDialog(false)} size="small">
              <Close fontSize="small" />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent>
          <Box display="grid" gap={2} mt={1}>
            <TextField
              name="asset_name"
              label="Asset Name"
              value={formData.asset_name}
              onChange={handleChange}
              required
              autoFocus
            />

            <TextField
              name="asset_code"
              label="Asset Code (Optional)"
              value={formData.asset_code}
              onChange={handleChange}
              helperText="Must be unique per company if provided."
            />

            <TextField
              name="purchase_date"
              type="date"
              label="Purchase Date"
              InputLabelProps={{ shrink: true }}
              value={formData.purchase_date}
              onChange={handleChange}
              required
            />

            <TextField
              name="cost"
              label="Original Cost (Ksh)"
              type="number"
              value={formData.cost}
              onChange={handleChange}
              required
              inputProps={{ min: 0.01, step: 1 }}
            />

            <TextField
              name="useful_life_years"
              label="Useful Life (Years)"
              type="number"
              value={formData.useful_life_years}
              onChange={handleChange}
              required
              inputProps={{ min: 1, step: 1 }}
            />

            <TextField
              name="salvage_value"
              label="Salvage Value (Ksh)"
              type="number"
              value={formData.salvage_value}
              onChange={handleChange}
              inputProps={{ min: 0, step: 1 }}
            />

            <Divider sx={{ my: 1 }}>GL Accounts</Divider>

            <TextField
              select
              name="asset_account_id"
              label="Fixed Asset Cost Account (Asset)"
              value={formData.asset_account_id}
              onChange={handleChange}
              required
            >
              {fixedAssetCostAccounts.map((a) => (
                <MenuItem key={a.id} value={a.id}>
                  {a.account_code} - {a.account_name}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              name="depreciation_account_id"
              label="Depreciation Expense Account (Debit)"
              value={formData.depreciation_account_id}
              onChange={handleChange}
              required
            >
              {expenseAccounts.map((a) => (
                <MenuItem key={a.id} value={a.id}>
                  {a.account_code} - {a.account_name}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              name="accumulated_depreciation_account_id"
              label="Accumulated Depreciation (Contra-Asset)"
              value={formData.accumulated_depreciation_account_id}
              onChange={handleChange}
              required
            >
              {accumulatedDeprAccounts.map((a) => (
                <MenuItem key={a.id} value={a.id}>
                  {a.account_code} - {a.account_name}
                </MenuItem>
              ))}
            </TextField>

            {accumulatedDeprAccounts.length === 0 ? (
              <Alert severity="warning">
                Backend requires an account name containing “Accumulated Depreciation”. Add one to your Chart of Accounts
                (e.g. “Accumulated Depreciation - Equipment”).
              </Alert>
            ) : null}
          </Box>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setOpenDialog(false)} disabled={savingAsset}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleSubmit} color="primary" disabled={savingAsset}>
            {savingAsset ? "Saving..." : "Save Asset"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* --- 2) Disposal Dialog --- */}
      <Dialog open={openDisposalDialog} onClose={() => setOpenDisposalDialog(false)} fullWidth maxWidth="xs">
        <DialogTitle>
          <Box display="flex" alignItems="center" justifyContent="space-between" gap={2}>
            Dispose Asset: {disposalData.assetName}
            <IconButton onClick={() => setOpenDisposalDialog(false)} size="small">
              <Close fontSize="small" />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent>
          <Box display="grid" gap={2} mt={1}>
            <Typography variant="body1" fontWeight="bold">
              Current Book Value: {formatCurrency(disposalData.currentBookValue)}
            </Typography>

            <TextField
              name="disposal_date"
              type="date"
              label="Disposal Date"
              InputLabelProps={{ shrink: true }}
              value={disposalData.disposal_date}
              onChange={handleDisposalChange}
              required
            />

            <TextField
              name="sale_price"
              label="Sale Price (Cash Received)"
              type="number"
              value={disposalData.sale_price}
              onChange={handleDisposalChange}
              helperText="Enter 0 if scrapped."
              required
              inputProps={{ min: 0, step: 1 }}
            />

            <TextField
              select
              name="cash_account_id"
              label="Cash/Bank Account"
              value={disposalData.cash_account_id}
              onChange={handleDisposalChange}
              required={Number(disposalData.sale_price) > 0}
              disabled={Number(disposalData.sale_price) <= 0}
              helperText={
                Number(disposalData.sale_price) > 0
                  ? "Account receiving the funds"
                  : "Not required if scrapped"
              }
            >
              {cashBankAccounts.map((a) => (
                <MenuItem key={a.id} value={a.id}>
                  {a.account_code} - {a.account_name}
                </MenuItem>
              ))}
            </TextField>

            {Number(disposalData.sale_price) > 0 && cashBankAccounts.length === 0 ? (
              <Alert severity="warning">
                No Cash/Bank accounts found by name matching (“Cash” / “Bank”). You can still proceed if your COA naming
                differs, but consider standardizing account names.
              </Alert>
            ) : null}
          </Box>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setOpenDisposalDialog(false)} disabled={disposing}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleDisposeSubmit} color="error" disabled={disposing}>
            {disposing ? "Posting..." : "Confirm Disposal"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* --- 3) Details Dialog --- */}
      <Dialog open={openDetailsDialog} onClose={() => setOpenDetailsDialog(false)} fullWidth maxWidth="sm">
        <DialogTitle>
          <Box display="flex" alignItems="center" justifyContent="space-between" gap={2}>
            Asset Details
            <IconButton onClick={() => setOpenDetailsDialog(false)} size="small">
              <Close fontSize="small" />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent>
          {detailsAsset ? (
            <Stack spacing={1.25} mt={1}>
              <Typography variant="h6" fontWeight="bold">
                {detailsAsset.asset_name}
              </Typography>

              <Divider />

              <Box display="grid" gridTemplateColumns="1fr 1fr" gap={1.5}>
                <Box>
                  <Typography variant="caption" sx={{ opacity: 0.7 }}>
                    Purchase Date
                  </Typography>
                  <Typography>{fmtDate(detailsAsset.purchase_date)}</Typography>
                </Box>

                <Box>
                  <Typography variant="caption" sx={{ opacity: 0.7 }}>
                    Status
                  </Typography>
                  <Typography>{detailsAsset.status ?? "-"}</Typography>
                </Box>

                <Box>
                  <Typography variant="caption" sx={{ opacity: 0.7 }}>
                    Cost
                  </Typography>
                  <Typography>{formatCurrency(detailsAsset.cost)}</Typography>
                </Box>

                <Box>
                  <Typography variant="caption" sx={{ opacity: 0.7 }}>
                    Useful Life (Years)
                  </Typography>
                  <Typography>{detailsAsset.useful_life_years ?? "-"}</Typography>
                </Box>

                <Box>
                  <Typography variant="caption" sx={{ opacity: 0.7 }}>
                    Salvage Value
                  </Typography>
                  <Typography>{formatCurrency(detailsAsset.salvage_value)}</Typography>
                </Box>

                <Box>
                  <Typography variant="caption" sx={{ opacity: 0.7 }}>
                    Last Depreciation Date
                  </Typography>
                  <Typography>{detailsAsset.last_depreciation_date ? fmtDate(detailsAsset.last_depreciation_date) : "-"}</Typography>
                </Box>

                <Box>
                  <Typography variant="caption" sx={{ opacity: 0.7 }}>
                    Accumulated Depreciation
                  </Typography>
                  <Typography>{formatCurrency(detailsAsset.accumulated_depreciation)}</Typography>
                </Box>

                <Box>
                  <Typography variant="caption" sx={{ opacity: 0.7 }}>
                    Book Value
                  </Typography>
                  <Typography fontWeight="bold">{formatCurrency(detailsAsset.book_value)}</Typography>
                </Box>

                <Box>
                  <Typography variant="caption" sx={{ opacity: 0.7 }}>
                    Acquisition JE ID
                  </Typography>
                  <Typography>{detailsAsset.journal_entry_id ?? "-"}</Typography>
                </Box>

                <Box>
                  <Typography variant="caption" sx={{ opacity: 0.7 }}>
                    Disposal Date
                  </Typography>
                  <Typography>{detailsAsset.disposal_date ? fmtDate(detailsAsset.disposal_date) : "-"}</Typography>
                </Box>
              </Box>

              <Divider />

              <Alert severity="info">
                Backend supports <b>show()</b> which loads journalEntries. If you want full journal lines here, add a call to
                <code>GET /accounting/assets/:id</code> and render the returned journal entries in this dialog.
              </Alert>
            </Stack>
          ) : (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress size={22} />
            </Box>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setOpenDetailsDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FixedAssets;
