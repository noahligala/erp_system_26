import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  CircularProgress,
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
  Skeleton,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "../../api/AuthProvider";
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
import AccessTimeOutlinedIcon from "@mui/icons-material/AccessTimeOutlined";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";

const getMetricColor = (theme, type) => {
  switch (type) {
    case "success":
      return theme.palette.success.main;
    case "info":
      return theme.palette.info.main;
    case "warning":
      return theme.palette.warning.main;
    case "error":
      return theme.palette.error.main;
    default:
      return theme.palette.primary.main;
  }
};

const getAccentVars = (color) => ({
  "--accent": color,
  "--accent-bg": alpha(color, 0.1),
  "--accent-border": alpha(color, 0.16),
  "--accent-border-strong": alpha(color, 0.28),
});

const safeNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const DashboardSkeleton = () => {
  const theme = useTheme();
  const styles = theme.dashboard;

  return (
    <Box sx={styles.shell}>
      <Skeleton
        variant="rounded"
        width="100%"
        height={140}
        sx={{ mb: 2.5, borderRadius: "14px" }}
      />

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, minmax(0, 1fr))",
            xl: "repeat(4, minmax(0, 1fr))",
          },
          gap: { xs: 1.5, md: 2 },
          mb: 2.5,
        }}
      >
        {[1, 2, 3, 4].map((item) => (
          <Skeleton
            key={item}
            variant="rounded"
            height={132}
            sx={{ borderRadius: "14px" }}
          />
        ))}
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "repeat(12, minmax(0, 1fr))" },
          gap: { xs: 1.5, md: 2 },
        }}
      >
        <Skeleton
          variant="rounded"
          height={380}
          sx={{
            gridColumn: { xs: "span 1", lg: "span 8" },
            borderRadius: "14px",
          }}
        />

        <Skeleton
          variant="rounded"
          height={380}
          sx={{
            gridColumn: { xs: "span 1", lg: "span 4" },
            borderRadius: "14px",
          }}
        />
      </Box>
    </Box>
  );
};

const SectionTitle = ({ title, subtitle, icon, action }) => {
  const theme = useTheme();
  const styles = theme.dashboard;

  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      justifyContent="space-between"
      alignItems={{ xs: "flex-start", sm: "center" }}
      spacing={1.25}
      mb={1.25}
    >
      <Stack direction="row" spacing={1.1} alignItems="flex-start" minWidth={0}>
        {icon && <Box sx={{ mt: 0.1, flexShrink: 0 }}>{icon}</Box>}

        <Box minWidth={0}>
          <Typography sx={styles.sectionTitle}>{title}</Typography>

          {subtitle && (
            <Typography sx={styles.sectionSubtitle}>{subtitle}</Typography>
          )}
        </Box>
      </Stack>

      {action}
    </Stack>
  );
};

const AccentIcon = ({ icon, color, small = false }) => {
  const theme = useTheme();
  const styles = theme.dashboard;

  return (
    <Box
      sx={small ? styles.iconBoxSmall : styles.iconBox}
      style={getAccentVars(color)}
    >
      {icon}
    </Box>
  );
};

const EmptyState = ({ title, subtitle }) => {
  const theme = useTheme();
  const styles = theme.dashboard;

  return (
    <Box
      sx={{
        height: "100%",
        minHeight: 180,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        px: 2,
        textAlign: "center",
      }}
    >
      <Box>
        <Box
          sx={{
            width: 38,
            height: 38,
            mx: "auto",
            mb: 1.25,
            borderRadius: "12px",
            border: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
            bgcolor: alpha(theme.palette.primary.main, 0.045),
          }}
        />

        <Typography
          sx={{
            fontSize: "0.8rem",
            fontWeight: 500,
            color: "text.primary",
          }}
        >
          {title}
        </Typography>

        {subtitle && (
          <Typography
            sx={{
              mt: 0.4,
              fontSize: "0.7rem",
              color: "text.secondary",
              fontWeight: 400,
              lineHeight: 1.55,
            }}
          >
            {subtitle}
          </Typography>
        )}
      </Box>
    </Box>
  );
};

