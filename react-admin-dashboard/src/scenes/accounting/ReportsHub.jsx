import React, { useState, useMemo, useCallback } from 'react';
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
  Divider,
  Tooltip,
  Grow,
  Fade,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/Header';
import { tokens } from '../../theme';

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
import MoreVertIcon from '@mui/icons-material/MoreVert';
import PrintIcon from '@mui/icons-material/Print';
import ClearIcon from '@mui/icons-material/Clear';

const ReportsHub = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const navigate = useNavigate();
  const isDark = theme.palette.mode === 'dark';

  // ==========================================
  // 🛡️ CRASH-PROOF COLOR ENGINE
  // ==========================================
  const getColor = useCallback((colorPath, fallback = "#888888") => {
    try {
      const parts = colorPath.split('.');
      let value = colors;
      for (const part of parts) {
        if (!value || typeof value !== 'object') return fallback;
        value = value[part];
      }
      return value || fallback;
    } catch (error) {
      return fallback;
    }
  }, [colors]);

  const safeColors = useMemo(() => ({
    primary: {
      main: getColor('primary[500]', '#1976d2'),
      light: getColor('primary[400]', '#42a5f5'),
      dark: getColor('primary[600]', '#1565c0'),
    },
    greenAccent: { main: getColor('greenAccent[500]', '#4caf50') },
    redAccent: { main: getColor('redAccent[500]', '#f44336') },
    blueAccent: { main: getColor('blueAccent[500]', '#2196f3') },
    orangeAccent: { main: getColor('orangeAccent[500]', '#ff9800') },
    purpleAccent: { main: getColor('purpleAccent[500]', '#9c27b0') },
    grey: {
      50: getColor('grey[50]', '#fafafa'),
      100: getColor('grey[100]', '#f5f5f5'),
      200: getColor('grey[200]', '#eeeeee'),
      300: getColor('grey[300]', '#e0e0e0'),
      400: getColor('grey[400]', '#bdbdbd'),
      500: getColor('grey[500]', '#9e9e9e'),
      600: getColor('grey[600]', '#757575'),
      700: getColor('grey[700]', '#616161'),
      800: getColor('grey[800]', '#424242'),
      900: getColor('grey[900]', '#212121'),
    }
  }), [getColor]);

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [actionAnchorEl, setActionAnchorEl] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);

  // ==========================================
  // ENTERPRISE REPORT DIRECTORY DATA
  // ==========================================
  const reportCategories = useMemo(() => [
    {
      category: "Financial Statements",
      icon: <AccountBalanceOutlinedIcon fontSize="large" />,
      color: safeColors.blueAccent.main,
      reports: [
        { title: "Profit & Loss (Income Statement)", desc: "Revenues, costs, and expenses incurred during a specific period.", path: "/accounting/reports/profit-loss", tags: ["Core", "Monthly"] },
        { title: "Balance Sheet", desc: "Snapshot of assets, liabilities, and equity at a specific point in time.", path: "/accounting/reports/balance-sheet", tags: ["Core", "Snapshot"] },
        { title: "Statement of Cash Flows", desc: "Cash entering and leaving the business (Operating, Investing, Financing).", path: "/accounting/reports/cash-flow", tags: ["Core", "Quarterly"] },
        { title: "Trial Balance", desc: "Closing balances of all ledger accounts to ensure debits equal credits.", path: "/accounting/reports/trial-balance", tags: ["Audit", "Closing"] },
      ]
    },
    {
      category: "Analytics & Budgeting",
      icon: <TrendingUpOutlinedIcon fontSize="large" />,
      color: safeColors.greenAccent.main,
      reports: [
        { title: "General Ledger", desc: "Detailed transaction history for all chart of accounts.", path: "/accounting/reports/general-ledger", tags: ["Detailed", "Audit"] },
        { title: "Budget vs. Actuals", desc: "Compare planned budgets against actual financial performance.", path: "/accounting/reports/budget-vs-actual", tags: ["Planning", "Variance"] },
        { title: "Key Financial Ratios", desc: "Liquidity, profitability, and solvency metrics.", path: "/accounting/reports/key-ratios", tags: ["KPIs", "Snapshot"] },
      ]
    },
    {
      category: "Receivables & Payables",
      icon: <AccountBalanceWalletOutlinedIcon fontSize="large" />,
      color: safeColors.redAccent.main,
      reports: [
        { title: "A/R Aging Summary", desc: "Unpaid customer invoices categorized by days overdue.", path: "/invoices/reports/ar-aging", tags: ["Collections", "Weekly"] },
        { title: "A/P Aging Summary", desc: "Outstanding supplier bills categorized by days past due.", path: "/bills/reports/ap-aging", tags: ["Liabilities", "Weekly"] },
        { title: "Customer Ledger", desc: "Statement of all transactions and balances per customer.", path: "/customers/reports/ledger", tags: ["External"] },
      ]
    },
    {
      category: "Payroll & HRM",
      icon: <GroupOutlinedIcon fontSize="large" />,
      color: safeColors.orangeAccent.main,
      reports: [
        { title: "Payroll Register", desc: "Comprehensive summary of employee earnings and deductions.", path: "/payroll/reports", tags: ["HR", "Monthly"] },
        { title: "Statutory Deductions (PAYE/NSSF)", desc: "Compliance report for government tax remittances.", path: "/payroll/reports/statutory", tags: ["Compliance", "Tax"] },
        { title: "Bank Payment List", desc: "Exportable list formatted for bank salary disbursements.", path: "/payroll/reports/bank-list", tags: ["Disbursement"] },
      ]
    },
    {
      category: "Inventory & Assets",
      icon: <Inventory2OutlinedIcon fontSize="large" />,
      color: safeColors.purpleAccent.main,
      reports: [
        { title: "Inventory Valuation", desc: "Current value of stock on hand based on average cost/FIFO.", path: "/inventory/reports/valuation", tags: ["Assets"] },
        { title: "Stock Adjustment Log", desc: "History of manual stock corrections, damages, and shrinkage.", path: "/inventory/reports/adjustments", tags: ["Audit"] },
        { title: "Fixed Asset Register", desc: "Capitalized assets, accumulated depreciation, and book values.", path: "/accounting/assets/reports", tags: ["Assets", "Annual"] },
      ]
    }
  ], [safeColors]);

  // ==========================================
  // SEARCH & FILTER LOGIC
  // ==========================================
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

  // ==========================================
  // ACTION MENUS
  // ==========================================
  const handleActionClick = (event, report) => {
    setActionAnchorEl(event.currentTarget);
    setSelectedReport(report);
  };

  const handleActionClose = () => {
    setActionAnchorEl(null);
    setSelectedReport(null);
  };

  const handleSimulateExport = (type) => {
    // In a real app, you would trigger the API download here based on selectedReport.path
    console.log(`Exporting ${selectedReport?.title} as ${type}`);
    handleActionClose();
  };

  // ==========================================
  // UI STYLES
  // ==========================================
  const searchBarSx = {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: isDark ? alpha(safeColors.primary.main, 0.6) : alpha(safeColors.primary.main, 0.04),
    borderRadius: '16px',
    padding: '8px 20px',
    border: `1px solid ${isDark ? alpha(safeColors.grey[700], 0.5) : alpha(safeColors.grey[300], 0.8)}`,
    width: { xs: '100%', md: '450px' },
    transition: 'all 0.3s ease',
    boxShadow: isDark ? 'inset 0 2px 4px rgba(0,0,0,0.2)' : 'inset 0 2px 4px rgba(0,0,0,0.02)',
    '&:focus-within': {
      boxShadow: `0 0 0 3px ${alpha(safeColors.blueAccent.main, 0.3)}`,
      borderColor: safeColors.blueAccent.main,
    }
  };

  const cardSx = {
    p: 3,
    borderRadius: '24px',
    backgroundColor: isDark ? alpha(safeColors.primary.main, 0.5) : '#ffffff',
    border: `1px solid ${isDark ? alpha(safeColors.grey[700], 0.4) : alpha(safeColors.grey[300], 0.5)}`,
    boxShadow: isDark 
      ? '0 10px 30px rgba(0,0,0,0.2)' 
      : '0 10px 30px rgba(0,0,0,0.04)',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    position: 'relative',
    overflow: 'hidden',
    '&:hover': {
      transform: 'translateY(-4px)',
      boxShadow: isDark 
        ? `0 20px 40px rgba(0,0,0,0.4)` 
        : `0 20px 40px rgba(0,0,0,0.08)`,
      borderColor: alpha(safeColors.blueAccent.main, 0.4),
    }
  };

  return (
    <Box m={{ xs: "12px", md: "20px" }}>
      {/* HERO HEADER */}
      <Fade in={true} timeout={600}>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'flex-end' }} mb={5} spacing={3}>
          <Box>
            <Header title="REPORTS DIRECTORY" subtitle="Enterprise hub for all financial, operational, and compliance reports." />
            <Button 
              startIcon={<ArchiveOutlinedIcon />} 
              onClick={() => navigate('/accounting/archived-reports')}
              sx={{ 
                mt: 1.5, 
                color: safeColors.grey[100], 
                textTransform: 'none', 
                fontWeight: 600,
                backgroundColor: isDark ? alpha(safeColors.grey[600], 0.3) : alpha(safeColors.grey[400], 0.2),
                borderRadius: '12px',
                px: 2.5,
                py: 1,
                '&:hover': { backgroundColor: isDark ? alpha(safeColors.grey[600], 0.5) : alpha(safeColors.grey[400], 0.3) }
              }}
            >
              Access Frozen / Archived Reports
            </Button>
          </Box>

          <Box sx={searchBarSx}>
            <SearchIcon sx={{ color: safeColors.grey[400], mr: 1.5 }} />
            <InputBase
              placeholder="Search reports, tags, or modules..."
              sx={{ flex: 1, color: safeColors.grey[100], fontSize: '1rem' }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <IconButton size="small" onClick={() => setSearchQuery('')} sx={{ color: safeColors.grey[500] }}>
                <ClearIcon fontSize="small" />
              </IconButton>
            )}
          </Box>
        </Stack>
      </Fade>

      {/* REPORT CATEGORIES */}
      {filteredCategories.length === 0 ? (
        <Fade in={true}>
          <Box textAlign="center" py={12} sx={{ backgroundColor: alpha(safeColors.primary.main, 0.1), borderRadius: '24px', border: `1px dashed ${safeColors.grey[500]}` }}>
            <AssignmentOutlinedIcon sx={{ fontSize: 80, color: alpha(safeColors.grey[500], 0.5), mb: 2 }} />
            <Typography variant="h4" color={safeColors.grey[200]} fontWeight={700}>No reports found matching "{searchQuery}"</Typography>
            <Typography color={safeColors.grey[400]} mt={1}>Try adjusting your search terms or browsing the categories.</Typography>
            <Button onClick={() => setSearchQuery('')} variant="contained" sx={{ mt: 3, backgroundColor: safeColors.blueAccent.main, borderRadius: '12px', textTransform: 'none', fontWeight: 600 }}>
              Clear Search
            </Button>
          </Box>
        </Fade>
      ) : (
        <Stack spacing={6}>
          {filteredCategories.map((category, idx) => (
            <Box key={idx}>
              {/* Category Header */}
              <Grow in={true} timeout={400 + (idx * 150)}>
                <Stack direction="row" alignItems="center" spacing={2} mb={3}>
                  <Box 
                    sx={{ 
                      width: 52, height: 52, 
                      borderRadius: '16px', 
                      display: 'flex', justifyContent: 'center', alignItems: 'center',
                      background: `linear-gradient(135deg, ${alpha(category.color, 0.2)} 0%, ${alpha(category.color, 0.05)} 100%)`,
                      color: category.color,
                      border: `1px solid ${alpha(category.color, 0.2)}`
                    }}
                  >
                    {category.icon}
                  </Box>
                  <Typography variant="h4" fontWeight={800} color={safeColors.grey[100]}>
                    {category.category}
                  </Typography>
                </Stack>
              </Grow>

              {/* Reports Grid */}
              <Grid container spacing={3}>
                {category.reports.map((report, rIdx) => (
                  <Grid item xs={12} sm={6} xl={4} key={rIdx}>
                    <Grow in={true} timeout={500 + (idx * 100) + (rIdx * 50)}>
                      <Paper elevation={0} sx={cardSx}>
                        <Box flex="1">
                          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1}>
                            <Typography variant="h5" fontWeight={800} color={safeColors.grey[100]} sx={{ pr: 2, lineHeight: 1.3 }}>
                              {report.title}
                            </Typography>
                            <Tooltip title="Report Actions">
                              <IconButton 
                                size="small" 
                                onClick={(e) => handleActionClick(e, report)}
                                sx={{ color: safeColors.grey[400], '&:hover': { backgroundColor: alpha(safeColors.grey[500], 0.1) } }}
                              >
                                <MoreVertIcon />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                          
                          <Typography variant="body2" color={safeColors.grey[400]} sx={{ mb: 2.5, minHeight: '40px', lineHeight: 1.6 }}>
                            {report.desc}
                          </Typography>

                          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap mb={3}>
                            {report.tags.map((tag, tIdx) => (
                              <Chip 
                                key={tIdx} 
                                label={tag} 
                                size="small" 
                                sx={{ 
                                  backgroundColor: isDark ? alpha(safeColors.grey[700], 0.5) : alpha(safeColors.grey[200], 0.8), 
                                  color: safeColors.grey[100],
                                  fontWeight: 600,
                                  borderRadius: '8px'
                                }} 
                              />
                            ))}
                          </Stack>
                        </Box>

                        <Divider sx={{ mb: 2, borderColor: alpha(safeColors.grey[500], 0.15) }} />

                        {/* Card Footer Actions */}
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Stack direction="row" spacing={1}>
                            <Tooltip title="Quick PDF Export">
                              <IconButton size="small" sx={{ color: safeColors.redAccent.main, backgroundColor: alpha(safeColors.redAccent.main, 0.1) }}>
                                <PictureAsPdfOutlinedIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Quick Excel Export">
                              <IconButton size="small" sx={{ color: safeColors.greenAccent.main, backgroundColor: alpha(safeColors.greenAccent.main, 0.1) }}>
                                <GridOnOutlinedIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                          
                          <Button 
                            endIcon={<ChevronRightOutlinedIcon />}
                            onClick={() => navigate(report.path)}
                            sx={{ 
                              textTransform: 'none', 
                              color: safeColors.blueAccent.main, 
                              fontWeight: 700,
                              backgroundColor: alpha(safeColors.blueAccent.main, 0.1),
                              borderRadius: '10px',
                              px: 2,
                              '&:hover': { backgroundColor: safeColors.blueAccent.main, color: '#fff' }
                            }}
                          >
                            View Report
                          </Button>
                        </Stack>
                      </Paper>
                    </Grow>
                  </Grid>
                ))}
              </Grid>
            </Box>
          ))}
        </Stack>
      )}

      {/* Global Action Menu */}
      <Menu
        anchorEl={actionAnchorEl}
        open={Boolean(actionAnchorEl)}
        onClose={handleActionClose}
        PaperProps={{
          sx: {
            borderRadius: "16px",
            minWidth: 220,
            background: isDark ? safeColors.primary.main : "#fff",
            border: `1px solid ${alpha(safeColors.grey[500], 0.2)}`,
            boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
            mt: 1
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={() => { navigate(selectedReport?.path); handleActionClose(); }}>
          <ListItemIcon><ChevronRightOutlinedIcon fontSize="small" sx={{ color: safeColors.blueAccent.main }} /></ListItemIcon>
          <ListItemText sx={{ fontWeight: 600 }}>Open Web View</ListItemText>
        </MenuItem>
        <Divider sx={{ my: 1, borderColor: alpha(safeColors.grey[500], 0.2) }} />
        <MenuItem onClick={() => handleSimulateExport("PDF")}>
          <ListItemIcon><PictureAsPdfOutlinedIcon fontSize="small" sx={{ color: safeColors.redAccent.main }} /></ListItemIcon>
          <ListItemText>Export as PDF</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleSimulateExport("EXCEL")}>
          <ListItemIcon><GridOnOutlinedIcon fontSize="small" sx={{ color: safeColors.greenAccent.main }} /></ListItemIcon>
          <ListItemText>Export to Excel</ListItemText>
        </MenuItem>
        <Divider sx={{ my: 1, borderColor: alpha(safeColors.grey[500], 0.2) }} />
        <MenuItem onClick={handleActionClose}>
          <ListItemIcon><ScheduleSendOutlinedIcon fontSize="small" sx={{ color: safeColors.grey[300] }} /></ListItemIcon>
          <ListItemText>Schedule Email Delivery</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleActionClose}>
          <ListItemIcon><PrintIcon fontSize="small" sx={{ color: safeColors.grey[300] }} /></ListItemIcon>
          <ListItemText>Print Setup</ListItemText>
        </MenuItem>
      </Menu>

    </Box>
  );
};

export default ReportsHub;