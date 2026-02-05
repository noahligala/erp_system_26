import React from "react";
import { Box, Typography, useTheme, IconButton, Tooltip } from "@mui/material";
import { DataGrid, GridToolbar } from "@mui/x-data-grid";
import { tokens } from "../../../theme";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import { apiClient } from "../../../api/apiClient";
import { toast } from "react-toastify";

const PaymentList = ({ payments, loading, onRefresh }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  const formatMoney = (amt) => Number(amt).toLocaleString("en-KE", { style: "currency", currency: "KES" });

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this payment? This will reverse the journal entry and re-open the bill balance. This action is not reversible.")) return;
    try {
      await apiClient.delete(`/bill-payments/${id}`);
      toast.success("Payment reversed");
      onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.message || "Delete failed");
    }
  };

  const columns = [
    { field: "payment_date", headerName: "Payment Date", width: 120 },
    { field: "supplier_name", headerName: "Supplier", flex: 1, valueGetter: (val, row) => row.supplier?.name || "N/A" },
    { field: "bill_number", headerName: "Bill #", width: 120, valueGetter: (val, row) => row.bill?.bill_number || "On-Account" },
    {
      field: "amount",
      headerName: "Amount Paid",
      width: 150,
      renderCell: (params) => <Typography fontWeight="bold">{formatMoney(params.value)}</Typography>
    },
    { field: "payment_method", headerName: "Method", width: 130 },
    { field: "reference", headerName: "Reference #", flex: 1 },
    {
      field: "actions",
      headerName: "Actions",
      width: 100,
      renderCell: (params) => (
        <Box>
          <Tooltip title="Delete / Reverse Payment">
            <IconButton onClick={() => handleDelete(params.row.id)} color="error">
              <DeleteOutlinedIcon />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  return (
    <Box
      height="75vh"
      sx={{
        "& .MuiDataGrid-root": { border: "none" },
        "& .MuiDataGrid-columnHeaders": { backgroundColor: colors.blueAccent[700], borderBottom: "none" },
        "& .MuiDataGrid-virtualScroller": { backgroundColor: colors.primary[400] },
        "& .MuiDataGrid-footerContainer": { borderTop: "none", backgroundColor: colors.blueAccent[700] },
        "& .MuiDataGrid-toolbarContainer .MuiButton-text": { color: `${colors.grey[100]} !important` },
      }}
    >
      <DataGrid
        rows={payments}
        columns={columns}
        loading={loading}
        components={{ Toolbar: GridToolbar }}
        getRowId={(row) => row.id}
      />
    </Box>
  );
};

export default PaymentList;