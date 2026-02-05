// src/scenes/accounting/payments/CustomerPayments.jsx

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
} from "@mui/material";
import { Add, Visibility, Delete, Refresh, Payment } from "@mui/icons-material";
import { apiClient } from "../../../api/apiClient";
import { toast } from "react-toastify";
import { DateTime } from "luxon";
import PaymentDetailsDialog from "./PaymentDetailsDialog";

const CustomerPayments = () => {
  const [payments, setPayments] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [cashAccounts, setCashAccounts] = useState([]); // <-- NEW STATE
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    customer_id: "",
    invoice_id: "",
    payment_date: "",
    method: "Cash",
    reference: "",
    amount: "",
    notes: "",
    cash_account_id: "", // <-- ADDED
  });

  const [search, setSearch] = useState("");

  useEffect(() => {
    // Initial load: fetch all data
    fetchData();
  }, []);

  // --- Core Data Fetcher ---
  const fetchData = async () => {
    setLoading(true);
    await Promise.all([
        fetchPayments(), 
        fetchInvoices(), 
        fetchCustomers(), 
        fetchCashAccounts()
    ]);
    setLoading(false);
  }

  // --- New Recalculation Handler (The Integrity Check) ---
  const recalculateInvoices = async () => {
    try {
        const res = await apiClient.post("/invoices/recalculate-balances");
        if (res.data.total_updated > 0) {
            toast.info(`Invoice data corrected: ${res.data.total_updated} balances updated.`);
        }
    } catch (e) {
        console.error("Failed to run data integrity check:", e);
        toast.warning("Could not verify or correct all invoice balances.");
    }
  };

  const fetchPayments = async () => {
    try {
      // 🚨 INTEGRITY CHECK BEFORE REFRESHING DATA 🚨
      await recalculateInvoices();

      const res = await apiClient.get("/payments");
      
      const paymentsArray = Array.isArray(res.data) 
          ? res.data 
          : (res.data?.data || []); 

      setPayments(paymentsArray);
    } catch (e) {
      console.error("Error fetching payments:", e);
      setPayments([]);
      toast.error("Failed to fetch payments");
    } 
  };

  const fetchInvoices = async () => {
    try {
      // Fetch invoices (recalculation above ensures balance_due is correct)
      const res = await apiClient.get("/invoices");
      setInvoices(res.data.data || res.data || []);
    } catch {
      console.error("Failed to fetch invoices");
    }
  };

  const fetchCustomers = async () => {
    try {
      const res = await apiClient.get("/customers");
      setCustomers(res.data.data || res.data || []);
    } catch {
      console.error("Failed to fetch customers");
    }
  };
  
  const fetchCashAccounts = async () => { 
    try {
      const res = await apiClient.get("/accounting/chart-of-accounts"); 
      
      // Safely extract all accounts, checking for common wrapping
      const allAccounts = Array.isArray(res.data) ? res.data : (res.data?.data || []);

      // Filter for Asset accounts and sort
      const filteredAccounts = allAccounts
        .filter(account => 
            (account.account_type === 'Asset') 
        )
        // Ensure account_code exists before sorting
        .sort((a, b) => (a.account_code || '').localeCompare(b.account_code || ''));

      setCashAccounts(filteredAccounts);
    } catch (e) {
      console.error("Failed to fetch cash accounts:", e);
      toast.error("Error: Chart of Accounts list is unavailable. (Code 404/422)");
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // 🔹 Populate payment dialog when invoice selected
  const handleRecordPayment = (invoice) => {
    setFormData({
      customer_id: invoice?.customer?.id || "",
      invoice_id: invoice?.id || "",
      payment_date: DateTime.now().toISODate(), // today's date (Luxon)
      method: "Cash",
      reference: "",
      amount: invoice?.balance_due ? Math.round(invoice.balance_due * 100) / 100 : "", // Set amount to balance due if available
      notes: `Payment for invoice #${invoice?.invoice_number || ""}`,
      cash_account_id: "", // <-- RESET FIELD
    });
    setOpenDialog(true);
  };

const handleSubmit = async () => {
    try {
        if (!formData.customer_id || !formData.amount || !formData.payment_date || !formData.cash_account_id) {
        toast.warning("Customer, amount, date, and Cash/Bank Account are required."); 
        return;
        }

        await apiClient.post("/payments", formData);

        toast.success("Payment recorded successfully");
        setOpenDialog(false);
        setFormData({
        customer_id: "",
        invoice_id: "",
        payment_date: "",
        method: "Cash",
        reference: "",
        amount: "",
        notes: "",
        cash_account_id: "", // <-- RESET FIELD
        });

        // ✅ Refresh all data immediately
        await fetchData();
    } catch (error) {
        toast.error(error.response?.data?.message || "Error recording payment");
    }
    };


  const handleDelete = async (id) => {
    if (!window.confirm("Delete this payment? This will reverse the GL entry and invoice balance.")) return;
    try {
      await apiClient.delete(`/payments/${id}`);
      toast.info("Payment deleted and transactions reversed.");
      await fetchData(); // Refresh all data
    } catch (error) {
      toast.error(error.response?.data?.message || "Error deleting payment");
    }
  };

  const filteredPayments = payments.filter(
    (p) =>
      p.customer?.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.invoice?.invoice_number?.toLowerCase().includes(search.toLowerCase()) ||
      p.method?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" mt={5}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5">Customer Payments</Typography>
        <Box display="flex" gap={2}>
          <TextField
            size="small"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Tooltip title="Refresh (Recalculates Balances)">
            <IconButton onClick={fetchPayments}> {/* Now calls fetchPayments which runs recalculate first */}
              <Refresh />
            </IconButton>
          </Tooltip>
          <Tooltip title="Record Payment (Manual)">
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => {
                setFormData({
                  customer_id: "",
                  invoice_id: "",
                  payment_date: DateTime.now().toISODate(),
                  method: "Cash",
                  reference: "",
                  amount: "",
                  notes: "",
                  cash_account_id: "", // <-- RESET
                });
                setOpenDialog(true);
              }}
            >
              Record Payment
            </Button>
          </Tooltip>
        </Box>
      </Box>

      {/* Payments Table */}
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Customer</TableCell>
              <TableCell>Invoice #</TableCell>
              <TableCell>Method</TableCell>
              <TableCell>Reference</TableCell>
              <TableCell align="right">Amount (Ksh)</TableCell>
              <TableCell>GL Account</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredPayments.length > 0 ? (
              filteredPayments.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{p.payment_date}</TableCell>
                  <TableCell>{p.customer?.name || "N/A"}</TableCell>
                  <TableCell>{p.invoice?.invoice_number || "-"}</TableCell>
                  <TableCell>{p.method}</TableCell>
                  <TableCell>{p.reference || "-"}</TableCell>
                  <TableCell align="right">
                    {parseFloat(p.amount).toLocaleString()}
                  </TableCell>
                  <TableCell>{p.cash_account?.account_name || "N/A"}</TableCell>
                  <TableCell align="center">
                    <Tooltip title="View Payment Details">
                        <IconButton
                            color="primary"
                            onClick={() => {
                            setSelectedPayment(p);
                            setViewDialogOpen(true);
                            }}
                        >
                            <Visibility />
                        </IconButton>
                        </Tooltip>
                    <Tooltip title="Record Another Payment">
                      <IconButton
                        color="success"
                        onClick={() => handleRecordPayment(p.invoice)}
                      >
                        <Payment />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton color="error" onClick={() => handleDelete(p.id)}>
                        <Delete />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  No payments found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} fullWidth>
        <DialogTitle>Record Payment</DialogTitle>
        <DialogContent>
          <Box display="grid" gap={2} mt={1}>
            <TextField
              select
              name="customer_id"
              label="Customer"
              value={formData.customer_id}
              onChange={handleChange}
              required
            >
              {customers.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.name}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              name="invoice_id"
              label="Invoice (Optional)"
              value={formData.invoice_id}
              onChange={handleChange}
            >
              <MenuItem value="">-- None --</MenuItem>
              {invoices.map((i) => (
                <MenuItem key={i.id} value={i.id}>
                  {i.invoice_number} — {i.customer?.name} (Due: {parseFloat(i.balance_due).toLocaleString()})
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              name="cash_account_id" // <-- NEW REQUIRED FIELD
              label="Cash/Bank Account (GL)"
              value={formData.cash_account_id}
              onChange={handleChange}
              required
            >
              {cashAccounts.map((a) => (
                <MenuItem key={a.id} value={a.id}>
                  {a.account_code} - {a.account_name}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              name="payment_date"
              type="date"
              label="Payment Date"
              InputLabelProps={{ shrink: true }}
              value={formData.payment_date}
              onChange={handleChange}
              required
            />

            <TextField
              select
              name="method"
              label="Payment Method"
              value={formData.method}
              onChange={handleChange}
            >
              <MenuItem value="Cash">Cash</MenuItem>
              <MenuItem value="Bank Transfer">Bank Transfer</MenuItem>
              <MenuItem value="Cheque">Cheque</MenuItem>
              <MenuItem value="Mpesa">M-Pesa</MenuItem>
            </TextField>

            <TextField
              name="reference"
              label="Reference (Optional)"
              value={formData.reference}
              onChange={handleChange}
            />

            <TextField
              name="amount"
              label="Amount"
              type="number"
              value={formData.amount}
              onChange={handleChange}
              required
            />

            <TextField
              name="notes"
              label="Notes"
              multiline
              rows={2}
              value={formData.notes}
              onChange={handleChange}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
      <PaymentDetailsDialog
        open={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        payment={selectedPayment}
        />
    </Box>
  );
};

export default CustomerPayments;