import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Grid,
  IconButton,
} from "@mui/material";
import { DataGrid, GridToolbarContainer, GridToolbarExport } from "@mui/x-data-grid";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../../../../api/apiClient";
import jsPDF from "jspdf";
import 'jspdf-autotable';
import { Visibility, PictureAsPdf } from "@mui/icons-material";

const Invoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get("/invoices");
      const invoiceData = response.data.data || response.data || [];
      const formatted = invoiceData.map((inv) => ({
        id: inv.id,
        invoice_number: inv.invoice_number,
        customer: inv.customer?.name || "N/A",
        date: inv.invoice_date,
        total: inv.total_amount,
        status: inv.status,
        raw: inv, // Keep full invoice object for PDF export
      }));
      setInvoices(formatted);
    } catch (err) {
      console.error("Failed to fetch invoices:", err);
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  };

  const handleViewInvoice = (invoiceId) => {
    navigate(`/invoices/view/${invoiceId}`);
  };

  const handleCreateInvoice = () => {
    navigate("/sales/invoices/add-invoices");
  };

  const handleExportPDF = (invoice) => {
    const doc = new jsPDF();

    // Company info (example)
    const companyName = "Your Company Ltd";
    const companyLogoUrl = "/logo.png"; // replace with your logo path
    if (companyLogoUrl) {
      doc.addImage(companyLogoUrl, 'PNG', 14, 10, 40, 15);
    }
    doc.setFontSize(16);
    doc.text(companyName, 60, 20);

    // Invoice header
    doc.setFontSize(12);
    doc.text(`Invoice #: ${invoice.invoice_number}`, 14, 40);
    doc.text(`Date: ${invoice.date}`, 14, 46);

    // Customer info
    doc.text(`Customer: ${invoice.customer}`, 14, 56);
    if (invoice.raw.customer?.email) doc.text(`Email: ${invoice.raw.customer.email}`, 14, 62);
    if (invoice.raw.customer?.phone) doc.text(`Phone: ${invoice.raw.customer.phone}`, 14, 68);

    // Line items table
    const tableColumn = ["Description", "Quantity", "Unit Price", "Amount"];
    const tableRows = invoice.raw.lines.map(line => [
      line.description,
      line.quantity,
      line.unit_price.toFixed(2),
      line.amount.toFixed(2)
    ]);

    doc.autoTable({
      startY: 75,
      head: [tableColumn],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185] },
      styles: { fontSize: 10 },
    });

    // Totals
    const finalY = doc.lastAutoTable.finalY || 75;
    doc.setFontSize(12);
    doc.text(`Sub Total: ${invoice.raw.sub_total.toFixed(2)}`, 140, finalY + 10);
    doc.text(`Tax: ${invoice.raw.tax_amount.toFixed(2)}`, 140, finalY + 16);
    doc.setFont(undefined, "bold");
    doc.text(`Total: ${invoice.raw.total_amount.toFixed(2)}`, 140, finalY + 22);

    doc.save(`Invoice_${invoice.invoice_number}.pdf`);
  };

  const CustomToolbar = () => (
    <GridToolbarContainer>
      <GridToolbarExport />
    </GridToolbarContainer>
  );

  const columns = [
    { field: "invoice_number", headerName: "Invoice #", flex: 1 },
    { field: "customer", headerName: "Customer", flex: 1 },
    { field: "date", headerName: "Date", flex: 1 },
    { field: "total", headerName: "Total", flex: 1, type: "number" },
    { field: "status", headerName: "Status", flex: 1 },
    {
      field: "actions",
      headerName: "Actions",
      flex: 1.5,
      sortable: false,
      renderCell: (params) => (
        <Box display="flex" gap={1}>
          <IconButton color="primary" onClick={() => handleViewInvoice(params.row.id)}>
            <Visibility />
          </IconButton>
          <IconButton color="secondary" onClick={() => handleExportPDF(params.row)}>
            <PictureAsPdf />
          </IconButton>
        </Box>
      ),
    },
  ];

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" mt={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box p={2}>
      <Grid container justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5">Invoices</Typography>
        <Button variant="contained" color="primary" onClick={handleCreateInvoice}>
          Create New Invoice
        </Button>
      </Grid>

      <Box height={500}>
        <DataGrid
          rows={invoices}
          columns={columns}
          pageSizeOptions={[10, 20, 50]}
          initialState={{
            pagination: { paginationModel: { pageSize: 10, page: 0 } },
          }}
          disableRowSelectionOnClick
          density="compact"
          components={{ Toolbar: CustomToolbar }}
        />
      </Box>
    </Box>
  );
};

export default Invoices;
