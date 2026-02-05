// src/scenes/accounting/sales/CreateInvoice.jsx
import React, { useState, useEffect, useCallback } from "react"; // 💡 Added useCallback
import {
  Box,
  Typography,
  TextField,
  Button,
  Grid,
  Paper,
  Divider,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Checkbox,
  FormControlLabel,
  MenuItem,
  Select,
  Link,
} from "@mui/material";
import { Add, Delete, Visibility } from "@mui/icons-material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { Autocomplete } from "@mui/material";
import { DateTime } from "luxon";
import { toast } from "react-toastify";
import { useAuth } from "../../../../api/AuthProvider";
import InvoiceView from "./InvoiceView";

const CreateInvoice = () => {
  const { user, apiClient, isAuthenticated } = useAuth() || {};

  // ---------------- STATE -----------------
  const [customersList, setCustomersList] = useState([]);
  const [productsList, setProductsList] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [newCustomerInfo, setNewCustomerInfo] = useState({ name: "", email: "", phone: "" });
  const [saveNewCustomer, setSaveNewCustomer] = useState(true);

  const [invoiceDate, setInvoiceDate] = useState(DateTime.now());
  const [dueDate, setDueDate] = useState(DateTime.now().plus({ days: 30 }));
  const [lines, setLines] = useState([{ product: null, qty: 1, price: 0, description: "" }]);
  const [invoiceNotes, setInvoiceNotes] = useState("");
  const [status, setStatus] = useState("Draft");
  
  // --- 💡 NEW STATE ---
  const [amountPaid, setAmountPaid] = useState(0); 

  const [createdInvoiceData, setCreatedInvoiceData] = useState(null);
  const [recentInvoices, setRecentInvoices] = useState([]);

  // ---------------- UTILITIES -----------------
  const formatIsoDate = (dateTime) => {
    if (!dateTime) return null;
    const dt = DateTime.isDateTime(dateTime) ? dateTime : DateTime.fromJSDate(dateTime);
    return dt.isValid ? dt.toISODate() : null;
  };

  // ---------------- FETCH CUSTOMERS + PRODUCTS -----------------
  const fetchData = useCallback(async () => { // 💡 Wrapped in useCallback
    if (!apiClient) return; // Guard against apiClient not being ready
    try {
      const [customerRes, productRes, recentRes] = await Promise.allSettled([
        apiClient.get("/customers?paginate=false"),
        apiClient.get("/products?paginate=false"),
        apiClient.get("/invoices/recent"),
      ]);

      if (customerRes.status === "fulfilled") setCustomersList(customerRes.value.data || []);
      else toast.error("Failed to fetch customers");

      if (productRes.status === "fulfilled") setProductsList(productRes.value.data || []);
      else toast.error("Failed to fetch products");

      if (recentRes.status === "fulfilled") setRecentInvoices(recentRes.value.data || []);
    } catch (error) {
      console.error("Error fetching invoice data:", error);
      toast.error("Error loading customers/products");
    }
  }, [apiClient]); // 💡 Added apiClient dependency

  useEffect(() => {
    if (isAuthenticated) fetchData();
  }, [isAuthenticated, fetchData]); // 💡 Added fetchData dependency

  // ---------------- ADD / REMOVE LINES -----------------
  const addLine = () => setLines([...lines, { product: null, qty: 1, price: 0, description: "" }]);
  const removeLine = (index) => setLines(lines.filter((_, i) => i !== index));

  // ---------------- HANDLE PRODUCT CHANGE -----------------
  const handleProductChange = (index, product) => {
    const updatedLines = [...lines];
    updatedLines[index] = {
      ...updatedLines[index],
      product,
      price: product?.unit_price || 0,
      description: product?.name || "",
    };
    setLines(updatedLines);
  };

  // ---------------- CALCULATIONS -----------------
  const calculateLineTotal = (line) => (line.qty || 0) * (line.price || 0);
  const calculateSubtotal = () => lines.reduce((sum, line) => sum + calculateLineTotal(line), 0);

  // --- 💡 NEW FUNCTION ---
  const calculateBalanceDue = () => {
    const subtotal = calculateSubtotal();
    if (status === 'Paid') {
      return 0;
    }
    if (status === 'Partially Paid') {
      const paid = Number(amountPaid) || 0;
      return subtotal - paid;
    }
    // For 'Draft' or 'Sent'
    return subtotal;
  };
  // --- END NEW FUNCTION ---

  // ---------------- SUBMIT INVOICE -----------------
  const handleSubmit = async () => {
    if (!selectedCustomer && !newCustomerInfo.name) {
      toast.error("Please select or enter a customer.");
      return;
    }

    const validLines = lines.filter(
      (line) => (line.product || line.description) && line.qty > 0 && line.price >= 0
    );

    if (validLines.length === 0) {
      toast.error("Add at least one valid line item.");
      return;
    }

    // --- 💡 UPDATED LOGIC ---
    const subtotal = calculateSubtotal();
    const paid = Number(amountPaid) || 0;
    let finalAmountPaid = 0;

    if (status === 'Paid') {
      finalAmountPaid = subtotal;
    } else if (status === 'Partially Paid') {
      if (paid <= 0) {
        toast.error("For 'Partially Paid' status, please enter a valid Amount Paid.");
        return;
      }
      if (paid >= subtotal) {
        toast.error("For 'Partially Paid' status, amount paid must be less than the total.");
        return;
      }
      finalAmountPaid = paid;
    }
    // --- END UPDATED LOGIC ---

    const payload = {
      invoice_date: formatIsoDate(invoiceDate),
      due_date: formatIsoDate(dueDate),
      notes: invoiceNotes,
      status,
      amount_paid: finalAmountPaid, // 💡 SEND THE CALCULATED AMOUNT
      lines: validLines.map((line) => ({
        product_id: line.product?.id || null,
        description: line.description || "N/A",
        quantity: line.qty,
        unit_price: line.price,
      })),
    };

    if (selectedCustomer?.id) {
      payload.customer_id = selectedCustomer.id;
    } else {
      payload.customer_info = { ...newCustomerInfo, save: saveNewCustomer };
    }

    try {
      const response = await apiClient.post("/invoices", payload);
      const invoice = response.data.data;
      const recent = response.data.recent;
      
      if (!invoice?.id) {
        toast.error("Invoice created but no ID returned!");
        return;
      }
      
      setCreatedInvoiceData(invoice);
      setRecentInvoices(recent || []);
      toast.success("Invoice created successfully!");
    } catch (error) {
      console.error("Error creating invoice:", error);
      toast.error(error.response?.data?.message || "Failed to create invoice.");
    }
  };

  // ---------------- VIEW PDF -----------------
  const handleViewInvoice = (invoiceId) => {
    // This probably needs to be a link to a PDF generation route,
    // but for now, it just re-opens the invoice view.
    window.open(`/invoices/${invoiceId}`, "_blank"); 
  };

  // ---------------- RENDER -----------------
  return (
    <Box>
      <Typography variant="h5" mb={2}>
        Create New Invoice
      </Typography>

      <Paper sx={{ p: 3 }}>
        {/* CUSTOMER + DATES + STATUS */}
        <Grid container spacing={2}>
          {/* ... (Customer Autocomplete and New Customer fields are unchanged) ... */}
          <Grid item xs={12} md={6}>
            <Autocomplete
              freeSolo
              options={customersList}
              getOptionLabel={(option) => (typeof option === "string" ? option : option.name || "")}
              isOptionEqualToValue={(option, value) => option?.id === value?.id}
              value={selectedCustomer}
              onChange={(_, newValue) => {
                if (typeof newValue === "string") {
                  setSelectedCustomer(null);
                  setNewCustomerInfo({ ...newCustomerInfo, name: newValue });
                } else {
                  setSelectedCustomer(newValue);
                  setNewCustomerInfo({
                    name: newValue?.name || "",
                    email: newValue?.email || "",
                    phone: newValue?.phone || "",
                  });
                }
              }}
              renderInput={(params) => <TextField {...params} label="Customer" fullWidth />}
            />

            {!selectedCustomer && (
              <Box mt={1}>
                <TextField
                  label="Email (optional)"
                  fullWidth
                  value={newCustomerInfo.email}
                  onChange={(e) => setNewCustomerInfo({ ...newCustomerInfo, email: e.target.value })}
                />
                <TextField
                  label="Phone (optional)"
                  fullWidth
                  value={newCustomerInfo.phone}
                  onChange={(e) => setNewCustomerInfo({ ...newCustomerInfo, phone: e.target.value })}
                  sx={{ mt: 1 }}
                />
                <FormControlLabel
                  control={<Checkbox checked={saveNewCustomer} onChange={(e) => setSaveNewCustomer(e.target.checked)} />}
                  label="Save customer after creating invoice"
                />
              </Box>
            )}
          </Grid>

          <Grid item xs={6} md={2}>
            <DatePicker
              label="Invoice Date"
              value={invoiceDate}
              onChange={(newValue) => setInvoiceDate(newValue)}
              renderInput={(params) => <TextField {...params} fullWidth />}
            />
          </Grid>
          <Grid item xs={6} md={2}>
            <DatePicker
              label="Due Date"
              value={dueDate}
              onChange={(newValue) => setDueDate(newValue)}
              renderInput={(params) => <TextField {...params} fullWidth />}
            />
          </Grid>

          <Grid item xs={6} md={2}>
            <TextField
              select
              label="Status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              fullWidth
            >
              <MenuItem value="Draft">Draft</MenuItem>
              <MenuItem value="Sent">Sent</MenuItem>
              {/* 💡 Renamed to match your DB enum */}
              <MenuItem value="Partially Paid">Partially Paid</MenuItem>
              <MenuItem value="Paid">Paid</MenuItem>
            </TextField>
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        {/* ... (Invoice Lines Table is unchanged) ... */}
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Product</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Qty</TableCell>
                <TableCell>Unit Price</TableCell>
                <TableCell>Total</TableCell>
                <TableCell>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {lines.map((line, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Autocomplete
                      options={productsList}
                      getOptionLabel={(option) => option?.name || ""}
                      isOptionEqualToValue={(o, v) => o?.id === v?.id}
                      value={line.product}
                      onChange={(_, newValue) => handleProductChange(index, newValue)}
                      renderInput={(params) => <TextField {...params} label="Product" />}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      value={line.description}
                      onChange={(e) => {
                        const updated = [...lines];
                        updated[index].description = e.target.value;
                        setLines(updated);
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      type="number"
                      value={line.qty}
                      onChange={(e) => {
                        const updated = [...lines];
                        updated[index].qty = Number(e.target.value);
                        setLines(updated);
                      }}
                      inputProps={{ min: 1 }}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      type="number"
                      value={line.price}
                      onChange={(e) => {
                        const updated = [...lines];
                        updated[index].price = Number(e.target.value);
                        setLines(updated);
                      }}
                      inputProps={{ min: 0 }}
                    />
                  </TableCell>
                  <TableCell>{calculateLineTotal(line).toFixed(2)}</TableCell>
                  <TableCell>
                    <Tooltip title="Remove Line">
                      <IconButton onClick={() => removeLine(index)}>
                        <Delete color="error" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Button variant="outlined" startIcon={<Add />} onClick={addLine} sx={{ mt: 2 }}>
          Add Line
        </Button>

        <Divider sx={{ my: 3 }} />

        {/* NOTES + TOTALS */}
        <Grid container spacing={2}>
          <Grid item xs={12} md={8}>
            <TextField
              label="Notes"
              value={invoiceNotes}
              onChange={(e) => setInvoiceNotes(e.target.value)}
              multiline
              rows={4}
              fullWidth
            />
          </Grid>
          
          {/* --- 💡 UPDATED TOTALS BLOCK --- */}
          <Grid item xs={12} md={4}>
            <Typography variant="h6">Subtotal: {calculateSubtotal().toFixed(2)}</Typography>
            
            {/* 💡 CONDITIONAL AMOUNT PAID FIELD */}
            {status === 'Partially Paid' && (
              <TextField
                label="Amount Paid"
                type="number"
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                fullWidth
                sx={{ mt: 2 }}
              />
            )}
            
            {/* 💡 DYNAMIC BALANCE DUE */}
            <Typography variant="h5" sx={{ mt: 1, fontWeight: 'bold' }}>
              Balance Due: {calculateBalanceDue().toFixed(2)}
            </Typography>
          </Grid>
          {/* --- END UPDATED BLOCK --- */}

        </Grid>

        <Divider sx={{ my: 3 }} />

        {/* ... (Action Buttons, Preview, and Recent Invoices are unchanged) ... */}
        <Box display="flex" gap={2} flexWrap="wrap">
          <Button variant="contained" color="primary" onClick={handleSubmit}>
            Save Invoice
          </Button>
          <Button
            variant="outlined"
            color="secondary"
            startIcon={<Visibility />}
            onClick={() => handleViewInvoice(createdInvoiceData?.id)}
            disabled={!createdInvoiceData}
          >
            View PDF
          </Button>
        </Box>
      </Paper>

      {createdInvoiceData && (
        <Box mt={4}>
          <InvoiceView invoiceData={createdInvoiceData} />
        </Box>
      )}

      {recentInvoices.length > 0 && (
        <Paper sx={{ p: 3, mt: 4 }}>
          <Typography variant="h6" mb={2} color="white">
            Recent Invoices
          </Typography>
          <Box display="flex" flexDirection="column" gap={1}>
            {recentInvoices.map((inv) => (
              <Link
                key={inv.id}
                href="#"
                onClick={() => handleViewInvoice(inv.id)}
                underline="hover"
                color="white"
              >
                #{inv.invoice_number} — {inv.customer?.name || "Unknown"} ({inv.status})
              </Link>
            ))}
          </Box>
        </Paper>
      )}
    </Box>
  );
};

export default CreateInvoice;