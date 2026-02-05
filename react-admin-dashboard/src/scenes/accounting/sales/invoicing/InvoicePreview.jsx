// src/scenes/accounting/sales/InvoicePreview.jsx
import React from "react";
import {
  Box,
  Typography,
  Divider,
  Grid,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from "@mui/material";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const InvoicePreview = ({ invoiceData }) => {
  // Sample fallback data
  const firmDetails = {
    firmName: "Ligco Advocates LLP",
    kraPin: "P051234567Q",
    vatPin: "V12345678",
    logo: "/assets/logo.png", // replace with actual firm logo path or blob
    address: "P.O Box 12345 - 00100, Nairobi, Kenya",
    email: "info@ligcoadvocates.co.ke",
    phone: "+254 712 345 678",
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF("p", "pt", "a4");

    // Header
    doc.setFontSize(16);
    doc.text(firmDetails.firmName, 40, 50);
    doc.setFontSize(10);
    doc.text(`KRA PIN: ${firmDetails.kraPin}`, 40, 65);
    doc.text(`VAT PIN: ${firmDetails.vatPin}`, 40, 78);
    doc.text(`${firmDetails.address}`, 40, 91);
    doc.text(`${firmDetails.email} | ${firmDetails.phone}`, 40, 104);

    // Invoice title and client info
    doc.setFontSize(14);
    doc.text("INVOICE", 450, 50);
    doc.setFontSize(10);
    doc.text(`Invoice No: ${invoiceData.invoiceNumber}`, 450, 65);
    doc.text(`Date: ${invoiceData.date}`, 450, 78);

    // Client details
    doc.setFontSize(12);
    doc.text("Bill To:", 40, 130);
    doc.setFontSize(10);
    doc.text(invoiceData.clientName, 40, 145);
    doc.text(invoiceData.clientAddress, 40, 158);

    // Table
    const tableData = invoiceData.items.map((item) => [
      item.description,
      item.quantity,
      item.unitPrice.toLocaleString(),
      (item.quantity * item.unitPrice).toLocaleString(),
    ]);

    autoTable(doc, {
      startY: 180,
      head: [["Description", "Qty", "Unit Price (Ksh)", "Total (Ksh)"]],
      body: tableData,
    });

    // Totals
    const subtotal = invoiceData.items.reduce(
      (sum, i) => sum + i.quantity * i.unitPrice,
      0
    );
    const tax = subtotal * 0.16; // 16% VAT example
    const total = subtotal + tax;

    doc.text(`Subtotal: Ksh ${subtotal.toLocaleString()}`, 400, doc.lastAutoTable.finalY + 20);
    doc.text(`VAT (16%): Ksh ${tax.toLocaleString()}`, 400, doc.lastAutoTable.finalY + 35);
    doc.text(`Total: Ksh ${total.toLocaleString()}`, 400, doc.lastAutoTable.finalY + 50);

    // Footer note
    doc.setFontSize(9);
    doc.text(
      "Thank you for your business.",
      40,
      doc.lastAutoTable.finalY + 80
    );
    doc.text(
      "Payment is due within 30 days. Please include invoice number in all correspondence.",
      40,
      doc.lastAutoTable.finalY + 95
    );

    doc.save(`${invoiceData.invoiceNumber}.pdf`);
  };

  return (
    <Box p={4}>
      {/* Firm Header */}
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={8}>
          <Typography variant="h5" fontWeight="bold">
            {firmDetails.firmName}
          </Typography>
          <Typography variant="body2">KRA PIN: {firmDetails.kraPin}</Typography>
          <Typography variant="body2">VAT PIN: {firmDetails.vatPin}</Typography>
          <Typography variant="body2">{firmDetails.address}</Typography>
          <Typography variant="body2">
            {firmDetails.email} | {firmDetails.phone}
          </Typography>
        </Grid>
        <Grid item xs={4} textAlign="right">
          <img
            src={firmDetails.logo}
            alt="Firm Logo"
            style={{ width: 100, height: "auto" }}
          />
        </Grid>
      </Grid>

      <Divider sx={{ my: 2 }} />

      {/* Invoice Info */}
      <Grid container justifyContent="space-between">
        <Grid item>
          <Typography variant="subtitle1" fontWeight="bold">
            Bill To:
          </Typography>
          <Typography>{invoiceData.clientName}</Typography>
          <Typography>{invoiceData.clientAddress}</Typography>
        </Grid>
        <Grid item>
          <Typography>Invoice No: {invoiceData.invoiceNumber}</Typography>
          <Typography>Date: {invoiceData.date}</Typography>
        </Grid>
      </Grid>

      {/* Items Table */}
      <TableContainer component={Paper} sx={{ my: 3 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Description</TableCell>
              <TableCell>Qty</TableCell>
              <TableCell>Unit Price (Ksh)</TableCell>
              <TableCell>Total (Ksh)</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {invoiceData.items.map((item, index) => (
              <TableRow key={index}>
                <TableCell>{item.description}</TableCell>
                <TableCell>{item.quantity}</TableCell>
                <TableCell>{item.unitPrice.toLocaleString()}</TableCell>
                <TableCell>
                  {(item.quantity * item.unitPrice).toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Totals */}
      <Box textAlign="right" pr={2}>
        <Typography>
          Subtotal:{" "}
          {invoiceData.items
            .reduce((sum, i) => sum + i.quantity * i.unitPrice, 0)
            .toLocaleString()}
        </Typography>
        <Typography>VAT (16%): {(invoiceData.tax || 0).toLocaleString()}</Typography>
        <Typography fontWeight="bold">
          Total: {invoiceData.total.toLocaleString()}
        </Typography>
      </Box>

      {/* Footer */}
      <Divider sx={{ my: 2 }} />
      <Typography variant="body2">
        Thank you for your business. Payment is due within 30 days.
      </Typography>

      <Box mt={3}>
        <Button variant="contained" color="primary" onClick={handleDownloadPDF}>
          Download PDF
        </Button>
      </Box>
    </Box>
  );
};

export default InvoicePreview;
