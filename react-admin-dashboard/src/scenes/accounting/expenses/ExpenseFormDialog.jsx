import React, { useState, useEffect } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, MenuItem, Grid, useTheme, FormControl, InputLabel, Select
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { tokens } from "../../../theme";
import { apiClient } from "../../../api/apiClient";
import { toast } from "react-toastify"; // This is already included
import { DateTime } from "luxon";

const ExpenseFormDialog = ({ open, onClose, onSuccess, initialData, accounts }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  const [formData, setFormData] = useState({
    date: DateTime.now(), 
    vendor: "",
    category: "",
    amount: "",
    description: "",
    status: "Pending",
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        date: initialData.date ? DateTime.fromISO(initialData.date) : DateTime.now(),
        amount: initialData.amount,
      });
    } else {
      setFormData({
        date: DateTime.now(),
        vendor: "",
        category: "",
        amount: "",
        description: "",
        status: "Pending",
      });
    }
  }, [initialData, open]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleDateChange = (newDate) => {
    setFormData({ ...formData, date: newDate });
  };

  const handleSubmit = async () => {
    if (!formData.vendor || !formData.amount || !formData.category) {
      toast.warning("Please fill in all required fields"); // Toast is here
      return;
    }

    const payload = {
      ...formData,
      date: formData.date.toISODate(), 
    };

    try {
      if (initialData) {
        // 💡 --- FIX: Removed /api prefix ---
        await apiClient.put(`/expenses/${initialData.id}`, payload);
        toast.success("Expense updated"); // Toast is here
      } else {
        // 💡 --- FIX: Removed /api prefix ---
        await apiClient.post("/expenses", payload);
        toast.success("Expense recorded"); // Toast is here
      }
      onSuccess();
    } catch (err) {
      // 💡 This is the toast you are seeing
      toast.error(err.response?.data?.message || "Operation failed"); 
      console.error("Expense operation failed:", err);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ backgroundColor: colors.blueAccent[700], color: "white" }}>
        {initialData ? "Edit Expense" : "New Expense Claim"}
      </DialogTitle>
      <DialogContent sx={{ backgroundColor: colors.primary[400], pt: 3 }}>
        <Grid container spacing={2} mt={1}>
          <Grid item xs={6}>
            <DatePicker
              label="Date"
              value={formData.date}
              onChange={handleDateChange}
              renderInput={(params) => <TextField {...params} fullWidth />}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="Vendor / Payee"
              name="vendor"
              value={formData.vendor}
              onChange={handleChange}
              required
            />
          </Grid>
          <Grid item xs={6}>
            <FormControl fullWidth required>
              <InputLabel>Category (Account)</InputLabel>
              <Select
                name="category"
                value={formData.category}
                label="Category (Account)"
                onChange={handleChange}
              >
                {accounts.length > 0 ? (
                  accounts.map((acc) => (
                    <MenuItem key={acc.id} value={acc.account_name}>
                      {acc.account_name} ({acc.account_code})
                    </MenuItem>
                  ))
                ) : (
                  <MenuItem disabled>No Expense Accounts Found</MenuItem>
                )}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="Amount"
              name="amount"
              type="number"
              value={formData.amount}
              onChange={handleChange}
              required
              InputProps={{ inputProps: { min: 0 } }}
            />
          </Grid>
          
          {initialData && (
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  name="status"
                  value={formData.status}
                  label="Status"
                  onChange={handleChange}
                >
                  <MenuItem value="Pending">Pending</MenuItem>
                  <MenuItem value="Approved">Approved</MenuItem>
                  <MenuItem value="Paid">Paid (Posts to Ledger)</MenuItem>
                  <MenuItem value="Rejected">Rejected</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          )}

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Description"
              name="description"
              multiline
              rows={3}
              value={formData.description}
              onChange={handleChange}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ backgroundColor: colors.primary[400], p: 2 }}>
        <Button onClick={onClose} color="secondary">Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" color="secondary">
          {initialData ? "Update" : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ExpenseFormDialog;