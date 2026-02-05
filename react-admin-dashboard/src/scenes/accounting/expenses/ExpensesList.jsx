import React, { useState } from "react";
import { Box, Typography, useTheme, Chip, IconButton, Tooltip } from "@mui/material";
import { DataGrid, GridToolbar } from "@mui/x-data-grid";
import { tokens } from "../../../theme";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import ExpenseFormDialog from "./ExpenseFormDialog";
import { apiClient } from "../../../api/apiClient";
import { toast } from "react-toastify";

const ExpensesList = ({ expenses, loading, onRefresh, accounts }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  const [editData, setEditData] = useState(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // --- Handlers ---
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this expense?")) return;
    try {
      await apiClient.delete(`/api/expenses/${id}`);
      toast.success("Expense deleted");
      onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.message || "Delete failed");
    }
  };

  const handleEdit = (row) => {
    setEditData(row);
    setIsEditDialogOpen(true);
  };

  // --- Columns ---
  const columns = [
    { field: "date", headerName: "Date", width: 100 },
    { field: "vendor", headerName: "Vendor", flex: 1, cellClassName: "name-column--cell" },
    { 
      field: "category", 
      headerName: "Category", 
      flex: 1,
      renderCell: ({ value }) => (
        <Typography color={colors.greenAccent[500]}>{value}</Typography>
      )
    },
    {
      field: "amount",
      headerName: "Amount",
      width: 120,
      renderCell: (params) => (
        <Typography fontWeight="bold">
          {Number(params.value).toLocaleString("en-KE", { style: "currency", currency: "KES" })}
        </Typography>
      ),
    },
    {
      field: "status",
      headerName: "Status",
      width: 120,
      renderCell: ({ value }) => {
        const statusColors = {
          Pending: "default",
          Approved: "info",
          Paid: "success",
          Rejected: "error",
        };
        return (
          <Chip 
            label={value} 
            color={statusColors[value] || "default"} 
            size="small" 
            variant="outlined" 
            sx={{ fontWeight: "bold" }}
          />
        );
      },
    },
    // 💡 --- THIS IS THE FIX ---
    { 
      field: "user_name", 
      headerName: "Submitted By", 
      width: 150, 
      // The getter receives (value, row), not (params)
      valueGetter: (value, row) => row.user?.name || "-" 
    },
    // 💡 --- END OF FIX ---
    {
      field: "actions",
      headerName: "Actions",
      width: 100,
      renderCell: (params) => (
        <Box>
          <Tooltip title="Edit">
            <IconButton onClick={() => handleEdit(params.row)}>
              <EditOutlinedIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
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
        "& .MuiDataGrid-cell": { borderBottom: "none" },
        "& .name-column--cell": { color: colors.greenAccent[300] },
        "& .MuiDataGrid-columnHeaders": { backgroundColor: colors.blueAccent[700], borderBottom: "none" },
        "& .MuiDataGrid-virtualScroller": { backgroundColor: colors.primary[400] },
        "& .MuiDataGrid-footerContainer": { borderTop: "none", backgroundColor: colors.blueAccent[700] },
        "& .MuiCheckbox-root": { color: `${colors.greenAccent[200]} !important` },
        "& .MuiDataGrid-toolbarContainer .MuiButton-text": { color: `${colors.grey[100]} !important` },
      }}
    >
      <DataGrid
        rows={expenses}
        columns={columns}
        loading={loading}
        components={{ Toolbar: GridToolbar }}
        getRowId={(row) => row.id}
      />

      {/* Edit Dialog */}
      {editData && (
        <ExpenseFormDialog
          open={isEditDialogOpen}
          onClose={() => {
            setIsEditDialogOpen(false);
            setEditData(null);
          }}
          onSuccess={() => {
            onRefresh();
            setIsEditDialogOpen(false);
            setEditData(null);
          }}
          initialData={editData}
          accounts={accounts}
        />
      )}
    </Box>
  );
};

export default ExpensesList;