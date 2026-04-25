import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  IconButton,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Stack,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { tokens } from "../../theme";
import { useAuth } from "../../api/AuthProvider";
import Header from "../../components/Header";
import LineChart from "../../components/LineChart";

import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import MonetizationOnOutlinedIcon from "@mui/icons-material/MonetizationOnOutlined";
import PointOfSaleOutlinedIcon from "@mui/icons-material/PointOfSaleOutlined";
import PersonAddAlt1OutlinedIcon from "@mui/icons-material/PersonAddAlt1Outlined";
import GroupOutlinedIcon from "@mui/icons-material/GroupOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import ShoppingCartCheckoutOutlinedIcon from "@mui/icons-material/ShoppingCartCheckoutOutlined";
import AccountBalanceWalletOutlinedIcon from "@mui/icons-material/AccountBalanceWalletOutlined";
import TrendingUpOutlinedIcon from "@mui/icons-material/TrendingUpOutlined";
import AccessTimeOutlinedIcon from "@mui/icons-material/AccessTimeOutlined";
import NorthEastOutlinedIcon from "@mui/icons-material/NorthEastOutlined";

const Dashboard = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const { apiClient, isAuthenticated } = useAuth();

  const [dashboardData, setDashboardData] = useState(null);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fatalError, setFatalError] = useState(null);
  const [warning, setWarning] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [timeframeDays, setTimeframeDays] = useState(30);

  const dashboardDataRef = useRef(null);

  useEffect(() => {
    dashboardDataRef.current = dashboardData;
  }, [dashboardData]);

  const formatCurrency = useCallback((value, currency = "KES") => {
    const number = Number(value);
    if (!Number.isFinite(number)) return `${currency} 0.00`;
    return `${currency} ${number.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }, []);

  const formatNumber = useCallback((value) => {
    const number = Number(value);
    if (!Number.isFinite(number)) return "0";
    return number.toLocaleString();
  }, []);

  const formatPercent = useCallback((value) => {
    const number = Number(value);
    if (!Number.isFinite(number)) return "0.00%";
    return `${number.toFixed(2)}%`;
  }, []);

  const formatDateTime = useCallback((dateValue) => {
    if (!dateValue) return "—";
    const dt = new Date(dateValue);
    if (!Number.isFinite(dt.getTime())) return "—";
    return dt.toLocaleString();
  }, []);

  const fetchDashboardData = useCallback(
    async ({ refresh = false, timeframe = timeframeDays } = {}) => {
      if (!isAuthenticated) return;

      if (refresh) {
        setRefreshing(true);
      } else {
        setLoadingInitial(true);
        setFatalError(null);
        setWarning(null);
      }

      try {
        const response = await apiClient.get("/dashboard", {
          params: {
            timeframe,
            ...(refresh ? { refresh: true } : {}),
          },
        });

        const payload = response?.data;
        const data = payload?.data;
        const status = payload?.status;
        const failedSections = Array.isArray(payload?.failed_sections)
          ? payload.failed_sections
          : [];
        const meta = payload?.metadata || {};

        if (!data || typeof data !== "object") {
          throw new Error(payload?.message || payload?.error || "Invalid dashboard response.");
        }

        setDashboardData(data);

        if (Number.isFinite(Number(meta.timeframe_days))) {
          setTimeframeDays(Number(meta.timeframe_days));
        }

        if (meta.generated_at) {
          const generatedDate = new Date(meta.generated_at);
          setLastUpdated(Number.isFinite(generatedDate.getTime()) ? generatedDate : new Date());
        } else {
          setLastUpdated(new Date());
        }

        if (status === "partial" || failedSections.length > 0) {
          setWarning(
            payload?.message ||
              `Partial data loaded${
                failedSections.length ? ` — unavailable: ${failedSections.join(", ")}` : ""
              }.`
          );
        } else {
          setWarning(null);
        }

        setFatalError(null);
      } catch (err) {
        console.error("Dashboard fetch error:", err);

        const message =
          err?.response?.data?.message ||
          err?.message ||
          "Could not connect to the server.";

        if (dashboardDataRef.current) {
          setWarning(`${message} Showing last loaded dashboard data.`);
        } else {
          setFatalError(message);
          setDashboardData(null);
        }
      } finally {
        setLoadingInitial(false);
        setRefreshing(false);
      }
    },
    [apiClient, isAuthenticated, timeframeDays]
  );

  useEffect(() => {
    fetchDashboardData({ refresh: false, timeframe: timeframeDays });
  }, [fetchDashboardData, timeframeDays]);

  const financialSummary = useMemo(
    () => dashboardData?.financial_summary || {},
    [dashboardData]
  );
  const salesPerformance = useMemo(
    () => dashboardData?.sales_performance || {},
    [dashboardData]
  );
  const hrmOverview = useMemo(() => dashboardData?.hrm_overview || {}, [dashboardData]);
  const inventoryStatus = useMemo(
    () => dashboardData?.inventory_status || {},
    [dashboardData]
  );
  const purchasingOverview = useMemo(
    () => dashboardData?.purchasing_overview || {},
    [dashboardData]
  );
  const recentSales = useMemo(
    () => (Array.isArray(dashboardData?.recent_sales) ? dashboardData.recent_sales : []),
    [dashboardData]
  );

  const salesTrendForChart = useMemo(() => {
    const trend = Array.isArray(salesPerformance?.sales_trend_last_6_months)
      ? salesPerformance.sales_trend_last_6_months
      : [];

    return [
      {
        id: "Sales",
        data: trend.map((item) => ({
          x: item.month || "N/A",
          y: Number(item.total_sales) || 0,
        })),
      },
    ];
  }, [salesPerformance]);

  const handleDownloadSnapshot = useCallback(() => {
    if (!dashboardData) return;

    const exportPayload = {
      exported_at: new Date().toISOString(),
      last_updated: lastUpdated ? new Date(lastUpdated).toISOString() : null,
      timeframe_days: timeframeDays,
      data: dashboardData,
    };

    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
      type: "application/json",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `dashboard_snapshot_${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [dashboardData, lastUpdated, timeframeDays]);

  const metricCards = [
    {
      title: "Revenue YTD",
      value: formatCurrency(financialSummary.revenue_ytd),
      caption: "Financial performance",
      icon: <MonetizationOnOutlinedIcon />,
      accent: colors.greenAccent[500],
    },
    {
      title: salesPerformance.context_label
        ? `${salesPerformance.context_label} This Month`
        : "Sales This Month",
      value: formatCurrency(salesPerformance.sales_value_this_month),
      caption: "Current month total",
      icon: <PointOfSaleOutlinedIcon />,
      accent: colors.blueAccent[500],
    },
    {
      title: "New Customers",
      value: formatNumber(salesPerformance.new_customers_this_month),
      caption: "This month",
      icon: <PersonAddAlt1OutlinedIcon />,
      accent: colors.greenAccent[400],
    },
    {
      title: "Active Employees",
      value: formatNumber(hrmOverview.active_employees),
      caption: "Current workforce",
      icon: <GroupOutlinedIcon />,
      accent: colors.blueAccent[400],
    },
  ];

  const cardSx = {
    borderRadius: "20px",
    p: 2.2,
    background:
      theme.palette.mode === "dark"
        ? `linear-gradient(180deg, ${alpha(colors.primary[400], 0.96)} 0%, ${alpha(
            colors.primary[500],
            0.98
          )} 100%)`
        : `linear-gradient(180deg, ${alpha("#ffffff", 0.98)} 0%, ${alpha(
            colors.primary[100],
            0.92
          )} 100%)`,
    border: `1px solid ${
      theme.palette.mode === "dark"
        ? alpha(colors.grey[700], 0.7)
        : alpha(colors.grey[700], 0.18)
    }`,
    boxShadow:
      theme.palette.mode === "dark"
        ? "0 14px 32px rgba(0,0,0,0.22)"
        : "0 14px 32px rgba(15,23,42,0.08)",
    overflow: "hidden",
    position: "relative",
  };

  const sectionTitle = (title, subtitle) => (
    <Box mb={2}>
      <Typography
        variant="h5"
        fontWeight={800}
        color={colors.grey[100]}
        sx={{ letterSpacing: "0.2px" }}
      >
        {title}
      </Typography>
      {subtitle ? (
        <Typography
          variant="body2"
          sx={{
            mt: 0.5,
            color:
              theme.palette.mode === "dark" ? colors.grey[300] : colors.grey[500],
          }}
        >
          {subtitle}
        </Typography>
      ) : null}
    </Box>
  );

  if (loadingInitial && !dashboardData) {
    return (
      <Box
        m="20px"
        display="flex"
        justifyContent="center"
        alignItems="center"
        flexDirection="column"
        gap={2}
        height="80vh"
      >
        <CircularProgress color="secondary" />
        <Typography color={colors.grey[200]} fontWeight={600}>
          Loading dashboard...
        </Typography>
      </Box>
    );
  }

  if (fatalError && !dashboardData) {
    return (
      <Box m="20px">
        <Header title="DASHBOARD" subtitle="Welcome to your dashboard" />
        <Alert severity="error" sx={{ mt: 3, borderRadius: "14px" }}>
          Failed to load dashboard data: {fatalError}
          <Button
            onClick={() => fetchDashboardData({ refresh: true, timeframe: timeframeDays })}
            sx={{ ml: 2 }}
            color="error"
          >
            Retry
          </Button>
        </Alert>
      </Box>
    );
  }

  return (
    <Box m={{ xs: "12px", md: "20px" }}>
      {/* HERO HEADER */}
      <Paper
        elevation={0}
        sx={{
          ...cardSx,
          p: { xs: 2.2, md: 3 },
          mb: 2.5,
          background:
            theme.palette.mode === "dark"
              ? `linear-gradient(135deg, ${colors.primary[400]} 0%, ${colors.blueAccent[900]} 100%)`
              : `linear-gradient(135deg, ${colors.blueAccent[800]} 0%, ${colors.blueAccent[600]} 100%)`,
          color: "#fff",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            opacity: 0.08,
            backgroundImage:
              "radial-gradient(circle at 15% 15%, #fff 0, transparent 20%), radial-gradient(circle at 85% 25%, #fff 0, transparent 18%), radial-gradient(circle at 70% 80%, #fff 0, transparent 22%)",
          }}
        />

        <Stack
          direction={{ xs: "column", lg: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", lg: "center" }}
          spacing={2}
          sx={{ position: "relative", zIndex: 1 }}
        >
          <Box>
            <Header
              title="DASHBOARD"
              subtitle={`Welcome back. Showing business performance for the last ${timeframeDays} days.`}
            />
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap mt={1.5}>
              <Chip
                icon={<AccessTimeOutlinedIcon />}
                label={`Last updated: ${formatDateTime(lastUpdated)}`}
                sx={{
                  backgroundColor: "rgba(255,255,255,0.12)",
                  color: "#fff",
                  "& .MuiChip-icon": { color: "#fff" },
                }}
              />
              <Chip
                label={warning ? "Partial Data" : "Live Data"}
                sx={{
                  backgroundColor: warning
                    ? "rgba(255, 183, 77, 0.18)"
                    : "rgba(76, 206, 172, 0.18)",
                  color: "#fff",
                  fontWeight: 700,
                }}
              />
            </Stack>
          </Box>

          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1.2}
            alignItems={{ xs: "stretch", sm: "center" }}
          >
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <Select
                value={timeframeDays}
                onChange={(e) => setTimeframeDays(Number(e.target.value))}
                sx={{
                  borderRadius: "12px",
                  color: "#fff",
                  backgroundColor: "rgba(255,255,255,0.08)",
                  "& .MuiOutlinedInput-notchedOutline": {
                    borderColor: "rgba(255,255,255,0.18)",
                  },
                  "& .MuiSvgIcon-root": {
                    color: "#fff",
                  },
                }}
              >
                <MenuItem value={7}>Last 7 days</MenuItem>
                <MenuItem value={30}>Last 30 days</MenuItem>
                <MenuItem value={90}>Last 90 days</MenuItem>
                <MenuItem value={180}>Last 180 days</MenuItem>
              </Select>
            </FormControl>

            <Tooltip title="Refresh dashboard">
              <span>
                <IconButton
                  onClick={() => fetchDashboardData({ refresh: true, timeframe: timeframeDays })}
                  disabled={refreshing}
                  sx={{
                    borderRadius: "12px",
                    backgroundColor: "rgba(255,255,255,0.08)",
                    color: "#fff",
                    "&:hover": {
                      backgroundColor: "rgba(255,255,255,0.14)",
                    },
                  }}
                >
                  {refreshing ? <CircularProgress size={22} color="inherit" /> : <RefreshRoundedIcon />}
                </IconButton>
              </span>
            </Tooltip>

            <Button
              onClick={handleDownloadSnapshot}
              startIcon={<DownloadOutlinedIcon />}
              variant="contained"
              sx={{
                borderRadius: "12px",
                px: 2,
                py: 1.1,
                textTransform: "none",
                fontWeight: 800,
                backgroundColor: "rgba(255,255,255,0.14)",
                color: "#fff",
                boxShadow: "none",
                "&:hover": {
                  backgroundColor: "rgba(255,255,255,0.22)",
                  boxShadow: "none",
                },
              }}
            >
              Download Snapshot
            </Button>
          </Stack>
        </Stack>

        {refreshing && (
          <LinearProgress
            color="secondary"
            sx={{
              mt: 2,
              borderRadius: "999px",
              height: 6,
              backgroundColor: "rgba(255,255,255,0.12)",
            }}
          />
        )}
      </Paper>

      {/* ALERTS */}
      {warning && (
        <Alert severity="warning" sx={{ mb: 2.5, borderRadius: "14px" }}>
          {warning}
        </Alert>
      )}

      {/* KPI CARDS */}
      <Box
        display="grid"
        gridTemplateColumns={{ xs: "1fr", sm: "repeat(2, 1fr)", xl: "repeat(4, 1fr)" }}
        gap="20px"
        mb={2.5}
      >
        {metricCards.map((card) => (
          <Paper key={card.title} elevation={0} sx={cardSx}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={2}>
              <Box
                sx={{
                  width: 52,
                  height: 52,
                  borderRadius: "16px",
                  display: "grid",
                  placeItems: "center",
                  backgroundColor: alpha(card.accent, 0.12),
                  color: card.accent,
                }}
              >
                {card.icon}
              </Box>

              <Chip
                label={card.caption}
                size="small"
                sx={{
                  borderRadius: "10px",
                  fontWeight: 700,
                  backgroundColor:
                    theme.palette.mode === "dark"
                      ? alpha(colors.grey[100], 0.06)
                      : alpha(colors.grey[900], 0.05),
                  color:
                    theme.palette.mode === "dark" ? colors.grey[200] : colors.grey[600],
                }}
              />
            </Stack>

            <Typography
              variant="h3"
              fontWeight={800}
              color={colors.grey[100]}
              sx={{ lineHeight: 1.2 }}
            >
              {card.value}
            </Typography>

            <Typography
              variant="body1"
              sx={{
                mt: 0.8,
                color:
                  theme.palette.mode === "dark" ? colors.grey[300] : colors.grey[500],
                fontWeight: 600,
              }}
            >
              {card.title}
            </Typography>
          </Paper>
        ))}
      </Box>

      {/* MAIN CONTENT */}
      <Box
        display="grid"
        gridTemplateColumns={{ xs: "1fr", lg: "repeat(12, 1fr)" }}
        gap="20px"
      >
        {/* SALES TREND */}
        <Paper
          elevation={0}
          sx={{
            ...cardSx,
            gridColumn: { xs: "span 1", lg: "span 8" },
            minHeight: 420,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Stack
            direction={{ xs: "column", sm: "row" }}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", sm: "center" }}
            spacing={1.5}
            mb={1}
          >
            <Box>
              {sectionTitle(
                salesPerformance.context_label
                  ? `${salesPerformance.context_label} Trend`
                  : "Sales Trend",
                "Monthly sales trend for the most recent 6-month period"
              )}
            </Box>

            <Stack alignItems={{ xs: "flex-start", sm: "flex-end" }}>
              <Typography variant="h4" fontWeight={800} color={colors.greenAccent[500]}>
                {formatCurrency(salesPerformance.sales_value_this_month)}
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color:
                    theme.palette.mode === "dark" ? colors.grey[300] : colors.grey[500],
                }}
              >
                Current month total
              </Typography>
            </Stack>
          </Stack>

          <Divider sx={{ mb: 1.5, borderColor: alpha(colors.grey[500], 0.15) }} />

          <Box flex="1 1 auto" minHeight="280px" mt={1}>
            <LineChart isDashboard={true} data={salesTrendForChart} />
          </Box>
        </Paper>

        {/* RECENT SALES */}
        <Paper
          elevation={0}
          sx={{
            ...cardSx,
            gridColumn: { xs: "span 1", lg: "span 4" },
            minHeight: 420,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {sectionTitle("Recent Sales", "Latest transactions and order activity")}

          <Stack spacing={1.2} sx={{ overflow: "auto", pr: 0.5 }}>
            {recentSales.slice(0, 8).map((sale, index) => (
              <Box
                key={sale.id || `sale-${index}`}
                sx={{
                  p: 1.4,
                  borderRadius: "14px",
                  backgroundColor:
                    theme.palette.mode === "dark"
                      ? alpha(colors.primary[500], 0.5)
                      : alpha(colors.primary[200], 0.85),
                  border: `1px solid ${
                    theme.palette.mode === "dark"
                      ? alpha(colors.grey[700], 0.5)
                      : alpha(colors.grey[700], 0.12)
                  }`,
                }}
              >
                <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1.5}>
                  <Box minWidth={0}>
                    <Typography
                      variant="body1"
                      fontWeight={700}
                      color={colors.grey[100]}
                      noWrap
                    >
                      {sale.customer?.name || `Order #${sale.order_number || "N/A"}`}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        mt: 0.3,
                        color:
                          theme.palette.mode === "dark"
                            ? colors.grey[300]
                            : colors.grey[500],
                      }}
                    >
                      {sale.order_date
                        ? new Date(sale.order_date).toLocaleDateString()
                        : "No date"}
                    </Typography>
                  </Box>

                  <Chip
                    label={formatCurrency(sale.total_amount)}
                    sx={{
                      fontWeight: 800,
                      backgroundColor: alpha(colors.greenAccent[500], 0.14),
                      color: colors.greenAccent[500],
                    }}
                  />
                </Stack>
              </Box>
            ))}

            {recentSales.length === 0 && (
              <Box
                sx={{
                  py: 6,
                  textAlign: "center",
                  color:
                    theme.palette.mode === "dark" ? colors.grey[300] : colors.grey[500],
                }}
              >
                <Typography fontWeight={600}>No recent sales activity.</Typography>
              </Box>
            )}
          </Stack>
        </Paper>

        {/* INVENTORY */}
        <Paper
          elevation={0}
          sx={{
            ...cardSx,
            gridColumn: { xs: "span 1", lg: "span 4" },
            minHeight: 240,
          }}
        >
          <Stack direction="row" spacing={1.2} alignItems="center" mb={2}>
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: "14px",
                display: "grid",
                placeItems: "center",
                backgroundColor: alpha(colors.greenAccent[500], 0.12),
                color: colors.greenAccent[500],
              }}
            >
              <Inventory2OutlinedIcon />
            </Box>
            <Box>
              <Typography variant="h5" fontWeight={800} color={colors.grey[100]}>
                Inventory Status
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color:
                    theme.palette.mode === "dark" ? colors.grey[300] : colors.grey[500],
                }}
              >
                Stock availability and current inventory value
              </Typography>
            </Box>
          </Stack>

          <Stack spacing={1.6}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography color={colors.grey[100]} fontWeight={600}>
                Low Stock Items
              </Typography>
              <Chip
                label={formatNumber(inventoryStatus.products_low_on_stock)}
                sx={{
                  fontWeight: 800,
                  backgroundColor: alpha(colors.greenAccent[500], 0.14),
                  color: colors.greenAccent[500],
                }}
              />
            </Stack>

            <Divider sx={{ borderColor: alpha(colors.grey[500], 0.15) }} />

            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography color={colors.grey[100]} fontWeight={600}>
                Total Inventory Value
              </Typography>
              <Typography color={colors.greenAccent[500]} fontWeight={800}>
                {formatCurrency(inventoryStatus.total_inventory_value)}
              </Typography>
            </Stack>
          </Stack>
        </Paper>

        {/* PURCHASING */}
        <Paper
          elevation={0}
          sx={{
            ...cardSx,
            gridColumn: { xs: "span 1", lg: "span 4" },
            minHeight: 240,
          }}
        >
          <Stack direction="row" spacing={1.2} alignItems="center" mb={2}>
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: "14px",
                display: "grid",
                placeItems: "center",
                backgroundColor: alpha(colors.blueAccent[500], 0.12),
                color: colors.blueAccent[500],
              }}
            >
              <ShoppingCartCheckoutOutlinedIcon />
            </Box>
            <Box>
              <Typography variant="h5" fontWeight={800} color={colors.grey[100]}>
                Purchasing
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color:
                    theme.palette.mode === "dark" ? colors.grey[300] : colors.grey[500],
                }}
              >
                Open purchase orders and total procurement value
              </Typography>
            </Box>
          </Stack>

          <Stack spacing={1.6}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography color={colors.grey[100]} fontWeight={600}>
                Open POs
              </Typography>
              <Chip
                label={formatNumber(purchasingOverview.open_purchase_orders_count)}
                sx={{
                  fontWeight: 800,
                  backgroundColor: alpha(colors.blueAccent[500], 0.14),
                  color: colors.blueAccent[500],
                }}
              />
            </Stack>

            <Divider sx={{ borderColor: alpha(colors.grey[500], 0.15) }} />

            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography color={colors.grey[100]} fontWeight={600}>
                Open PO Value
              </Typography>
              <Typography color={colors.greenAccent[500]} fontWeight={800}>
                {formatCurrency(purchasingOverview.open_purchase_orders_value)}
              </Typography>
            </Stack>
          </Stack>
        </Paper>

        {/* FINANCIAL HEALTH */}
        <Paper
          elevation={0}
          sx={{
            ...cardSx,
            gridColumn: { xs: "span 1", lg: "span 4" },
            minHeight: 240,
          }}
        >
          <Stack direction="row" spacing={1.2} alignItems="center" mb={2}>
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: "14px",
                display: "grid",
                placeItems: "center",
                backgroundColor: alpha(colors.greenAccent[500], 0.12),
                color: colors.greenAccent[500],
              }}
            >
              <AccountBalanceWalletOutlinedIcon />
            </Box>
            <Box>
              <Typography variant="h5" fontWeight={800} color={colors.grey[100]}>
                Financial Health
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color:
                    theme.palette.mode === "dark" ? colors.grey[300] : colors.grey[500],
                }}
              >
                Profitability and liquidity indicators
              </Typography>
            </Box>
          </Stack>

          <Stack spacing={1.6}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography color={colors.grey[100]} fontWeight={600}>
                Profit Margin (YTD)
              </Typography>
              <Chip
                icon={<TrendingUpOutlinedIcon />}
                label={formatPercent(financialSummary.profit_margin_ytd)}
                sx={{
                  fontWeight: 800,
                  backgroundColor: alpha(colors.greenAccent[500], 0.14),
                  color: colors.greenAccent[500],
                }}
              />
            </Stack>

            <Divider sx={{ borderColor: alpha(colors.grey[500], 0.15) }} />

            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography color={colors.grey[100]} fontWeight={600}>
                Cash Balance
              </Typography>
              <Typography color={colors.greenAccent[500]} fontWeight={800}>
                {formatCurrency(financialSummary.cash_balance)}
              </Typography>
            </Stack>
          </Stack>
        </Paper>
      </Box>

      {/* FOOTER */}
      <Paper
        elevation={0}
        sx={{
          ...cardSx,
          mt: 2.5,
          p: 1.8,
        }}
      >
        <Stack
          direction={{ xs: "column", md: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", md: "center" }}
          spacing={1}
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <AccessTimeOutlinedIcon sx={{ color: colors.grey[400], fontSize: 18 }} />
            <Typography variant="body2" color={colors.grey[400]}>
              Last updated: {formatDateTime(lastUpdated)}
            </Typography>
          </Stack>

          <Stack direction="row" spacing={1} alignItems="center">
            <NorthEastOutlinedIcon sx={{ color: colors.greenAccent[500], fontSize: 18 }} />
            <Typography variant="body2" color={colors.grey[400]}>
              Dashboard reflects backend-generated business summary for the selected timeframe.
            </Typography>
          </Stack>
        </Stack>
      </Paper>
    </Box>
  );
};

export default Dashboard;