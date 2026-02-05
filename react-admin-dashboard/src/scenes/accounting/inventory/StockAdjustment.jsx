// src/scenes/accounting/inventory/StockAdjustment.jsx
import React, { useState, useEffect } from "react";
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
  useTheme,
} from "@mui/material";

import { Add, Refresh } from "@mui/icons-material";
import { apiClient } from "../../../api/apiClient";
import { toast } from "react-toastify";
import { DateTime } from "luxon";
import { tokens } from "../../../theme";
import Header from "../../../components/Header";

const formatCurrency = (amount) =>
  (amount ?? 0).toLocaleString("en-US", {
    style: "currency",
    currency: "KES",
    minimumFractionDigits: 2,
  });

const todayDate = DateTime.local().toISODate();

const StockAdjustment = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  const [adjustments, setAdjustments] = useState([]);
  const [products, setProducts] = useState([]);
  const [glAccounts, setGlAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);

  const [formData, setFormData] = useState({
    product_id: "",
    adjustment_date: todayDate,
    quantity_change: 0,
    reason: "",
    adjustment_account_id: "",
  });

  const selectedProduct = products.find((p) => p.id === formData.product_id);
  const unitCost = selectedProduct?.current_avg_cost ?? 0;
  const adjustmentValue = parseFloat(formData.quantity_change || 0) * unitCost;

  const filteredRevenue = glAccounts.filter((a) =>
    ["Revenue", "Income"].includes(a.account_type)
  );

  const filteredExpense = glAccounts.filter((a) =>
    ["Expense", "Other Expense", "Cost of Goods Sold"].includes(a.account_type)
  );

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const adjRes = await apiClient.get("/stock-adjustments");
      setAdjustments(adjRes.data.data || adjRes.data || []);

      const productRes = await apiClient.get("/products");
      const productsMapped = (productRes.data.data || productRes.data || [])
        .filter((p) => !p.is_service)
        .map((p) => ({
          ...p,
          stock: p.current_stock ?? 0,
        }));

      setProducts(productsMapped);

      const coaRes = await apiClient.get("/accounting/chart-of-accounts");
      const accounts = (coaRes.data.data || coaRes.data || []).sort((a, b) =>
        a.account_code.localeCompare(b.account_code)
      );
      setGlAccounts(accounts);
    } catch (err) {
      toast.error("Failed to load inventory data.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    let { name, value } = e.target;

    if (name === "quantity_change") {
      value = parseFloat(value);
      const product = products.find((p) => p.id === formData.product_id);
      if (product && product.stock + value < 0) {
        toast.error("Cannot reduce stock below zero.");
        return;
      }
    }

    setFormData({ ...formData, [name]: value });
  };

  const submitAdjustment = async () => {
    if (!formData.product_id || !formData.adjustment_account_id) {
      toast.error("Product and Adjustment Account are required.");
      return;
    }

    if (parseFloat(formData.quantity_change) === 0) {
      toast.error("Quantity change must be non-zero.");
      return;
    }

    try {
      await apiClient.post("/stock-adjustments", formData);
      toast.success("Stock adjustment recorded.");

      setOpenDialog(false);
      setFormData({
        product_id: "",
        adjustment_date: todayDate,
        quantity_change: 0,
        reason: "",
        adjustment_account_id: "",
      });

      fetchAll();
    } catch (err) {
      const msg = err.response?.data?.message ?? "Error recording adjustment.";
      toast.error(msg);
    }
  };

  return (
    <Box m="20px">
      <Header
        title="STOCK ADJUSTMENT LOG"
        subtitle="Manual inventory corrections and financial write-offs."
      />

      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h4" color={colors.grey[100]} fontWeight="bold">
          Inventory Adjustments
        </Typography>

        <Box display="flex" gap={2}>
          <Tooltip title="Refresh Data">
            <IconButton onClick={fetchAll} disabled={loading} sx={{ color: colors.grey[100] }}>
              <Refresh />
            </IconButton>
          </Tooltip>

          <Button
            variant="contained"
            startIcon={<Add />}
            color="secondary"
            onClick={() => setOpenDialog(true)}
          >
            Record Adjustment
          </Button>
        </Box>
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" mt={5}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper} sx={{ boxShadow: 3 }}>
          <Table size="small">
            <TableHead sx={{ backgroundColor: colors.primary[700] }}>
              <TableRow>
                <TableCell sx={{ color: colors.grey[100], fontWeight: "bold" }}>
                  Date
                </TableCell>
                <TableCell sx={{ color: colors.grey[100], fontWeight: "bold" }}>
                  Product
                </TableCell>
                <TableCell sx={{ color: colors.grey[100], fontWeight: "bold" }}>
                  Reason
                </TableCell>
                <TableCell align="right" sx={{ color: colors.grey[100], fontWeight: "bold" }}>
                  Qty Change
                </TableCell>
                <TableCell align="right" sx={{ color: colors.grey[100], fontWeight: "bold" }}>
                  Value (KES)
                </TableCell>
                <TableCell sx={{ color: colors.grey[100], fontWeight: "bold" }}>
                  GL Account
                </TableCell>
                <TableCell sx={{ color: colors.grey[100], fontWeight: "bold" }}>
                  JE ID
                </TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {adjustments.length > 0 ? (
                adjustments.map((adj) => (
                  <TableRow
                    key={adj.id}
                    sx={{
                      "&:nth-of-type(odd)": { backgroundColor: colors.primary[500] },
                      "&:hover": { backgroundColor: colors.primary[600] },
                    }}
                  >
                    <TableCell>{adj.adjustment_date}</TableCell>
                    <TableCell>{adj.product?.name ?? "N/A"}</TableCell>
                    <TableCell>{adj.reason}</TableCell>

                    <TableCell
                      align="right"
                      sx={{
                        color:
                          adj.quantity_change < 0
                            ? colors.redAccent[400]
                            : colors.greenAccent[400],
                        fontWeight: "bold",
                      }}
                    >
                      {adj.quantity_change}
                    </TableCell>

                    <TableCell align="right">
                      {formatCurrency(adj.adjustment_value)}
                    </TableCell>

                    <TableCell>{adj.adjustment_account?.account_name ?? "N/A"}</TableCell>
                    <TableCell>{adj.journal_entry_id ?? "N/A"}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ color: colors.grey[400] }}>
                    No adjustments recorded.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* DIALOG */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} fullWidth maxWidth="sm">
        <DialogTitle>Record Stock Adjustment</DialogTitle>
        <DialogContent>
          <Box display="grid" gap={2} mt={1}>
            <TextField
              select
              label="Product"
              name="product_id"
              value={formData.product_id}
              onChange={handleChange}
            >
              {products.map((p) => (
                <MenuItem key={p.id} value={p.id}>
                  {p.name} — Stock: {p.stock}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="Unit Cost"
              value={formatCurrency(unitCost)}
              disabled
            />

            <TextField
              label="Quantity Change (+ / -)"
              type="number"
              name="quantity_change"
              value={formData.quantity_change}
              onChange={handleChange}
            />

            <TextField
              select
              name="adjustment_account_id"
              label={
                parseFloat(formData.quantity_change) >= 0
                  ? "Gain Account (Revenue)"
                  : "Loss Account (Expense)"
              }
              value={formData.adjustment_account_id}
              onChange={handleChange}
            >
              {(parseFloat(formData.quantity_change) >= 0
                ? filteredRevenue
                : filteredExpense
              ).map((acc) => (
                <MenuItem key={acc.id} value={acc.id}>
                  {acc.account_code} — {acc.account_name}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="Reason"
              name="reason"
              value={formData.reason}
              onChange={handleChange}
              multiline
            />

            <TextField
              label="Total Adjustment Value"
              value={formatCurrency(Math.abs(adjustmentValue))}
              disabled
            />
          </Box>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button variant="contained" color="secondary" onClick={submitAdjustment}>
            Save Adjustment
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default StockAdjustment;
