import React, { useMemo } from "react";
import { Box, Grid, Paper, Typography, useTheme } from "@mui/material";
import { tokens } from "../../../theme";

// A simple card component for metrics
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

const ExpensesAnalytics = ({ expenses }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  // --- Calculations ---
  const stats = useMemo(() => {
    const total = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
    const paid = expenses
      .filter((e) => e.status === "Paid")
      .reduce((sum, exp) => sum + Number(exp.amount), 0);
    const pending = expenses
      .filter((e) => e.status === "Pending")
      .reduce((sum, exp) => sum + Number(exp.amount), 0);

    // Group by Category
    const byCategory = expenses.reduce((acc, curr) => {
      acc[curr.category] = (acc[curr.category] || 0) + Number(curr.amount);
      return acc;
    }, {});

    const topCategory = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0];

    return {
      total,
      paid,
      pending,
      topCategory: topCategory ? { name: topCategory[0], amount: topCategory[1] } : null,
      byCategory
    };
  }, [expenses]);

  const formatMoney = (amt) => Number(amt).toLocaleString("en-KE", { style: "currency", currency: "KES" });

  return (
    <Box>
      {/* Top Stats Row */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} md={3}>
          <StatCard title="Total Expenses Claimed" value={formatMoney(stats.total)} />
        </Grid>
        <Grid item xs={12} md={3}>
          <StatCard title="Total Paid" value={formatMoney(stats.paid)} color={colors.blueAccent[500]} />
        </Grid>
        <Grid item xs={12} md={3}>
          {/* --- THIS IS THE FIX --- */}
          <StatCard 
            title="Pending Approval" 
            value={formatMoney(stats.pending)} 
            color={colors.yellowAccent[500]} 
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <StatCard 
            title="Top Spending Category" 
            value={stats.topCategory ? stats.topCategory.name : "N/A"} 
            color={colors.redAccent[500]} 
          />
        </Grid>
      </Grid>

      {/* Category Breakdown Table */}
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, backgroundColor: colors.primary[400] }}>
            <Typography variant="h6" mb={2} fontWeight="bold">
              Breakdown by Category
            </Typography>
            {Object.keys(stats.byCategory).length === 0 ? (
              <Typography>No data available</Typography>
            ) : (
              Object.entries(stats.byCategory)
                .sort((a, b) => b[1] - a[1])
                .map(([cat, amt]) => (
                  <Box 
                    key={cat} 
                    display="flex" 
                    justifyContent="space-between" 
                    borderBottom={`1px solid ${colors.primary[500]}`}
                    p={1}
                  >
                    <Typography>{cat}</Typography>
                    <Typography fontWeight="bold">{formatMoney(amt)}</Typography>
                  </Box>
                ))
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ExpensesAnalytics;