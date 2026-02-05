import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Divider,
  Grid,
  Button,
  CircularProgress,
} from "@mui/material";
import { useParams, useNavigate } from "react-router-dom";
import { apiClient } from "../../../../api/apiClient";
import { toast } from "react-toastify";
import { Print } from "@mui/icons-material";

const InvoiceView = ({ invoiceData }) => {
  const { id: paramId } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(invoiceData || null);
  const [loading, setLoading] = useState(!invoiceData);

  // Fetch invoice if not passed via props
  useEffect(() => {
    const invoiceId = invoiceData?.id || paramId;
    if (!invoiceId) {
      toast.error("Invoice ID not provided");
      setLoading(false);
      return;
    }

    const fetchInvoice = async () => {
      try {
        setLoading(true);
        const res = await apiClient.get(`/invoices/${invoiceId}`);
        const data = res.data.data || res.data; // support different API shapes
        setInvoice(data);
      } catch (err) {
        console.error("Error fetching invoice:", err);
        toast.error("Failed to load invoice details");
      } finally {
        setLoading(false);
      }
    };

    if (!invoiceData) fetchInvoice();
  }, [invoiceData, paramId]);

  const handlePrint = () => window.print();

  if (loading)
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="80vh">
        <CircularProgress />
      </Box>
    );

  if (!invoice)
    return (
      <Box textAlign="center" mt={10}>
        <Typography variant="h6" color="error">
          Invoice not found
        </Typography>
        <Button onClick={() => navigate(-1)} sx={{ mt: 2 }}>
          Go Back
        </Button>
      </Box>
    );

  const {
    invoice_number,
    customer,
    invoice_date,
    due_date,
    status,
    lines,
    sub_total,
    tax_amount,
    total_amount,
    notes,
  } = invoice;

  return (
    <Box p={3}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: "12px" }}>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h5" fontWeight="bold">
              Invoice #{invoice_number}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Status:{" "}
              <span
                style={{
                  color:
                    status === "Paid"
                      ? "green"
                      : status === "Pending"
                      ? "orange"
                      : "red",
                  fontWeight: 600,
                }}
              >
                {status}
              </span>
            </Typography>
          </Box>
          <Button variant="contained" startIcon={<Print />} onClick={handlePrint}>
            Print / Save PDF
          </Button>
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* Customer Info */}
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Billed To:
            </Typography>
            <Typography>{customer?.name}</Typography>
            <Typography>{customer?.email}</Typography>
            <Typography>{customer?.phone}</Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Invoice Details:
            </Typography>
            <Typography>Issue Date: {invoice_date}</Typography>
            <Typography>Due Date: {due_date}</Typography>
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        {/* Invoice Items */}
        <Box component="div" sx={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "20px" }}>
            <thead>
              <tr style={{ background: "#f5f5f5", textAlign: "left", borderBottom: "2px solid #ddd" }}>
                <th style={{ padding: "8px" }}>#</th>
                <th style={{ padding: "8px" }}>Description</th>
                <th style={{ padding: "8px" }}>Qty</th>
                <th style={{ padding: "8px" }}>Unit Price</th>
                <th style={{ padding: "8px" }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {lines && lines.length > 0 ? (
                lines.map((line, index) => (
                  <tr key={index} style={{ borderBottom: "1px solid #eee" }}>
                    <td style={{ padding: "8px" }}>{index + 1}</td>
                    <td style={{ padding: "8px" }}>{line.description}</td>
                    <td style={{ padding: "8px" }}>{line.quantity}</td>
                    <td style={{ padding: "8px" }}>{Number(line.unit_price).toLocaleString()}</td>
                    <td style={{ padding: "8px" }}>{Number(line.amount).toLocaleString()}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" style={{ textAlign: "center", padding: "20px" }}>
                    No items found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Box>

        {/* Totals */}
        <Box display="flex" justifyContent="flex-end" mt={3}>
          <Box width="300px">
            <Typography display="flex" justifyContent="space-between">
              <span>Subtotal:</span>
              <strong>{sub_total?.toLocaleString()}</strong>
            </Typography>
            <Typography display="flex" justifyContent="space-between">
              <span>Tax:</span>
              <strong>{tax_amount?.toLocaleString()}</strong>
            </Typography>
            <Divider sx={{ my: 1 }} />
            <Typography variant="h6" display="flex" justifyContent="space-between">
              <span>Total:</span>
              <span>{total_amount?.toLocaleString()}</span>
            </Typography>
          </Box>
        </Box>

        {/* Notes */}
        {notes && (
          <>
            <Divider sx={{ my: 3 }} />
            <Box>
              <Typography variant="subtitle2">Notes:</Typography>
              <Typography>{notes}</Typography>
            </Box>
          </>
        )}

        {/* Footer */}
        <Divider sx={{ my: 3 }} />
        <Box textAlign="center">
          <Typography variant="body2" color="text.secondary">
            Thank you for your business!
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
};

export default InvoiceView;
