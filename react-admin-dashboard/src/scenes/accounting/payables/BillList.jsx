import React from "react";
import { Box, Typography, useTheme, Chip, IconButton, Tooltip } from "@mui/material";
import { DataGrid, GridToolbar } from "@mui/x-data-grid";
import { tokens } from "../../../theme";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import { apiClient } from "../../../api/apiClient";
import { toast } from "react-toastify";

const BillList = ({ bills, loading, onRefresh }) => {
    const theme = useTheme();
    const colors = tokens(theme.palette.mode);

    const formatMoney = (amt) => Number(amt).toLocaleString("en-KE", { style: "currency", currency: "KES" });

    const handleDelete = async (id, status) => {
        if (status !== 'Draft') {
        toast.error("Only 'Draft' bills can be deleted.");
        return;
        }
        if (!window.confirm("Delete this draft bill?")) return;
        try {
        await apiClient.delete(`/bills/${id}`);
        toast.success("Bill deleted");
        onRefresh();
        } catch (err) {
        toast.error(err.response?.data?.message || "Delete failed");
        }
    };

    const columns = [
        { field: "bill_number", headerName: "Bill #", width: 120 },
        { field: "supplier_name", headerName: "Supplier", flex: 1, valueGetter: (val, row) => row.supplier?.name || "N/A" },
        { field: "bill_date", headerName: "Bill Date", width: 100 },
        { field: "due_date", headerName: "Due Date", width: 100 },
        {
        field: "amount",
        headerName: "Total Amount",
        width: 150,
        renderCell: (params) => <Typography>{formatMoney(params.value)}</Typography>
        },
        {
        field: "balance_due",
        headerName: "Balance",
        width: 150,
        renderCell: (params) => <Typography fontWeight="bold">{formatMoney(params.value)}</Typography>
        },
        {
        field: "status",
        headerName: "Status",
        width: 120,
        renderCell: ({ value }) => {
            const statusColors = {
            Draft: "default",
            Posted: "warning",
            "Partially Paid": "info",
            Paid: "success",
            Overdue: "error",
            };
            return <Chip label={value} color={statusColors[value] || "default"} size="small" variant="outlined" />;
        },
        },
        {
        field: "actions",
        headerName: "Actions",
        width: 100,
        renderCell: (params) => (
            <Box>
            <Tooltip title="Delete Bill">
                <span>
                <IconButton 
                    onClick={() => handleDelete(params.row.id, params.row.status)} 
                    color="error"
                    disabled={params.row.status !== 'Draft'}
                >
                    <DeleteOutlinedIcon />
                </IconButton>
                </span>
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
            rows={bills}
            columns={columns}
            loading={loading}
            components={{ Toolbar: GridToolbar }}
            getRowId={(row) => row.id}
        />
        </Box>
    );
};

export default BillList;