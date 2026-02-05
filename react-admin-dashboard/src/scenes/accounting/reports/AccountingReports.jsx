import React, { useEffect, useState } from "react";
import {
  Box,
  Grid,
  Paper,
  Typography,
  useTheme,
  CircularProgress,
  Tooltip,
  IconButton,
} from "@mui/material";
import { tokens } from "../../../theme.js";
import Header from "../../../components/Header.jsx";
import {apiClient} from "../../../api/apiClient.js";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

// Icons for the cards
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined';
import BalanceOutlinedIcon from '@mui/icons-material/BalanceOutlined';
import AccountBalanceOutlinedIcon from '@mui/icons-material/AccountBalanceOutlined';
import RequestQuoteOutlinedIcon from '@mui/icons-material/RequestQuoteOutlined';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import ShowChartIcon from '@mui/icons-material/ShowChart';

// Reusable StatBox component (you can move this to a shared components file)
const StatBox = ({ title, value, icon, description, trend }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  
  return (
    <Paper elevation={3} sx={{ p: 2, backgroundColor: colors.primary[400], height: '100%' }}>
      <Box display="flex" justifyContent="space-between">
        <Box>
          <Typography variant="h6" fontWeight="600" color={colors.grey[300]}>
            {title}
          </Typography>
          <Typography variant="h3" fontWeight="bold" color={colors.grey[100]}>
            {value}
          </Typography>
        </Box>
        <Box sx={{ color: colors.greenAccent[500] }}>
          {icon}
        </Box>
      </Box>
      <Box display="flex" justifyContent="space-between" mt={1}>
        <Typography variant="body2" color={colors.grey[300]}>
          {description}
        </Typography>
        {trend && (
          <Typography variant="body2" sx={{ color: trend.startsWith('+') ? colors.greenAccent[500] : colors.redAccent[500] }}>
            {trend}
          </Typography>
        )}
      </Box>
    </Paper>
  );
};

// Reusable Navigation Card component
const ReportCard = ({ title, description, icon, path, colors }) => {
    const navigate = useNavigate();
    return (
        <Grid item xs={12} sm={6} md={4}>
            <Paper
                elevation={3}
                sx={{
                    p: 3,
                    backgroundColor: colors.primary[400],
                    height: '160px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                        transform: 'translateY(-5px)',
                        boxShadow: `0 10px 20px -5px ${colors.primary[900]}`,
                        cursor: 'pointer',
                        backgroundColor: colors.primary[900]
                    }
                }}
                onClick={() => navigate(path)}
            >
                <Box display="flex" justifyContent="space-between" alignItems="start">
                    <Box>
                        <Typography variant="h5" fontWeight="600">{title}</Typography>
                    </Box>
                    <Box sx={{ color: colors.greenAccent[400] }}>
                        {React.cloneElement(icon, { style: { fontSize: 32 } })}
                    </Box>
                </Box>
                 <Typography variant="body2" color={colors.grey[300]}>{description}</Typography>
            </Paper>
        </Grid>
    );
};