const MetricCard = ({ card, onClick }) => {
  const theme = useTheme();
  const styles = theme.dashboard;
  const color = getMetricColor(theme, card.colorType);

  return (
    <Paper
      elevation={0}
      onClick={onClick}
      sx={{
        ...styles.card,
        ...styles.metricCard,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
      style={getAccentVars(color)}
    >
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="flex-start"
        spacing={1.25}
        mb={1.75}
      >
        <AccentIcon icon={card.icon} color={color} />

        <Chip
          label={card.caption}
          size="small"
          sx={{
            fontWeight: 400,
            fontSize: "0.64rem",
            height: 20,
            borderRadius: "999px",
            backgroundColor: alpha(color, 0.08),
            color,
            maxWidth: 130,
          }}
        />
      </Stack>

      <Box>
        <Typography sx={styles.metricValue}>{card.value}</Typography>
        <Typography sx={styles.metricTitle}>{card.title}</Typography>

        {card.helper && (
          <Typography
            sx={{
              mt: 0.45,
              color: "text.disabled",
              fontSize: "0.66rem",
              fontWeight: 400,
            }}
          >
            {card.helper}
          </Typography>
        )}
      </Box>
    </Paper>
  );
};

const HeroSummaryItem = ({ label, value, color }) => (
  <Box
    sx={{
      minWidth: 0,
      py: 0.35,
    }}
  >
    <Typography
      sx={{
        fontSize: "0.66rem",
        color: "rgba(255,255,255,0.72)",
        fontWeight: 400,
      }}
    >
      {label}
    </Typography>

    <Typography
      sx={{
        mt: 0.25,
        color: "#fff",
        fontSize: { xs: "0.84rem", md: "0.92rem" },
        fontWeight: 500,
        lineHeight: 1.25,
      }}
      noWrap
    >
      {value}
    </Typography>
  </Box>
);

const ModuleCard = ({ icon, title, subtitle, rows, route, color }) => {
  const theme = useTheme();
  const styles = theme.dashboard;
  const navigate = useNavigate();
  const accent = color || theme.palette.primary.main;

  return (
    <Paper
      elevation={0}
      onClick={() => navigate(route)}
      sx={{
        ...styles.card,
        ...styles.moduleCard,
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Stack direction="row" spacing={1.25} alignItems="center" mb={2}>
        <AccentIcon icon={icon} color={accent} small />

        <Box minWidth={0}>
          <Typography sx={styles.moduleTitle} noWrap>
            {title}
          </Typography>
          <Typography sx={styles.moduleSubtitle} noWrap>
            {subtitle}
          </Typography>
        </Box>

        <ArrowForwardRoundedIcon
          sx={{
            ml: "auto",
            color: "text.disabled",
            fontSize: 18,
            flexShrink: 0,
          }}
        />
      </Stack>

      <Stack spacing={1.35} sx={{ mt: "auto" }}>
        {rows.map((row, index) => (
          <Box key={row.label}>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              spacing={1.5}
            >
              <Typography sx={styles.moduleRowLabel} noWrap>
                {row.label}
              </Typography>

              <Typography
                sx={{
                  ...styles.moduleRowValue,
                  color: row.color || "text.primary",
                  textAlign: "right",
                  whiteSpace: "nowrap",
                }}
              >
                {row.value}
              </Typography>
            </Stack>

            {index < rows.length - 1 && <Divider sx={{ mt: 1.35 }} />}
          </Box>
        ))}
      </Stack>
    </Paper>
  );
};

const RecentSaleItem = ({ sale, onClick, formatCurrency }) => {
  const theme = useTheme();
  const styles = theme.dashboard;

  return (
    <Box onClick={onClick} sx={styles.saleItem}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1.5}>
        <Stack direction="row" spacing={1.1} alignItems="center" minWidth={0}>
          <AccentIcon
            small
            icon={<ReceiptLongOutlinedIcon fontSize="small" />}
            color={theme.palette.primary.main}
          />

          <Box minWidth={0}>
            <Typography sx={styles.salePrimary} noWrap>
              {sale.customer?.name || `Order #${sale.order_number || "N/A"}`}
            </Typography>

            <Typography sx={styles.saleSecondary}>
              {sale.order_date
                ? new Date(sale.order_date).toLocaleDateString()
                : "No date"}
            </Typography>
          </Box>
        </Stack>

        <Typography sx={styles.saleAmount}>
          {formatCurrency(sale.total_amount)}
        </Typography>
      </Stack>
    </Box>
  );
};

const Dashboard = () => {
  const theme = useTheme();
  const styles = theme.dashboard;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { apiClient, isAuthenticated, user } = useAuth();

  const [timeframeDays, setTimeframeDays] = useState(30);

  const orgCurrency = user?.company?.currency || "KES";

  const formatCurrency = useCallback(
    (value) => {
      const number = safeNumber(value);
      if (number == null) return "—";

      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: orgCurrency,
        maximumFractionDigits: 0,
      }).format(number);
    },
    [orgCurrency]
  );

  const formatNumber = useCallback((value) => {
    const number = safeNumber(value);
    if (number == null) return "—";

    return new Intl.NumberFormat().format(number);
  }, []);

  const formatPercent = useCallback((value) => {
    const number = safeNumber(value);
    if (number == null) return "—";

    return `${number.toFixed(2)}%`;
  }, []);

  const formatDateTime = useCallback((dateValue) => {
    if (!dateValue) return "—";

    const dt = new Date(dateValue);

    if (!Number.isFinite(dt.getTime())) return "—";

    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(dt);
  }, []);

  const fetchDashboard = async ({ queryKey, signal }) => {
    const [, timeframe] = queryKey;

    const response = await apiClient.get("/dashboard", {
      params: { timeframe },
      signal,
    });

    if (!response?.data?.data) {
      throw new Error(response?.data?.message || "Invalid dashboard response.");
    }

    return response.data;
  };

  const {
    data: payload,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["dashboard", timeframeDays],
    queryFn: fetchDashboard,
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30000),
  });

  const dashboardData = payload?.data;
  const meta = payload?.metadata || {};
  const status = payload?.status;
  const failedSections = Array.isArray(payload?.failed_sections)
    ? payload.failed_sections
    : [];

  const lastUpdated = meta.generated_at ? new Date(meta.generated_at) : new Date();

  const warning =
    status === "partial" || failedSections.length > 0
      ? payload?.message ||
        `Partial data loaded. Unavailable: ${failedSections.join(", ")}`
      : null;

  const financialSummary = useMemo(
    () => dashboardData?.financial_summary || {},
    [dashboardData]
  );

  const salesPerformance = useMemo(
    () => dashboardData?.sales_performance || {},
    [dashboardData]
  );

  const hrmOverview = useMemo(
    () => dashboardData?.hrm_overview || {},
    [dashboardData]
  );

  const inventoryStatus = useMemo(
    () => dashboardData?.inventory_status || {},
    [dashboardData]
  );

  const purchasingOverview = useMemo(
    () => dashboardData?.purchasing_overview || {},
    [dashboardData]
  );

  const recentSales = useMemo(
    () =>
      Array.isArray(dashboardData?.recent_sales)
        ? dashboardData.recent_sales
        : [],
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
          y: Number.isFinite(Number(item.total_sales))
            ? Number(item.total_sales)
            : 0,
        })),
      },
    ];
  }, [salesPerformance]);

  const handleDownloadSnapshot = useCallback(() => {
    if (!dashboardData) return;

    const exportPayload = {
      exported_at: new Date().toISOString(),
      last_updated: lastUpdated.toISOString(),
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
    link.click();

    URL.revokeObjectURL(url);
  }, [dashboardData, lastUpdated, timeframeDays]);

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: ["dashboard", timeframeDays],
    });

    refetch();
  }, [queryClient, refetch, timeframeDays]);

  const metricCards = useMemo(
    () => [
      {
        title: "Revenue YTD",
        value: formatCurrency(financialSummary.revenue_ytd),
        caption: financialSummary.revenue_ytd == null ? "No data" : "YTD",
        helper: "Financial performance",
        icon: <MonetizationOnOutlinedIcon />,
        colorType: "success",
        route: "/finance/revenue",
      },
      {
        title: salesPerformance.context_label
          ? `${salesPerformance.context_label} This Month`
          : "Sales This Month",
        value: formatCurrency(salesPerformance.sales_value_this_month),
        caption: salesPerformance.sales_value_this_month == null ? "No data" : "Month",
        helper: "Current month total",
        icon: <PointOfSaleOutlinedIcon />,
        colorType: "primary",
        route: "/sales/orders",
      },
      {
        title: "New Customers",
        value: formatNumber(salesPerformance.new_customers_this_month),
        caption: "This month",
        helper: "Customer growth",
        icon: <PersonAddAlt1OutlinedIcon />,
        colorType: "info",
        route: "/crm/customers",
      },
      {
        title: "Active Employees",
        value: formatNumber(hrmOverview.active_employees),
        caption: "Live",
        helper: "Current workforce",
        icon: <GroupOutlinedIcon />,
        colorType: "warning",
        route: "/hrm/team",
      },
    ],
    [
      financialSummary,
      salesPerformance,
      hrmOverview,
      formatCurrency,
      formatNumber,
    ]
  );

  const heroStats = useMemo(
    () => [
      {
        label: "Revenue YTD",
        value: formatCurrency(financialSummary.revenue_ytd),
      },
      {
        label: "Cash Balance",
        value: formatCurrency(financialSummary.cash_balance),
      },
      {
        label: "Profit Margin",
        value: formatPercent(financialSummary.profit_margin_ytd),
      },
      {
        label: "Inventory Value",
        value: formatCurrency(inventoryStatus.total_inventory_value),
      },
    ],
    [financialSummary, inventoryStatus, formatCurrency, formatPercent]
  );

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (isError && !dashboardData) {
    return (
      <Box sx={styles.shell}>
        <Paper elevation={0} sx={{ ...styles.card, mb: 2.5 }}>
          <Stack spacing={0.75}>
            <Typography
              sx={{
                fontSize: { xs: "1.15rem", md: "1.35rem" },
                fontWeight: 500,
                letterSpacing: "-0.025em",
                color: "text.primary",
              }}
            >
              Dashboard
            </Typography>

            <Typography sx={{ fontSize: "0.78rem", color: "text.secondary" }}>
              Welcome to your enterprise overview.
            </Typography>
          </Stack>
        </Paper>

        <Alert
          severity="error"
          sx={{ mb: 2.5 }}
          action={
            <Button onClick={() => refetch()} color="inherit" size="small">
              Retry
            </Button>
          }
        >
          Failed to load dashboard data: {error.message}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={styles.shell}>
      <Paper elevation={0} sx={{ ...styles.card, ...styles.heroCard }}>
        <Stack
          direction={{ xs: "column", lg: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", lg: "center" }}
          spacing={2.25}
          sx={{ position: "relative", zIndex: 1 }}
        >
          <Box minWidth={0}>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap mb={1}>
              <Chip
                icon={<ShieldOutlinedIcon sx={{ fontSize: 14 }} />}
                size="small"
                label="Enterprise Overview"
                sx={styles.heroChip}
              />

              <Chip
                icon={<AccessTimeOutlinedIcon sx={{ fontSize: 14 }} />}
                size="small"
                label={`Updated ${formatDateTime(lastUpdated)}`}
                sx={styles.heroChip}
              />

              {warning && (
                <Chip
                  size="small"
                  label="Partial Data"
                  sx={styles.heroWarningChip}
                />
              )}
            </Stack>

            <Typography
              sx={{
                color: "#fff",
                fontSize: { xs: "1.35rem", sm: "1.55rem", md: "1.85rem" },
                fontWeight: 500,
                letterSpacing: "-0.035em",
                lineHeight: 1.08,
              }}
            >
              Business Command Center
            </Typography>

            <Typography
              sx={{
                mt: 0.85,
                maxWidth: 720,
                color: "rgba(255,255,255,0.74)",
                fontSize: { xs: "0.76rem", md: "0.84rem" },
                lineHeight: 1.6,
                fontWeight: 400,
              }}
            >
              Monitor revenue, sales activity, customers, workforce, inventory, and procurement
              from a single operational dashboard.
            </Typography>
          </Box>

          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1}
            alignItems={{ xs: "stretch", sm: "center" }}
            width={{ xs: "100%", lg: "auto" }}
          >
            <FormControl size="small" sx={styles.heroSelect}>
              <Select
                value={timeframeDays}
                onChange={(event) => setTimeframeDays(Number(event.target.value))}
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
                  onClick={handleRefresh}
                  disabled={isFetching}
                  sx={styles.heroIconButton}
                >
                  {isFetching ? (
                    <CircularProgress size={18} color="inherit" />
                  ) : (
                    <RefreshRoundedIcon fontSize="small" />
                  )}
                </IconButton>
              </span>
            </Tooltip>

            <Button
              onClick={handleDownloadSnapshot}
              startIcon={<DownloadOutlinedIcon fontSize="small" />}
              variant="contained"
              sx={styles.heroButton}
            >
              Export
            </Button>
          </Stack>
        </Stack>

        <Divider sx={{ my: 2, borderColor: "rgba(255,255,255,0.14)" }} />

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "repeat(2, minmax(0, 1fr))",
              lg: "repeat(4, minmax(0, 1fr))",
            },
            gap: { xs: 1.25, md: 2 },
            position: "relative",
            zIndex: 1,
          }}
        >
          {heroStats.map((item) => (
            <HeroSummaryItem key={item.label} label={item.label} value={item.value} />
          ))}
        </Box>

        {isFetching && !isLoading && (
          <LinearProgress
            sx={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: 3,
              backgroundColor: "rgba(255,255,255,0.1)",
              "& .MuiLinearProgress-bar": {
                backgroundColor: "#fff",
              },
            }}
          />
        )}
      </Paper>

      {warning && (
        <Alert severity="warning" sx={{ mb: 2.5 }}>
          {warning}
        </Alert>
      )}

      {isError && dashboardData && (
        <Alert severity="info" sx={{ mb: 2.5 }}>
          Background refresh failed. Showing cached data.
        </Alert>
      )}

      <Box
        sx={{
          opacity: isFetching && !isLoading ? 0.72 : 1,
          transition: "opacity 120ms ease",
          pointerEvents: isFetching ? "none" : "auto",
        }}
      >
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(2, minmax(0, 1fr))",
              xl: "repeat(4, minmax(0, 1fr))",
            },
            gap: { xs: 1.5, md: 2 },
            mb: 2.5,
          }}
        >
          {metricCards.map((card) => (
            <MetricCard
              key={card.title}
              card={card}
              onClick={() => navigate(card.route)}
            />
          ))}
        </Box>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", lg: "repeat(12, minmax(0, 1fr))" },
            gap: { xs: 1.5, md: 2 },
          }}
        >
          <Paper elevation={0} sx={{ ...styles.card, ...styles.chartCard }}>
            <SectionTitle
              title={
                salesPerformance.context_label
                  ? `${salesPerformance.context_label} Trend`
                  : "Sales Trend"
              }
              subtitle="Monthly sales trend for the most recent 6-month period."
              icon={
                <AccentIcon
                  icon={<TrendingUpRoundedIcon fontSize="small" />}
                  color={theme.palette.primary.main}
                  small
                />
              }
              action={
                <Chip
                  size="small"
                  label={formatCurrency(salesPerformance.sales_value_this_month)}
                  sx={{
                    borderRadius: "999px",
                    bgcolor: alpha(theme.palette.primary.main, 0.08),
                    color: theme.palette.primary.main,
                    fontSize: "0.66rem",
                    fontWeight: 400,
                  }}
                />
              }
            />

            <Divider sx={{ mb: 1 }} />

            <Box flex="1 1 auto" minHeight="260px" mt={1} sx={{ px: 0.5 }}>
              {salesTrendForChart[0]?.data?.length > 0 ? (
                <LineChart isDashboard data={salesTrendForChart} />
              ) : (
                <EmptyState
                  title="No trend data"
                  subtitle="Sales trend data will appear here once available."
                />
              )}
            </Box>
          </Paper>

          <Paper elevation={0} sx={{ ...styles.card, ...styles.sideCard }}>
            <SectionTitle
              title="Recent Sales"
              subtitle="Latest transactions and order activity."
              icon={
                <AccentIcon
                  icon={<PointOfSaleOutlinedIcon fontSize="small" />}
                  color={theme.palette.success.main}
                  small
                />
              }
              action={
                <Button
                  size="small"
                  onClick={() => navigate("/sales/orders")}
                  endIcon={<ArrowForwardRoundedIcon fontSize="small" />}
                  sx={{ textTransform: "none", fontSize: "0.7rem" }}
                >
                  View All
                </Button>
              }
            />

            <Divider sx={{ mb: 1 }} />

            <Stack spacing={1} sx={{ overflow: "auto", pr: 0.5, mt: 0.5 }}>
              {recentSales.slice(0, 8).map((sale, index) => (
                <RecentSaleItem
                  key={sale.id || `sale-${index}`}
                  sale={sale}
                  formatCurrency={formatCurrency}
                  onClick={() => {
                    if (sale.id) navigate(`/sales/orders/${sale.id}`);
                  }}
                />
              ))}

              {recentSales.length === 0 && (
                <EmptyState
                  title="No recent sales"
                  subtitle="Recent sales activity will appear here."
                />
              )}
            </Stack>
          </Paper>

          <ModuleCard
            route="/inventory"
            color={theme.palette.info.main}
            icon={<Inventory2OutlinedIcon fontSize="small" />}
            title="Inventory Status"
            subtitle="Stock availability and value"
            rows={[
              {
                label: "Low Stock Items",
                value: formatNumber(inventoryStatus.products_low_on_stock),
              },
              {
                label: "Total Value",
                value: formatCurrency(inventoryStatus.total_inventory_value),
              },
            ]}
          />

          <ModuleCard
            route="/purchasing"
            color={theme.palette.warning.main}
            icon={<ShoppingCartCheckoutOutlinedIcon fontSize="small" />}
            title="Purchasing"
            subtitle="Procurement overview"
            rows={[
              {
                label: "Open POs",
                value: formatNumber(purchasingOverview.open_purchase_orders_count),
              },
              {
                label: "Open PO Value",
                value: formatCurrency(purchasingOverview.open_purchase_orders_value),
              },
            ]}
          />

          <ModuleCard
            route="/finance"
            color={theme.palette.success.main}
            icon={<AccountBalanceWalletOutlinedIcon fontSize="small" />}
            title="Financial Health"
            subtitle="Profitability indicators"
            rows={[
              {
                label: "Profit Margin (YTD)",
                value: formatPercent(financialSummary.profit_margin_ytd),
                color: theme.palette.success.main,
              },
              {
                label: "Cash Balance",
                value: formatCurrency(financialSummary.cash_balance),
              },
            ]}
          />
        </Box>
      </Box>
    </Box>
  );
};

export default Dashboard;