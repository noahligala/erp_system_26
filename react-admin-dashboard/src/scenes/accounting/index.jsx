// src/scenes/accounts/AccountsDashboard.jsx
import React, { useState, useEffect } from 'react';
import { Box, Typography, Grid, Button, Paper, useTheme, CircularProgress } from '@mui/material';
import { tokens } from '../../theme';
import Header from '../../components/Header'; 
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/apiClient'; // To fetch real KPI data

// Icons
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined'; // Cash
import CallMadeOutlinedIcon from '@mui/icons-material/CallMadeOutlined'; // AR (Money out to us)
import CallReceivedOutlinedIcon from '@mui/icons-material/CallReceivedOutlined'; // AP (Money we owe)
import TrendingUpOutlinedIcon from '@mui/icons-material/TrendingUpOutlined'; // Net Income
import { toast } from 'react-toastify';

// --- StatBox Component (Enhanced) ---
const StatBox = ({ title, value, icon, change }) => {
    const theme = useTheme();
    const colors = tokens(theme.palette.mode);
    return (
        <Paper elevation={3} sx={{ p: 2, backgroundColor: colors.primary[400] }}>
            <Box display="flex" justifyContent="space-between" alignItems="start">
                <Box>
                    <Typography variant="h6" fontWeight="600" color={colors.grey[300]}>{title}</Typography>
                    <Typography variant="h3" fontWeight="bold" color={colors.grey[100]}>{value}</Typography>
                </Box>
                <Box sx={{ color: colors.greenAccent[500], fontSize: '30px' }}>{icon}</Box>
            </Box>
            {change && (
                <Typography variant="body2" sx={{ color: change.startsWith('+') ? colors.greenAccent[500] : colors.redAccent[500] }}>
                    {change}
                </Typography>
            )}
        </Paper>
    );
};

const AccountsDashboard = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const navigate = useNavigate();
  
  const [kpiData, setKpiData] = useState({
      current_ratio: 0,
      ytd_net_income: 0,
      ytd_revenue: 0,
      quick_ratio: 0,
  });
  const [loading, setLoading] = useState(true);
  
  // --- Data Fetching: Financial Ratios ---
  useEffect(() => {
      const fetchKpis = async () => {
          setLoading(true);
          try {
              // Assuming the API route for key financial ratios exists
              const res = await apiClient.get("/accounting/key-ratios");
              setKpiData(res.data);
          } catch (e) {
              console.error("Failed to fetch KPIs:", e);
              toast.error("Failed to load key financial metrics.");
          } finally {
              setLoading(false);
          }
      };
      fetchKpis();
  }, []);
  
  // Helper to format currency (if the API returns raw numbers)
  const formatKsh = (amount) => (amount || 0).toLocaleString("en-US", { style: "currency", currency: "KES" });


  return (
    <Box m="20px">
      <Header title="ACCOUNTS DASHBOARD" subtitle="Welcome to the finance hub" />

      {/* QUICK ACTIONS & REPORT LINKS */}
      <Box mb={4} display="flex" gap={2} flexWrap="wrap">
        <Button variant="contained" color="secondary" onClick={() => navigate('/accounts/journal-entries/new')}>
          New Journal Entry
        </Button>
        <Button variant="contained" color="secondary" onClick={() => navigate('/sales/payments/customer-payments')}>
          Record Customer Payment
        </Button>
        <Button variant="contained" color="secondary" onClick={() => navigate('/accounts/reports')}>
          Financial Reports Hub
        </Button>
        <Button variant="outlined" onClick={() => navigate('/accounting/reports/archive')} sx={{ borderColor: colors.grey[700], color: colors.grey[100] }}>
          View Archives
        </Button>
      </Box>

      {/* KPI GRID */}
      {loading ? (
          <CircularProgress sx={{ m: 5 }} />
      ) : (
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={3}>
              <StatBox 
                  title="YTD Net Income" 
                  value={formatKsh(kpiData.ytd_net_income)} 
                  icon={<TrendingUpOutlinedIcon />} 
                  change={kpiData.net_profit_margin_ytd ? `+${kpiData.net_profit_margin_ytd}% margin` : ''} 
              />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
              <StatBox 
                  title="Total Revenue YTD" 
                  value={formatKsh(kpiData.ytd_revenue)} 
                  icon={<CallMadeOutlinedIcon />} 
                  change={`Ratio: ${kpiData.current_ratio}`} // Displaying a key ratio here
              />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
              <StatBox 
                  title="Current Ratio" 
                  value={kpiData.current_ratio.toFixed(2) || "N/A"} 
                  icon={<AccountBalanceWalletOutlinedIcon />} 
                  change={kpiData.current_ratio >= 1 ? "Healthy Liquidity" : "Needs Review"} 
              />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
              <StatBox 
                  title="Quick Ratio" 
                  value={kpiData.quick_ratio.toFixed(2) || "N/A"} 
                  icon={<CallReceivedOutlinedIcon />} 
                  change={kpiData.quick_ratio.toFixed(2) >= 0.8 ? "Good" : "Weak"} 
              />
          </Grid>

          {/* CHARTS */}
          <Grid item xs={12} md={8}>
              <Paper elevation={3} sx={{ p: 2, height: '400px', backgroundColor: colors.primary[400] }}>
                  <Typography variant="h5" fontWeight="600" mb={2}>Cash Flow Trend (Last 6 Months)</Typography>
                  {/* Placeholder for Line Chart */}
                  <Box height="300px" display="flex" alignItems="center" justifyContent="center">
                      <Typography color={colors.grey[300]}>(Line Chart: Cash Flow from Operations)</Typography>
                  </Box>
              </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
              <Paper elevation={3} sx={{ p: 2, height: '400px', backgroundColor: colors.primary[400] }}>
                  <Typography variant="h5" fontWeight="600" mb={2}>Balance Sheet Snapshot</Typography>
                  {/* Placeholder for Pie Chart */}
                  <Box height="300px" display="flex" alignItems="center" justifyContent="center">
                      <Typography color={colors.grey[300]}>(Pie Chart: Assets vs. Liabilities)</Typography>
                  </Box>
              </Paper>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default AccountsDashboard;