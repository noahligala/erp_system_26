import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  IconButton,
  LinearProgress,
  Paper,
  Stack,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";
import { tokens } from "../../theme";
import { apiClient } from "../../api/apiClient";
import Header from "../../components/Header";
import LineChart from "../../components/LineChart";

// Icons
import AccountBalanceWalletOutlinedIcon from "@mui/icons-material/AccountBalanceWalletOutlined";
import TrendingUpOutlinedIcon from "@mui/icons-material/TrendingUpOutlined";
import TrendingDownOutlinedIcon from "@mui/icons-material/TrendingDownOutlined";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import CallMadeOutlinedIcon from "@mui/icons-material/CallMadeOutlined";
import CallReceivedOutlinedIcon from "@mui/icons-material/CallReceivedOutlined";
import AddIcon from "@mui/icons-material/Add";
import ReceiptIcon from "@mui/icons-material/Receipt";
import AssessmentIcon from "@mui/icons-material/Assessment";
import AccessTimeOutlinedIcon from "@mui/icons-material/AccessTimeOutlined";

const AccountsDashboard = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const navigate = useNavigate();
  const isDark = theme.palette.mode === "dark";

  // State Management
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState(null);

  const [dashboardData, setDashboardData] = useState({
    summary: null,
    trends: [],
    ratios: null,
    alerts: [],
    arAging: null,
  });

  // =========================
  // FORMATTERS
  // =========================
  const formatCurrency = useCallback((value, currency = "KES") => {
    const number = Number(value);
    if (!Number.isFinite(number)) return `${currency} 0.00`;
    return `${currency} ${number.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }, []);

  const formatDateTime = useCallback((dateValue) => {
    if (!dateValue) return "—";
    const dt = new Date(dateValue);
    if (!Number.isFinite(dt.getTime())) return "—";
    return dt.toLocaleString();
  }, []);

  // Calculate MoM Growth
  const getGrowth = useCallback((metricKey) => {
    if (!dashboardData.trends || dashboardData.trends.length < 2) return null;
    const current = dashboardData.trends[dashboardData.trends.length - 1][metricKey];
    const previous = dashboardData.trends[dashboardData.trends.length - 2][metricKey];
    if (!previous || previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  }, [dashboardData.trends]);

  // =========================
  // DATA FETCHING
  // =========================
  const fetchDashboard = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      // Fetch all required analytical endpoints concurrently
      const results = await Promise.allSettled([
        apiClient.get("/accounting/dashboard-summary"),
        apiClient.get("/accounting/financial-trends?months=6"),
        apiClient.get("/accounting/key-ratios"),
        apiClient.get("/accounting/alerts"),
        apiClient.get("/invoices/reports/ar-aging"),
      ]);

      setDashboardData({
        summary: results[0].status === "fulfilled" ? results[0].value.data : null,
        trends: results[1].status === "fulfilled" ? results[1].value.data : [],
        ratios: results[2].status === "fulfilled" ? results[2].value.data : null,
        alerts: results[3].status === "fulfilled" ? results[3].value.data : [],
        arAging: results[4].status === "fulfilled" ? results[4].value.data : null,
      });

      setLastUpdated(new Date());
    } catch (err) {
      console.error("Dashboard Aggregation Error:", err);
      setError("Failed to load some dashboard modules. Showing available data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // =========================
  // CHART DATA PREP
  // =========================
  const lineChartData = useMemo(() => {
    if (!dashboardData.trends || dashboardData.trends.length === 0) return [];
    return [
      {
        id: "Revenue",
        color: colors.greenAccent[500],
        data: dashboardData.trends.map((t) => ({ x: t.month, y: Number(t.revenue) || 0 })),
      },
      {
        id: "Expenses",
        color: colors.redAccent[500],
        data: dashboardData.trends.map((t) => ({ x: t.month, y: Number(t.expenses) || 0 })),
      },
    ];
  }, [dashboardData.trends, colors]);

  // =========================
  // STYLES
  // =========================
  const cardSx = {
    borderRadius: "20px",
    p: 2.5,
    background: isDark
      ? `linear-gradient(180deg, ${alpha(colors.primary[400], 0.96)} 0%, ${alpha(colors.primary[500], 0.98)} 100%)`
      : `linear-gradient(180deg, ${alpha("#ffffff", 0.98)} 0%, ${alpha(colors.primary[100], 0.92)} 100%)`,
    border: `1px solid ${isDark ? alpha(colors.grey[700], 0.7) : alpha(colors.grey[700], 0.18)}`,
    boxShadow: isDark ? "0 14px 32px rgba(0,0,0,0.22)" : "0 14px 32px rgba(15,23,42,0.08)",
    height: "100%",
    display: "flex",
    flexDirection: "column",
  };

  const actionButtonSx = {
    borderRadius: "12px",
    textTransform: "none",
    fontWeight: 700,
    px: 2.5,
    py: 1,
    boxShadow: "none",
    "&:hover": { boxShadow: "0 8px 16px rgba(0,0,0,0.1)" },
  };

  // =========================
  // RENDER HELPERS
  // =========================
  if (loading && !dashboardData.summary) {
    return (
      <Box m="20px" display="flex" justifyContent="center" alignItems="center" flexDirection="column" gap={2} height="80vh">
        <CircularProgress color="secondary" />
        <Typography color={colors.grey[200]} fontWeight={600}>Aggregating Financial Data...</Typography>
      </Box>
    );
  }

  const { summary, ratios, alerts, arAging } = dashboardData;

  return (
    <Box m={{ xs: "12px", md: "20px" }}>
      {/* HERO HEADER */}
      <Paper
        elevation={0}
        sx={{
          ...cardSx,
          p: { xs: 2.5, md: 3 },
          mb: 3,
          background: isDark
            ? `linear-gradient(135deg, ${colors.primary[400]} 0%, ${colors.greenAccent[900]} 100%)`
            : `linear-gradient(135deg, ${colors.greenAccent[800]} 0%, ${colors.greenAccent[600]} 100%)`,
          color: "#fff",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            opacity: 0.08,
            backgroundImage: "radial-gradient(circle at 15% 15%, #fff 0, transparent 20%), radial-gradient(circle at 85% 25%, #fff 0, transparent 18%)",
          }}
        />

        <Stack direction={{ xs: "column", lg: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", lg: "center" }} spacing={2} sx={{ position: "relative", zIndex: 1 }}>
          <Box>
            <Header title="ACCOUNTS DASHBOARD" subtitle="Enterprise financial intelligence and performance" />
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap mt={1}>
              <Chip icon={<AccessTimeOutlinedIcon />} label={`Synced: ${formatDateTime(lastUpdated)}`} sx={{ backgroundColor: "rgba(255,255,255,0.15)", color: "#fff", fontWeight: 600, "& .MuiChip-icon": { color: "#fff" } }} />
            </Stack>
          </Box>

          <Stack direction="row" spacing={1.5} alignItems="center">
            <Tooltip title="Force Sync Data">
              <IconButton onClick={() => fetchDashboard(true)} disabled={refreshing} sx={{ backgroundColor: "rgba(255,255,255,0.1)", color: "#fff", "&:hover": { backgroundColor: "rgba(255,255,255,0.2)" } }}>
                {refreshing ? <CircularProgress size={22} color="inherit" /> : <RefreshRoundedIcon />}
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>
        {refreshing && <LinearProgress color="secondary" sx={{ mt: 2.5, borderRadius: "999px", height: 4, backgroundColor: "rgba(255,255,255,0.12)" }} />}
      </Paper>

      {/* QUICK ACTIONS */}
      <Stack direction="row" spacing={2} mb={3} flexWrap="wrap" useFlexGap>
        <Button variant="contained" startIcon={<AddIcon />} sx={{ ...actionButtonSx, backgroundColor: colors.blueAccent[500], color: "#fff", "&:hover": { backgroundColor: colors.blueAccent[600] } }} onClick={() => navigate("/accounts/journal-entries/new")}>
          Journal Entry
        </Button>
        <Button variant="contained" startIcon={<ReceiptIcon />} sx={{ ...actionButtonSx, backgroundColor: colors.greenAccent[600], color: "#fff", "&:hover": { backgroundColor: colors.greenAccent[700] } }} onClick={() => navigate("/sales/payments/customer-payments")}>
          Receive Payment
        </Button>
        <Button variant="contained" startIcon={<AssessmentIcon />} sx={{ ...actionButtonSx, backgroundColor: isDark ? colors.grey[700] : colors.grey[200], color: isDark ? colors.grey[100] : colors.grey[800], "&:hover": { backgroundColor: isDark ? colors.grey[600] : colors.grey[300] } }} onClick={() => navigate("/accounts/reports/hub")}>
          Reports Hub
        </Button>
      </Stack>

      {/* SMART ALERTS */}
      {error && <Alert severity="error" sx={{ mb: 3, borderRadius: "14px" }}>{error}</Alert>}
      {alerts && alerts.length > 0 && (
        <Stack spacing={1.5} mb={3}>
          {alerts.map((a, i) => (
            <Alert key={i} severity={a.type || "info"} icon={a.type === "error" ? <ErrorOutlineIcon /> : a.type === "success" ? <CheckCircleOutlineIcon /> : <WarningAmberIcon />} sx={{ borderRadius: "14px", alignItems: "center", backgroundColor: isDark ? alpha(colors.primary[500], 0.8) : undefined }}>
              <Typography fontWeight="700">{a.title}</Typography>
              <Typography variant="body2">{a.message}</Typography>
            </Alert>
          ))}
        </Stack>
      )}

      {/* KPI METRICS */}
      <Box display="grid" gridTemplateColumns={{ xs: "1fr", sm: "repeat(2, 1fr)", xl: "repeat(4, 1fr)" }} gap="20px" mb={3}>
        {[
          { label: "Revenue (MTD)", value: summary?.revenue, growth: getGrowth("revenue"), icon: <CallMadeOutlinedIcon />, accent: colors.blueAccent[500] },
          { label: "Expenses (MTD)", value: summary?.expenses, growth: getGrowth("expenses"), inverseGood: true, icon: <CallReceivedOutlinedIcon />, accent: colors.redAccent[500] },
          { label: "Net Income (MTD)", value: summary?.net_income, growth: getGrowth("revenue") - getGrowth("expenses"), icon: <TrendingUpOutlinedIcon />, accent: colors.greenAccent[500] },
          { label: "Cash & Equivalents", value: summary?.cash_balance, icon: <AccountBalanceWalletOutlinedIcon />, accent: colors.greenAccent[400], static: true },
        ].map((kpi, i) => {
          const isPositive = (kpi.growth > 0 && !kpi.inverseGood) || (kpi.growth < 0 && kpi.inverseGood);
          return (
            <Paper key={i} elevation={0} sx={cardSx}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={2}>
                <Box sx={{ width: 48, height: 48, borderRadius: "14px", display: "grid", placeItems: "center", backgroundColor: alpha(kpi.accent, 0.12), color: kpi.accent }}>
                  {kpi.icon}
                </Box>
                {!kpi.static && kpi.growth !== null && (
                  <Chip size="small" icon={kpi.growth > 0 ? <TrendingUpOutlinedIcon /> : <TrendingDownOutlinedIcon />} label={`${Math.abs(kpi.growth).toFixed(1)}%`} sx={{ fontWeight: 700, backgroundColor: isPositive ? alpha(colors.greenAccent[500], 0.15) : alpha(colors.redAccent[500], 0.15), color: isPositive ? colors.greenAccent[500] : colors.redAccent[500] }} />
                )}
              </Stack>
              <Typography variant="h3" fontWeight={800} color={colors.grey[100]} sx={{ mb: 0.5 }}>
                {formatCurrency(kpi.value)}
              </Typography>
              <Typography variant="body2" color={colors.grey[400]} fontWeight="600">
                {kpi.label}
              </Typography>
            </Paper>
          );
        })}
      </Box>

      {/* CHARTS & RATIOS */}
      <Box display="grid" gridTemplateColumns={{ xs: "1fr", lg: "repeat(12, 1fr)" }} gap="20px" mb={3}>
        {/* REVENUE VS EXPENSES */}
        <Paper elevation={0} sx={{ ...cardSx, gridColumn: { xs: "span 1", lg: "span 8" }, minHeight: 400 }}>
          <Box mb={2}>
            <Typography variant="h5" fontWeight={800} color={colors.grey[100]}>Financial Trends</Typography>
            <Typography variant="body2" color={colors.grey[400]}>Revenue vs Expenses (Last 6 Months)</Typography>
          </Box>
          <Divider sx={{ mb: 2, borderColor: alpha(colors.grey[500], 0.15) }} />
          <Box flex="1 1 auto" minHeight="280px">
            {lineChartData.length > 0 ? (
              <LineChart isDashboard={true} data={lineChartData} />
            ) : (
              <Box display="flex" height="100%" alignItems="center" justifyContent="center">
                <Typography color={colors.grey[500]}>Insufficient trend data available.</Typography>
              </Box>
            )}
          </Box>
        </Paper>

        {/* LIQUIDITY & HEALTH */}
        <Paper elevation={0} sx={{ ...cardSx, gridColumn: { xs: "span 1", lg: "span 4" }, minHeight: 400 }}>
          <Box mb={2}>
            <Typography variant="h5" fontWeight={800} color={colors.grey[100]}>Key Ratios</Typography>
            <Typography variant="body2" color={colors.grey[400]}>Liquidity and Profitability Health</Typography>
          </Box>
          <Divider sx={{ mb: 3, borderColor: alpha(colors.grey[500], 0.15) }} />
          
          <Stack spacing={3.5} flex="1">
            <Box>
              <Stack direction="row" justifyContent="space-between" mb={1}>
                <Typography color={colors.grey[300]} fontWeight={600}>Current Ratio</Typography>
                <Typography fontWeight={800} color={ratios?.current_ratio >= 1 ? colors.greenAccent[500] : colors.redAccent[500]}>
                  {ratios?.current_ratio?.toFixed(2) ?? "0.00"}
                </Typography>
              </Stack>
              <LinearProgress variant="determinate" value={Math.min((ratios?.current_ratio || 0) * 50, 100)} sx={{ height: 6, borderRadius: 3, backgroundColor: alpha(colors.grey[500], 0.2), "& .MuiLinearProgress-bar": { backgroundColor: ratios?.current_ratio >= 1 ? colors.greenAccent[500] : colors.redAccent[500] } }} />
            </Box>

            <Box>
              <Stack direction="row" justifyContent="space-between" mb={1}>
                <Typography color={colors.grey[300]} fontWeight={600}>Quick Ratio</Typography>
                <Typography fontWeight={800} color={ratios?.quick_ratio >= 0.8 ? colors.greenAccent[500] : colors.redAccent[500]}>
                  {ratios?.quick_ratio?.toFixed(2) ?? "0.00"}
                </Typography>
              </Stack>
              <LinearProgress variant="determinate" value={Math.min((ratios?.quick_ratio || 0) * 50, 100)} sx={{ height: 6, borderRadius: 3, backgroundColor: alpha(colors.grey[500], 0.2), "& .MuiLinearProgress-bar": { backgroundColor: ratios?.quick_ratio >= 0.8 ? colors.greenAccent[500] : colors.redAccent[500] } }} />
            </Box>

            <Box>
              <Stack direction="row" justifyContent="space-between" mb={1}>
                <Typography color={colors.grey[300]} fontWeight={600}>YTD Net Margin</Typography>
                <Typography fontWeight={800} color={ratios?.net_profit_margin_ytd > 0 ? colors.greenAccent[500] : colors.redAccent[500]}>
                  {ratios?.net_profit_margin_ytd ? `${ratios.net_profit_margin_ytd}%` : "0.00%"}
                </Typography>
              </Stack>
            </Box>
          </Stack>
        </Paper>

        {/* AR AGING */}
        <Paper elevation={0} sx={{ ...cardSx, gridColumn: "1 / -1" }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
            <Box>
              <Typography variant="h5" fontWeight={800} color={colors.grey[100]}>A/R Aging Snapshot</Typography>
              <Typography variant="body2" color={colors.grey[400]}>Outstanding receivables by age</Typography>
            </Box>
            <Button variant="outlined" size="small" onClick={() => navigate("/accounts/reports")} sx={{ borderRadius: "10px", textTransform: "none", borderColor: alpha(colors.grey[500], 0.3), color: colors.grey[100] }}>
              Full Report
            </Button>
          </Stack>
          
          <Grid container spacing={2}>
            {["current", "31-60", "61-90", "90+"].map((bucket) => {
              const amount = arAging?.totals?.[bucket] || 0;
              const isWarning = bucket === "61-90" || bucket === "90+";
              return (
                <Grid item xs={6} md={3} key={bucket}>
                  <Box p={2.5} sx={{ backgroundColor: alpha(colors.primary[500], 0.4), borderRadius: "14px", textAlign: "center", border: `1px solid ${alpha(colors.grey[500], 0.1)}` }}>
                    <Typography variant="body2" color={colors.grey[400]} fontWeight={600} mb={1}>
                      {bucket === "current" ? "0 - 30 Days" : bucket === "90+" ? "Over 90 Days" : `${bucket} Days`}
                    </Typography>
                    <Typography variant="h4" fontWeight={800} color={isWarning && amount > 0 ? colors.redAccent[500] : colors.grey[100]}>
                      {formatCurrency(amount)}
                    </Typography>
                  </Box>
                </Grid>
              );
            })}
          </Grid>
        </Paper>
      </Box>
    </Box>
  );
};

export default AccountsDashboard;