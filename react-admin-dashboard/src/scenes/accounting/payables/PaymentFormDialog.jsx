import React, { useState, useEffect } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, MenuItem,
  Grid, useTheme, FormControl, InputLabel, Select, Typography, CircularProgress,
  Box, Autocomplete // 💡 1. Import Autocomplete
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { tokens } from "../../../theme";
import { apiClient } from "../../../api/apiClient";
import { toast } from "react-toastify";
import { DateTime } from "luxon";

const PaymentFormDialog = ({ open, onClose, onSuccess, suppliers, assetAccounts, bills }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  const initialFormState = {
    supplier_id: "",
    supplier_bill_id: "",
    payment_date: DateTime.now(),
    amount: "",
    payment_account_id: "",
    payment_method: "Bank Transfer",
    reference: "",
    notes: "",
    cheque_number: "",
    cheque_account_name: "",
  };

  const [formData, setFormData] = useState(initialFormState);
  const [availableBills, setAvailableBills] = useState([]);
  const [isFetchingBills, setIsFetchingBills] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null); // 💡 2. Add state for Autocomplete object

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      setFormData(initialFormState);
      setAvailableBills([]);
      setSelectedSupplier(null); // 💡 3. Reset selected supplier
    }
  }, [open]);

  // When supplier changes, find their unpaid bills
  useEffect(() => {
    if (formData.supplier_id) {
      const unpaid = bills.filter(
        b => b.supplier_id === formData.supplier_id && (b.status === 'Posted' || b.status === 'Partially Paid' || b.status === 'Overdue')
      );
      setAvailableBills(unpaid);
      console.log(`[Debug] Supplier ${formData.supplier_id} selected. Found ${unpaid.length} unpaid bills.`);
    } else {
      setAvailableBills([]);
    }
  }, [formData.supplier_id, bills]);

  // When a bill is selected, auto-fill the amount
  const handleBillSelect = (billId) => {
    const selectedBill = bills.find(b => b.id === billId);
    setFormData(f => ({
      ...f,
      supplier_bill_id: billId,
      amount: selectedBill ? selectedBill.balance_due : "",
    }));
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };
  
  const handleSubmit = async () => {
    // ... (Your handleSubmit logic is correct)
    if (!formData.supplier_id || !formData.amount || !formData.payment_account_id) {
      toast.warning("Supplier, Amount, and Pay From Account are required.");
      return;
    }
    if (formData.payment_method === 'Cheque' && (!formData.cheque_number || !formData.cheque_account_name)) {
      toast.warning("Cheque Number and Account Name are required for cheque payments.");
      return;
    }
    const payload = {
      ...formData,
      payment_date: formData.payment_date.toISODate(),
      supplier_bill_id: formData.supplier_bill_id || null,
    };
    if (formData.payment_method !== 'Cheque') {
      delete payload.cheque_number;
      delete payload.cheque_account_name;
    }
    try {
      await apiClient.post("/bill-payments", payload);
      toast.success("Payment Recorded!");
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.message || "Operation failed");
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ backgroundColor: colors.blueAccent[700], color: "white" }}>
        Make a Bill Payment
      </DialogTitle>
      <DialogContent sx={{ backgroundColor: colors.primary[400], pt: 3 }}>
        <Grid container spacing={2} mt={1}>
          <Grid item xs={12}>
            {/* 💡 4. Replace FormControl/Select with Autocomplete */}
            <Autocomplete
              fullWidth
              size="small"
              options={suppliers}
              getOptionLabel={(option) => option.name || ""}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              value={selectedSupplier}
              onChange={(event, newValue) => {
                setSelectedSupplier(newValue); // Set the full object for the component
                setFormData(f => ({ 
                  ...f, 
                  supplier_id: newValue ? newValue.id : "",
                  supplier_bill_id: "", // Reset bill when supplier changes
                  amount: "" // Reset amount
                }));
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Supplier"
                  required
                />
              )}
            />
          </Grid>
          
          <Grid item xs={12}>
            <FormControl fullWidth size="small" required>
              <InputLabel>Apply to Bill (Required)</InputLabel>
              <Select
                name="supplier_bill_id"
                value={formData.supplier_bill_id}
                label="Apply to Bill (Required)"
                onChange={(e) => handleBillSelect(e.target.value)}
                disabled={!formData.supplier_id || isFetchingBills}
                displayEmpty
              >
                {/* 💡 Note: Your business logic for "on-account" was removed, this matches */}
                {isFetchingBills ? (
                  <MenuItem disabled>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CircularProgress size={20} />
                      <Typography variant="body2">Loading bills...</Typography>
                    </Box>
                  </MenuItem>
                ) : availableBills.length > 0 ? (
                  availableBills.map((bill) => (
                    <MenuItem 
                      key={bill.id} 
                      value={bill.id}
                      sx={{ whiteSpace: 'normal' }} 
                    >
                      {`#${bill.bill_number} (Due: ${bill.due_date}) - Bal: ${Number(bill.balance_due).toLocaleString("en-KE", { style: "currency", currency: "KES" })}`}
                    </MenuItem>
                  ))
                ) : (
                  <MenuItem disabled>
                    {formData.supplier_id ? "No unpaid bills found for this supplier" : "Select a supplier first"}
                  </MenuItem> 
                )}
              </Select>
            </FormControl>
          </Grid>
          
          {/* ... (Rest of the form is correct) ... */}
          <Grid item xs={6}><DatePicker label="Payment Date" value={formData.payment_date} onChange={(d) => setFormData(f => ({...f, payment_date: d}))} renderInput={(p) => <TextField {...p} fullWidth size="small" />} /></Grid>
          <Grid item xs={6}><TextField fullWidth label="Amount" name="amount" type="number" value={formData.amount} onChange={handleChange} required size="small" InputProps={{ inputProps: { min: 0 } }} /></Grid>
          <Grid item xs={6}>
            <FormControl fullWidth required size="small">
              <InputLabel>Pay From Account</InputLabel>
              <Select name="payment_account_id" value={formData.payment_account_id} label="Pay From Account" onChange={handleChange}>
                {assetAccounts.map((acc) => (<MenuItem key={acc.id} value={acc.id}>{acc.account_name} ({acc.account_code})</MenuItem>))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Payment Method</InputLabel>
              <Select name="payment_method" value={formData.payment_method} label="Payment Method" onChange={handleChange}>
                <MenuItem value="Bank Transfer">Bank Transfer</MenuItem>
                <MenuItem value="Cash">Cash</MenuItem>
                <MenuItem value="M-PESA">M-PESA</MenuItem>
                <MenuItem value="Cheque">Cheque</MenuItem>
                <MenuItem value="Other">Other</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          {formData.payment_method === 'Cheque' && (
            <>
              <Grid item xs={6}>
                <TextField fullWidth label="Cheque Number" name="cheque_number" value={formData.cheque_number} onChange={handleChange} required size="small" />
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth label="Cheque Account Name" name="cheque_account_name" value={formData.cheque_account_name} onChange={handleChange} required size="small" />
              </Grid>
            </>
          )}
          <Grid item xs={12}>
            <TextField fullWidth label="Reference #" name="reference" value={formData.reference} onChange={handleChange} helperText="e.g., Transaction ID or other reference" size="small" />
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth label="Notes (Optional)" name="notes" multiline rows={2} value={formData.notes} onChange={handleChange} size="small" />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ backgroundColor: colors.primary[400], p: 2 }}>
        <Button onClick={onClose} color="secondary">Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" color="secondary">
          Record Payment
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PaymentFormDialog;