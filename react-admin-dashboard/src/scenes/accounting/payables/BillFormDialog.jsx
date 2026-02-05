import React, { useState, useEffect } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, MenuItem, Grid, 
  useTheme, FormControl, InputLabel, Select, IconButton, Box, Typography
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { tokens } from "../../../theme";
import { apiClient } from "../../../api/apiClient";
import { toast } from "react-toastify";
import { DateTime } from "luxon";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";

const BillFormDialog = ({ open, onClose, onSuccess, suppliers, expenseAccounts }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  const [formData, setFormData] = useState({
    supplier_id: "",
    bill_number: "",
    bill_date: DateTime.now(),
    due_date: DateTime.now().plus({ days: 30 }),
    status: "Posted",
  });

  const [lines, setLines] = useState([
    { chart_of_account_id: "", description: "", quantity: 1, unit_price: "" }
  ]);

  const resetForm = () => {
    setFormData({
      supplier_id: "", bill_number: "", bill_date: DateTime.now(),
      due_date: DateTime.now().plus({ days: 30 }), status: "Posted",
    });
    setLines([{ chart_of_account_id: "", description: "", quantity: 1, unit_price: "" }]);
  };

  const handleHeaderChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };
  
  const handleLineChange = (index, e) => {
    const updatedLines = [...lines];
    updatedLines[index][e.target.name] = e.target.value;
    setLines(updatedLines);
  };
  
  const addLine = () => {
    setLines([...lines, { chart_of_account_id: "", description: "", quantity: 1, unit_price: "" }]);
  };

  const removeLine = (index) => {
    if (lines.length <= 1) return; // Must have at least one line
    const updatedLines = lines.filter((_, i) => i !== index);
    setLines(updatedLines);
  };

  const handleSubmit = async () => {
    if (!formData.supplier_id || !formData.bill_number) {
      toast.warning("Please fill in Supplier and Bill Number.");
      return;
    }

    const payload = {
      ...formData,
      bill_date: formData.bill_date.toISODate(),
      due_date: formData.due_date.toISODate(),
      lines: lines.filter(l => l.unit_price > 0 && l.chart_of_account_id), // Filter valid lines
    };

    if (payload.lines.length === 0) {
      toast.error("You must add at least one valid line with an account and price.");
      return;
    }

    try {
      await apiClient.post("/bills", payload);
      toast.success("Supplier Bill created and posted to ledger!");
      resetForm();
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.message || "Operation failed");
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ backgroundColor: colors.blueAccent[700], color: "white" }}>
        Enter New Supplier Bill
      </DialogTitle>
      <DialogContent sx={{ backgroundColor: colors.primary[400], pt: 3 }}>
        <Grid container spacing={2} mt={1}>
          {/* Header Fields */}
          <Grid item xs={12} md={6}>
            <FormControl fullWidth required>
              <InputLabel>Supplier</InputLabel>
              <Select name="supplier_id" value={formData.supplier_id} label="Supplier" onChange={handleHeaderChange}>
                {suppliers.map((s) => (<MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={6}><TextField fullWidth label="Bill / Invoice #" name="bill_number" value={formData.bill_number} onChange={handleHeaderChange} required /></Grid>
          <Grid item xs={12} md={4}><DatePicker label="Bill Date" value={formData.bill_date} onChange={(d) => setFormData(f => ({...f, bill_date: d}))} renderInput={(p) => <TextField {...p} fullWidth />} /></Grid>
          <Grid item xs={12} md={4}><DatePicker label="Due Date" value={formData.due_date} onChange={(d) => setFormData(f => ({...f, due_date: d}))} renderInput={(p) => <TextField {...p} fullWidth />} /></Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth><InputLabel>Status</InputLabel>
              <Select name="status" value={formData.status} label="Status" onChange={handleHeaderChange}>
                <MenuItem value="Posted">Post to Ledger</MenuItem>
                <MenuItem value="Draft">Save as Draft</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        <Typography variant="h6" mt={3} mb={1}>Bill Lines (Expenses)</Typography>
        
        {/* Line Items */}
        {lines.map((line, index) => (
          <Grid container spacing={1} key={index} alignItems="center" mb={1}>
            <Grid item xs={4}>
              <FormControl fullWidth><InputLabel>Expense Account</InputLabel>
                <Select
                  name="chart_of_account_id"
                  value={line.chart_of_account_id}
                  label="Expense Account"
                  onChange={(e) => handleLineChange(index, e)}
                >
                  {expenseAccounts.map((acc) => (<MenuItem key={acc.id} value={acc.id}>{acc.account_name} ({acc.account_code})</MenuItem>))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={3}><TextField fullWidth label="Description" name="description" value={line.description} onChange={(e) => handleLineChange(index, e)} /></Grid>
            <Grid item xs={2}><TextField fullWidth label="Qty" name="quantity" type="number" value={line.quantity} onChange={(e) => handleLineChange(index, e)} /></Grid>
            <Grid item xs={2}><TextField fullWidth label="Unit Price" name="unit_price" type="number" value={line.unit_price} onChange={(e) => handleLineChange(index, e)} /></Grid>
            <Grid item xs={1}>
              <IconButton onClick={() => removeLine(index)} color="error" disabled={lines.length <= 1}>
                <DeleteIcon />
              </IconButton>
            </Grid>
          </Grid>
        ))}
        <Button startIcon={<AddIcon />} onClick={addLine} size="small" sx={{ mt: 1 }}>Add Line</Button>
        
      </DialogContent>
      <DialogActions sx={{ backgroundColor: colors.primary[400], p: 2 }}>
        <Button onClick={onClose} color="secondary">Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" color="secondary">
          Save Bill
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default BillFormDialog;