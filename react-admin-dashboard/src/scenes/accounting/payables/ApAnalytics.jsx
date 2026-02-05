import React, { useMemo } from "react";
import { Box, Grid, Paper, Typography, useTheme } from "@mui/material";
import { DataGrid, GridToolbar } from "@mui/x-data-grid";
import { tokens } from "../../../theme";
import { DateTime } from "luxon";

const StatCard = ({ title, value, color }) => {
    const theme = useTheme();
    const colors = tokens(theme.palette.mode);
    return (
        <Paper sx={{ p: 2, backgroundColor: colors.primary[400], height: "100%" }}>
        <Typography variant="subtitle2" color={colors.grey[100]}>{title}</Typography>
        <Typography variant="h4" fontWeight="bold" color={color || colors.greenAccent[500]}>
            {value}
        </Typography>
        </Paper>
    );
    };

    const ApAnalytics = ({ bills, loading }) => {
    const theme = useTheme();
    const colors = tokens(theme.palette.mode);
    const today = DateTime.now();

    const formatMoney = (amt) => Number(amt).toLocaleString("en-KE", { style: "currency", currency: "KES" });

    const { totalPayable, totalOverdue, unpaidBills } = useMemo(() => {
        let totalPayable = 0;
        let totalOverdue = 0;
        
        const unpaidBills = bills
        .filter((bill) => bill.status === "Posted" || bill.status === "Partially Paid" || bill.status === "Overdue")
        .map((bill) => {
            totalPayable += Number(bill.balance_due);
            const dueDate = DateTime.fromISO(bill.due_date);
            const daysOver = Math.floor(today.diff(dueDate, 'days').days);
            
            if (daysOver > 0) {
            totalOverdue += Number(bill.balance_due);
            }

            return {
            ...bill,
            days_overdue: daysOver > 0 ? daysOver : 0,
            supplier_name: bill.supplier?.name || "N/A",
            };
        });

        return { totalPayable, totalOverdue, unpaidBills };
    }, [bills, today]);

    const columns = [
        { field: "bill_number", headerName: "Bill #", width: 120 },
        { field: "supplier_name", headerName: "Supplier", flex: 1 },
        { field: "bill_date", headerName: "Bill Date", width: 100 },
        { field: "due_date", headerName: "Due Date", width: 100 },
        {
        field: "balance_due",
        headerName: "Balance",
        width: 150,
        renderCell: (params) => <Typography fontWeight="bold">{formatMoney(params.value)}</Typography>
        },
        {
        field: "days_overdue",
        headerName: "Days Overdue",
        width: 120,
        renderCell: (params) => (
            <Typography color={params.value > 0 ? colors.redAccent[500] : "inherit"} fontWeight="bold">
            {params.value}
            </Typography>
        ),
        },
    ];

    return (
        <Box>
        {/* Top Stats Row */}
        <Grid container spacing={2} mb={3}>
            <Grid item xs={12} md={4}>
            <StatCard title="Total Accounts Payable" value={formatMoney(totalPayable)} />
            </Grid>
            <Grid item xs={12} md={4}>
            <StatCard title="Total Overdue" value={formatMoney(totalOverdue)} color={colors.redAccent[500]} />
            </Grid>
        </Grid>

        {/* Unpaid Bills Table */}
        <Typography variant="h5" fontWeight="600" mb={1}>Bills to Pay</Typography>
        <Box
            height="60vh"
            sx={{
            "& .MuiDataGrid-root": { border: "none" },
            "& .MuiDataGrid-columnHeaders": { backgroundColor: colors.blueAccent[700], borderBottom: "none" },
            "& .MuiDataGrid-virtualScroller": { backgroundColor: colors.primary[400] },
            "& .MuiDataGrid-footerContainer": { borderTop: "none", backgroundColor: colors.blueAccent[700] },
            "& .MuiDataGrid-toolbarContainer .MuiButton-text": { color: `${colors.grey[100]} !important` },
            }}
        >
            <DataGrid
            rows={unpaidBills}
            columns={columns}
            loading={loading}
            components={{ Toolbar: GridToolbar }}
            />
        </Box>
        </Box>
    );
};

export default ApAnalytics;