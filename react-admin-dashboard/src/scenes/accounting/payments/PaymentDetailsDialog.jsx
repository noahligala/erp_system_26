// src/scenes/accounting/payments/PaymentDetailsDialog.jsx (Component Code)
import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Grid,
  Divider,
  Chip,
  Box, // Box import added for completeness
} from "@mui/material";

const PaymentDetailsDialog = ({ open, onClose, payment }) => {
  if (!payment) return null;

  // Safely access relationships provided by the backend
  const invoice = payment?.invoice || null;
  const cashAccount = payment?.cashAccount || null;
  const journalEntry = payment?.journalEntry || null;

  // Calculate how much has been paid on the invoice in total
  const invoiceTotalPaid =
    invoice && invoice.amount_paid != null ? invoice.amount_paid : 0;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: "bold" }}>
        Payment Details #{payment.id}
      </DialogTitle>

      <DialogContent dividers>
        <Grid container spacing={2}>
          {/* --- ROW 1: Customer & Date --- */}
          <Grid item xs={6}>
            <Typography variant="subtitle2" color="text.secondary">
              Customer
            </Typography>
            <Typography variant="body1">
              {payment.customer?.name || "N/A"}
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="subtitle2" color="text.secondary">
              Payment Date
            </Typography>
            <Typography variant="body1">{payment.payment_date}</Typography>
          </Grid>

          {/* --- ROW 2: Method & Reference --- */}
          <Grid item xs={6}>
            <Typography variant="subtitle2" color="text.secondary">
              Payment Method
            </Typography>
            <Typography variant="body1">{payment.method}</Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="subtitle2" color="text.secondary">
              Reference
            </Typography>
            <Typography variant="body1">{payment.reference || "-"}</Typography>
          </Grid>

          <Grid item xs={12}>
            <Divider sx={{ my: 1 }} />
          </Grid>

          {/* --- ROW 3: FINANCIALS --- */}
          <Grid item xs={6}>
            <Typography variant="subtitle2" color="text.secondary">
              Amount Applied
            </Typography>
            <Typography variant="h6" color="success.main" fontWeight="bold">
              Ksh {parseFloat(payment.amount).toLocaleString()}
            </Typography>
          </Grid>

          {/* FIX: This grid item now receives the account_code from the backend */}
          <Grid item xs={6}>
            <Typography variant="subtitle2" color="text.secondary">
              Received Into (GL Account)
            </Typography>
            <Typography variant="body1" fontWeight="medium">
              {cashAccount
                ? `${cashAccount.account_name}${
                    cashAccount.account_code ? ` (${cashAccount.account_code})` : ""
                  }`
                : "N/A"}
            </Typography>
          </Grid>

          {/* --- ROW 4: INVOICE DETAILS (If Linked) --- */}
          {invoice && (
            <Grid item xs={12}>
              <Box
                sx={{
                  bgcolor: "background.neutral",
                  p: 2,
                  borderRadius: 1,
                  mt: 1,
                  border: "1px dashed grey",
                }}
              >
                <Typography
                  variant="subtitle2"
                  color="primary"
                  gutterBottom
                  fontWeight="bold"
                >
                  Linked Invoice #{invoice.invoice_number}
                </Typography>

                <Grid container spacing={1}>
                  <Grid item xs={4}>
                    <Typography variant="caption" color="text.secondary">
                      Total Invoice
                    </Typography>
                    <Typography variant="body2">
                      Ksh {parseFloat(invoice.total_amount).toLocaleString()}
                    </Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="caption" color="text.secondary">
                      Total Paid
                    </Typography>
                    <Typography variant="body2">
                      Ksh {parseFloat(invoiceTotalPaid).toLocaleString()}
                    </Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="caption" color="text.secondary">
                      Balance Due
                    </Typography>
                    <Typography
                      variant="body2"
                      color="error.main"
                      fontWeight="bold"
                    >
                      Ksh {parseFloat(invoice.balance_due).toLocaleString()}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
            </Grid>
          )}

          {/* --- ROW 5: JOURNAL ENTRY (Audit Trail) --- */}
          {journalEntry && (
            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                    <Typography variant="subtitle2" color="text.secondary">
                        Ledger Posting
                    </Typography>
                    <Typography variant="body2">
                        Journal Entry ID: <strong>{journalEntry.id}</strong>
                    </Typography>
                </Box>
                <Chip label="Posted" color="success" size="small" variant="outlined" />
              </Box>
              <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                {journalEntry.description}
              </Typography>
            </Grid>
          )}

          {/* --- ROW 6: NOTES --- */}
          {payment.notes && (
            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle2" color="text.secondary">
                Notes
              </Typography>
              <Typography variant="body2" style={{ whiteSpace: 'pre-wrap' }}>
                {payment.notes}
              </Typography>
            </Grid>
          )}
        </Grid>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} variant="contained" color="primary">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PaymentDetailsDialog;