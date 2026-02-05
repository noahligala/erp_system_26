// src/scenes/accounting/reports/InvoiceReports.jsx
import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  IconButton,
  Tooltip,
  CircularProgress,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  TablePagination, // 1. ADDED: For Pagination
  TextField,         // 2. ADDED: For Search Input
  InputAdornment,    // For search icon positioning
  Divider,
  Button,
  useTheme,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search"; // ADDED: Search Icon
import RefreshIcon from "@mui/icons-material/Refresh";
import PrintIcon from "@mui/icons-material/Print";
import { toast } from "react-toastify";
import { apiClient } from "../../../../api/apiClient";
import { formatCurrency } from "../../../../utils/formatCurrency";
import { globalPrint } from "../../../../utils/print";
import { tokens } from '../../../../theme';

// Define rows per page options
const ROWS_PER_PAGE_OPTIONS = [10, 25, 50, { label: 'All', value: -1 }];

const InvoiceReports = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  
  // State for data and loading
  const [allInvoices, setAllInvoices] = useState([]); // Stores all data
  const [filteredInvoices, setFilteredInvoices] = useState([]); // Stores filtered data
  const [loading, setLoading] = useState(false);
  
  // State for Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(ROWS_PER_PAGE_OPTIONS[0]);
  
  // State for Search
  const [searchTerm, setSearchTerm] = useState('');

  // ---------------------------------------------
  // FETCH INVOICE REPORT DATA
  // ---------------------------------------------
  const fetchReports = async () => {
    try {
      setLoading(true);
      // Removed unnecessary space from API endpoint
      const response = await apiClient.get("/invoices/reports/all"); 
      const data = response.data.data || [];
      setAllInvoices(data);
      setFilteredInvoices(data); // Initialize filtered data with all data
    } catch (error) {
      toast.error("Failed to fetch invoice reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  // ---------------------------------------------
  // SEARCH HANDLER (IMPROVEMENT)
  // ---------------------------------------------
  useEffect(() => {
    if (searchTerm === "") {
      setFilteredInvoices(allInvoices);
    } else {
      const lowerCaseSearch = searchTerm.toLowerCase();
      const results = allInvoices.filter(invoice => 
        invoice.invoice_number.toLowerCase().includes(lowerCaseSearch) ||
        invoice.customer?.name.toLowerCase().includes(lowerCaseSearch) ||
        invoice.status.toLowerCase().includes(lowerCaseSearch)
      );
      setFilteredInvoices(results);
      setPage(0); // Reset page to 0 after filtering
    }
  }, [searchTerm, allInvoices]);


  // ---------------------------------------------
  // PAGINATION HANDLERS (IMPROVEMENT)
  // ---------------------------------------------
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Slice data for current page view
  const displayInvoices = rowsPerPage > 0 
    ? filteredInvoices.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
    : filteredInvoices;


  // ---------------------------------------------
  // PRINT HANDLER USING globalPrint()
  // ---------------------------------------------
  const handlePrint = () => {
    const printArea = document.getElementById("invoiceReportPrintArea");
    if (!printArea) {
      toast.error("Print area not found");
      return;
    }

    globalPrint({
      title: "Invoice Report",
      // IMPORTANT: Use filteredInvoices for the print data to ensure consistency
      content: printArea.innerHTML, 
      orientation: "landscape",
      scale: 0.9,
      // IMPROVEMENT: Header/Footer HTML template is cleaner here
      header: `
        <div style="text-align:center; font-size:16px; font-weight:600;">
          Ligco Technologies<br/>
          Invoice Report
        </div>
      `,
      footer: `
        <div style="text-align:center; font-size:10px;">
          Generated on ${new Date().toLocaleString()}
        </div>
      `,
    });
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h4" fontWeight="bold" sx={{color: colors.greenAccent[500]}}>
          Invoice Reports
        </Typography>

        <Box display="flex" alignItems="center" gap={1}>
          <Tooltip title="Refresh">
            <span>
              <IconButton onClick={fetchReports} disabled={loading}>
                <RefreshIcon />
              </IconButton>
            </span>
          </Tooltip>

          <Tooltip title="Print Report">
            <span>
              <IconButton onClick={handlePrint} disabled={loading}>
                <PrintIcon />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      </Box>

      {/* IMPROVEMENT: Search Bar */}
      <Box mb={2}>
        <TextField
          label="Search Invoices"
          variant="outlined"
          fullWidth
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      <Paper elevation={2} sx={{ padding: 2 }}>
        {loading ? (
          <Box display="flex" justifyContent="center" py={5}>
            <CircularProgress />
          </Box>
        ) : (
          <Box>
            {/* IMPROVEMENT: Fixed height applied to TableContainer to enable scrolling */}
            <TableContainer sx={{ height: '70vh', maxHeight: '70vh', overflowY: 'auto' }}>
              <Table stickyHeader> {/* stickyHeader makes the TableHead always visible */}
                <TableHead>
                  <TableRow sx={{ backgroundColor: colors.greenAccent[800] }}>
                    <TableCell>Status</TableCell>
                    <TableCell>Invoice #</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Due Date</TableCell>
                    <TableCell>Customer</TableCell>
                    <TableCell>Total</TableCell>
                    <TableCell>Balance Due</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {displayInvoices.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{row.status}</TableCell>
                      <TableCell>{row.invoice_number}</TableCell>
                      <TableCell>{row.invoice_date}</TableCell>
                      <TableCell>{row.due_date}</TableCell>
                      <TableCell>{row.customer?.name || "N/A"}</TableCell>
                      <TableCell>{formatCurrency(row.total_amount)}</TableCell>
                      <TableCell>{formatCurrency(row.balance_due)}</TableCell>
                    </TableRow>
                  ))}
                  {/* Empty rows handling */}
                  {rowsPerPage > 0 && displayInvoices.length === 0 && (
                    <TableRow style={{ height: 53 * (rowsPerPage) }}>
                      <TableCell colSpan={7} align="center">
                        No invoices found for your search criteria.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            {/* IMPROVEMENT: Pagination Control */}
            <TablePagination
              rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
              component="div"
              count={filteredInvoices.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          </Box>
        )}
      </Paper>

      {/* ---------------------------------------------------------
         HIDDEN PRINT TEMPLATE - Uses filteredInvoices for printing
      ---------------------------------------------------------- */}
      <div id="invoiceReportPrintArea" style={{ display: "none" }}>
        <h2 style={{ textAlign: "center", marginBottom: "10px" }}>
          Invoice Report
        </h2>

        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
          <thead>
            <tr>
              <th style={{ border: "1px solid #ccc", padding: "6px" }}>Status</th>
              <th style={{ border: "1px solid #ccc", padding: "6px" }}>Invoice #</th>
              <th style={{ border: "1px solid #ccc", padding: "6px" }}>Date</th>
              <th style={{ border: "1px solid #ccc", padding: "6px" }}>Due Date</th>
              <th style={{ border: "1px solid #ccc", padding: "6px" }}>Customer</th>
              <th style={{ border: "1px solid #ccc", padding: "6px" }}>Total</th>
              <th style={{ border: "1px solid #ccc", padding: "6px" }}>Balance Due</th>
            </tr>
          </thead>

          <tbody>
            {/* IMPROVEMENT: Uses filteredInvoices, so printing matches the current search */}
            {filteredInvoices.map((row) => ( 
              <tr key={"p-" + row.id}>
                <td style={{ border: "1px solid #ccc", padding: "6px" }}>
                  {row.status}
                </td>
                <td style={{ border: "1px solid #ccc", padding: "6px" }}>
                  {row.invoice_number}
                </td>
                <td style={{ border: "1px solid #ccc", padding: "6px" }}>
                  {row.invoice_date}
                </td>
                <td style={{ border: "1px solid #ccc", padding: "6px" }}>
                  {row.due_date}
                </td>
                <td style={{ border: "1px solid #ccc", padding: "6px" }}>
                  {row.customer?.name || "N/A"}
                </td>
                <td style={{ border: "1px solid #ccc", padding: "6px" }}>
                  {formatCurrency(row.total_amount)}
                </td>
                <td style={{ border: "1px solid #ccc", padding: "6px" }}>
                  {formatCurrency(row.balance_due)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Box>
  );
};

export default InvoiceReports;