const AccountingReports = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const [loading, setLoading] = useState(true);
  const [ratios, setRatios] = useState(null);

  const fetchRatios = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("/accounting/key-ratios");
      setRatios(res.data);
    } catch (err) {
      console.error("Error fetching key ratios:", err);
      toast.error(err.response?.data?.message || "Failed to fetch key ratios.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRatios();
  }, []);

  return (
    <Box m={{ xs: "10px", md: "20px" }}>
      <Header title="Financial Reports" subtitle="Key metrics and report generation" />

      {/* --- Key Ratios Section --- */}
      <Box mb={3}>
        <Typography variant="h4" sx={{ color: colors.grey[100], mb: 2 }}>
          Key Performance Indicators (YTD)
        </Typography>
        {loading ? (
            <Box display="flex" justifyContent="center" p={5}><CircularProgress /></Box>
        ) : ratios ? (
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={3}>
              <StatBox
                title="Current Ratio"
                value={ratios.current_ratio.toFixed(2)}
                description="Liquidity"
                icon={<ShowChartIcon sx={{ fontSize: 40 }} />}
                trend={ratios.current_ratio >= 1.5 ? "Healthy" : "Check Solvency"}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatBox
                title="Net Profit Margin"
                value={`${(ratios.net_profit_margin * 100).toFixed(1)}%`}
                description="Profitability"
                icon={<TrendingUpIcon sx={{ fontSize: 40 }} />}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatBox
                title="YTD Net Income"
                value={ratios.ytd_net_income.toLocaleString('en-US', { style: 'currency', currency: 'KES' })}
                description="YTD Performance"
                icon={ratios.ytd_net_income >= 0 ? <TrendingUpIcon sx={{ fontSize: 40 }} /> : <TrendingDownIcon sx={{ fontSize: 40 }} />}
              />
            </Grid>
             <Grid item xs={12} sm={6} md={3}>
              <StatBox
                title="YTD Revenue"
                value={ratios.ytd_revenue.toLocaleString('en-US', { style: 'currency', currency: 'KES' })}
                description="YTD Top Line"
                icon={<ShowChartIcon sx={{ fontSize: 40 }} />}
              />
            </Grid>
          </Grid>
        ) : (
            <Typography>Could not load key ratios.</Typography>
        )}
      </Box>

      {/* --- Report Navigation Section --- */}
      <Box>
        <Typography variant="h4" sx={{ color: colors.grey[100], mb: 2, mt: 4 }}>
          Generate Reports
        </Typography>
        <Grid container spacing={3}>
            <ReportCard
                title="Profit & Loss"
                description="View income, expenses, and net profit for a selected period."
                icon={<AssessmentOutlinedIcon />}
                path="/accounts/reports/profit-loss" // We will create this page next
                colors={colors}
            />
            <ReportCard
                title="Balance Sheet"
                description="View assets, liabilities, and equity as of a specific date."
                icon={<AccountBalanceOutlinedIcon />}
                path="/accounts/reports/balance-sheet" // We will create this page next
                colors={colors}
            />
             <ReportCard
                title="Trial Balance"
                description="Check if total debits equal total credits for all accounts."
                icon={<BalanceOutlinedIcon />}
                path="/accounts/reports/trial-balance" // We will create this page next
                colors={colors}
            />
            <ReportCard
                title="General Ledger"
                description="Drill down into all transactions for a specific account."
                icon={<ReceiptLongOutlinedIcon />}
                path="/accounts/reports/general-ledger" // We will create this page next
                colors={colors}
            />
             <ReportCard
                title="Payment Voucher"
                description="Create and print a new payment voucher for an expense."
                icon={<RequestQuoteOutlinedIcon />}
                path="/accounts/reports/payment-vouchers" 
                colors={colors}
            />
            <ReportCard
                title="Assets"
                description="Manage Assets."
                icon={<RequestQuoteOutlinedIcon />}
                path="/accounts/reports/fixedassets" 
                colors={colors}
            />
            <ReportCard
                title="Reports Registry"
                description="RetrievePreviously generated Reports."
                icon={<RequestQuoteOutlinedIcon />}
                path="/accounting/reports/archive" 
                colors={colors}
            />
            <ReportCard
                title="CashFlow"
                description="Monitor the Flow of capital."
                icon={<RequestQuoteOutlinedIcon />}
                path="/accounting/reports/cashflowstatement" 
                colors={colors}
            />
            <ReportCard
                title="Budgeting"
                description="Set Targets and Evaluate Performance of GL."
                icon={<RequestQuoteOutlinedIcon />}
                path="/accounting/reports/budgeting" 
                colors={colors}
            />
            
        </Grid>
      </Box>
    </Box>
  );
};

export default AccountingReports;

