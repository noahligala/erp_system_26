import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Grid,
  Paper,
  useTheme,
  Stack,
  InputBase,
  IconButton,
  Button,
  Chip,
  alpha,
  Divider,
  Tooltip
} from '@mui/material';
import { tokens } from '../../theme';
import Header from '../../components/Header';
import { useNavigate } from 'react-router-dom';

// Icons
import SearchIcon from '@mui/icons-material/Search';
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined';
import GridOnOutlinedIcon from '@mui/icons-material/GridOnOutlined';
import ScheduleSendOutlinedIcon from '@mui/icons-material/ScheduleSendOutlined';
import AccountBalanceOutlinedIcon from '@mui/icons-material/AccountBalanceOutlined';
import TrendingUpOutlinedIcon from '@mui/icons-material/TrendingUpOutlined';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import ArchiveOutlinedIcon from '@mui/icons-material/ArchiveOutlined';
import ChevronRightOutlinedIcon from '@mui/icons-material/ChevronRightOutlined';

const appleFont = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', sans-serif";

const ReportsHub = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const navigate = useNavigate();
  const isDark = theme.palette.mode === 'dark';

  const [searchQuery, setSearchQuery] = useState('');

  // =========================
  // ENTERPRISE REPORT DIRECTORY
  // =========================
  const reportCategories = [
    {
      category: "Financial Statements",
      icon: <AccountBalanceOutlinedIcon fontSize="large" />,
      color: colors.blueAccent[500],
      reports: [
        { title: "Profit & Loss (Income Statement)", desc: "Revenues, costs, and expenses incurred during a specific period.", path: "/accounts/reports/profit-loss", tags: ["Core", "Monthly"] },
        { title: "Balance Sheet", desc: "Snapshot of assets, liabilities, and equity at a specific point in time.", path: "/accounts/reports/balance-sheet", tags: ["Core", "Snapshot"] },
        { title: "Statement of Cash Flows", desc: "Cash entering and leaving the business (Operating, Investing, Financing).", path: "/accounts/reports/cash-flow", tags: ["Core", "Quarterly"] },
        { title: "Trial Balance", desc: "Closing balances of all ledger accounts to ensure debits equal credits.", path: "/accounts/reports/trial-balance", tags: ["Audit", "Closing"] },
      ]
    },
    {
      category: "Analytics & Budgeting",
      icon: <TrendingUpOutlinedIcon fontSize="large" />,
      color: colors.greenAccent[500],
      reports: [
        { title: "General Ledger", desc: "Detailed transaction history for all chart of accounts.", path: "/accounts/reports/general-ledger", tags: ["Detailed", "Audit"] },
        { title: "Budget vs. Actuals", desc: "Compare planned budgets against actual financial performance.", path: "/accounts/reports/budget-vs-actual", tags: ["Planning", "Variance"] },
        { title: "Key Financial Ratios", desc: "Liquidity, profitability, and solvency metrics.", path: "/accounts/reports/key-ratios", tags: ["KPIs", "Snapshot"] },
      ]
    },
    {
      category: "Receivables & Payables",
      icon: <AccountBalanceWalletOutlinedIcon fontSize="large" />,
      color: colors.redAccent[500],
      reports: [
        { title: "A/R Aging Summary", desc: "Unpaid customer invoices categorized by days overdue.", path: "/accounts/reports/ar-aging", tags: ["Collections", "Weekly"] },
        { title: "A/P Aging Summary", desc: "Outstanding supplier bills categorized by days past due.", path: "/accounts/reports/ap-aging", tags: ["Liabilities", "Weekly"] },
        { title: "Customer Ledger", desc: "Statement of all transactions and balances per customer.", path: "/accounts/reports/customer-ledger", tags: ["External"] },
      ]
    },
    {
      category: "Payroll & HRM",
      icon: <GroupOutlinedIcon fontSize="large" />,
      color: colors.orangeAccent ? colors.orangeAccent[500] : '#f59e0b',
      reports: [
        { title: "Payroll Register", desc: "Comprehensive summary of employee earnings and deductions.", path: "/payroll/reports", tags: ["HR", "Monthly"] },
        { title: "Statutory Deductions (PAYE/NSSF/NHIF)", desc: "Compliance report for government tax remittances.", path: "/payroll/reports/statutory", tags: ["Compliance", "Tax"] },
        { title: "Bank Payment List", desc: "Exportable list formatted for bank salary disbursements.", path: "/payroll/reports/bank-list", tags: ["Disbursement"] },
      ]
    },
    {
      category: "Inventory & Assets",
      icon: <Inventory2OutlinedIcon fontSize="large" />,
      color: colors.primary[300],
      reports: [
        { title: "Inventory Valuation", desc: "Current value of stock on hand based on average cost/FIFO.", path: "/inventory/reports/valuation", tags: ["Assets"] },
        { title: "Stock Adjustment Log", desc: "History of manual stock corrections, damages, and shrinkage.", path: "/inventory/reports/adjustments", tags: ["Audit"] },
        { title: "Fixed Asset Register", desc: "Capitalized assets, accumulated depreciation, and book values.", path: "/accounts/reports/fixed-assets", tags: ["Assets", "Annual"] },
      ]
    }
  ];

  // =========================
  // SEARCH LOGIC
  // =========================
  const filteredCategories = useMemo(() => {
    if (!searchQuery) return reportCategories;
    const lowerQuery = searchQuery.toLowerCase();
    
    return reportCategories.map(cat => {
      const filteredReports = cat.reports.filter(r => 
        r.title.toLowerCase().includes(lowerQuery) || 
        r.desc.toLowerCase().includes(lowerQuery) ||
        r.tags.some(t => t.toLowerCase().includes(lowerQuery))
      );
      return { ...cat, reports: filteredReports };
    }).filter(cat => cat.reports.length > 0);
  }, [searchQuery, reportCategories]);

  // =========================
  // STYLES
  // =========================
  const searchBarSx = {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: isDark ? alpha(colors.primary[400], 0.6) : alpha(colors.primary[900], 0.05),
    borderRadius: '16px',
    padding: '8px 20px',
    border: `1px solid ${isDark ? alpha(colors.grey[700], 0.5) : alpha(colors.grey[300], 0.5)}`,
    width: { xs: '100%', md: '400px' },
    transition: 'box-shadow 0.2s',
    '&:focus-within': {
      boxShadow: `0 0 0 2px ${alpha(colors.blueAccent[500], 0.4)}`,
    }
  };

  const cardSx = {
    p: 2.5,
    borderRadius: '20px',
    backgroundColor: isDark ? alpha(colors.primary[400], 0.6) : '#ffffff',
    border: `1px solid ${isDark ? alpha(colors.grey[700], 0.5) : alpha(colors.grey[300], 0.5)}`,
    boxShadow: isDark ? '0 10px 30px rgba(0,0,0,0.2)' : '0 10px 30px rgba(0,0,0,0.03)',
    transition: 'transform 0.2s, box-shadow 0.2s',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    '&:hover': {
      transform: 'translateY(-3px)',
      boxShadow: isDark ? `0 15px 35px rgba(0,0,0,0.3)` : `0 15px 35px rgba(0,0,0,0.08)`,
      borderColor: alpha(colors.blueAccent[500], 0.4),
    }
  };

  return (
    <Box m="20px" sx={{ '& *': { fontFamily: appleFont } }}>
      {/* HERO HEADER */}
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'flex-end' }} mb={4} spacing={3}>
        <Box>
          <Header title="REPORTS HUB" subtitle="Enterprise directory for all financial, operational, and compliance reports." />
          <Button 
            startIcon={<ArchiveOutlinedIcon />} 
            onClick={() => navigate('/accounting/reports/archive')}
            sx={{ 
              mt: 1, 
              color: colors.grey[200], 
              textTransform: 'none', 
              fontWeight: 600,
              backgroundColor: alpha(colors.grey[500], 0.1),
              borderRadius: '10px',
              px: 2
            }}
          >
            Access Archived & Frozen Reports
          </Button>
        </Box>

        <Box sx={searchBarSx}>
          <SearchIcon sx={{ color: colors.grey[400], mr: 1.5 }} />
          <InputBase
            placeholder="Search reports by name, module, or tag..."
            sx={{ flex: 1, color: colors.grey[100], fontFamily: appleFont }}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </Box>
      </Stack>

      {/* REPORT CATEGORIES */}
      {filteredCategories.length === 0 ? (
        <Box textAlign="center" py={10}>
          <AssignmentOutlinedIcon sx={{ fontSize: 80, color: alpha(colors.grey[500], 0.3), mb: 2 }} />
          <Typography variant="h4" color={colors.grey[300]} fontWeight={600}>No reports found matching "{searchQuery}"</Typography>
          <Button onClick={() => setSearchQuery('')} sx={{ mt: 2, color: colors.blueAccent[400] }}>Clear Search</Button>
        </Box>
      ) : (
        <Stack spacing={5}>
          {filteredCategories.map((category, idx) => (
            <Box key={idx}>
              {/* Category Header */}
              <Stack direction="row" alignItems="center" spacing={2} mb={2.5}>
                <Box 
                  sx={{ 
                    width: 48, height: 48, 
                    borderRadius: '14px', 
                    display: 'flex', justifyContent: 'center', alignItems: 'center',
                    backgroundColor: alpha(category.color, 0.15),
                    color: category.color
                  }}
                >
                  {category.icon}
                </Box>
                <Typography variant="h4" fontWeight={800} color={colors.grey[100]} sx={{ letterSpacing: '-0.5px' }}>
                  {category.category}
                </Typography>
              </Stack>

              {/* Reports Grid */}
              <Grid container spacing={3}>
                {category.reports.map((report, rIdx) => (
                  <Grid item xs={12} sm={6} xl={4} key={rIdx}>
                    <Paper elevation={0} sx={cardSx}>
                      <Box flex="1">
                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1}>
                          <Typography variant="h5" fontWeight={700} color={colors.grey[100]}>
                            {report.title}
                          </Typography>
                          <Tooltip title="View Report Online">
                            <IconButton 
                              size="small" 
                              onClick={() => navigate(report.path)}
                              sx={{ backgroundColor: alpha(colors.blueAccent[500], 0.1), color: colors.blueAccent[500], '&:hover': { backgroundColor: colors.blueAccent[500], color: '#fff' } }}
                            >
                              <ChevronRightOutlinedIcon />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                        
                        <Typography variant="body2" color={colors.grey[400]} sx={{ mb: 2, minHeight: '40px' }}>
                          {report.desc}
                        </Typography>

                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap mb={3}>
                          {report.tags.map((tag, tIdx) => (
                            <Chip 
                              key={tIdx} 
                              label={tag} 
                              size="small" 
                              sx={{ 
                                backgroundColor: isDark ? alpha(colors.grey[600], 0.3) : alpha(colors.grey[300], 0.5), 
                                color: colors.grey[200],
                                fontWeight: 600,
                                borderRadius: '8px'
                              }} 
                            />
                          ))}
                        </Stack>
                      </Box>

                      <Divider sx={{ mb: 2, borderColor: alpha(colors.grey[500], 0.15) }} />

                      {/* Enterprise Actions */}
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Stack direction="row" spacing={0.5}>
                          <Tooltip title="Download PDF">
                            <IconButton size="small" sx={{ color: colors.redAccent[400] }}>
                              <PictureAsPdfOutlinedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Export to Excel / CSV">
                            <IconButton size="small" sx={{ color: colors.greenAccent[500] }}>
                              <GridOnOutlinedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                        
                        <Button 
                          size="small" 
                          startIcon={<ScheduleSendOutlinedIcon />}
                          sx={{ textTransform: 'none', color: colors.grey[300], fontWeight: 600 }}
                        >
                          Schedule
                        </Button>
                      </Stack>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </Box>
          ))}
        </Stack>
      )}
    </Box>
  );
};

export default ReportsHub;