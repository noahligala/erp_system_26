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
import { useQuery, useQueryClient } from "@tanstack/react-query";

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
import AccessTimeOutlinedIcon from "@mui/icons-material/AccessTimeOutlined";

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

const DashboardSkeleton = () => {
  const theme = useTheme();
  const styles = theme.dashboard;

  return (
    <Box sx={styles.shell}>
      <Skeleton
        variant="rounded"
        width="100%"
        height={112}
        sx={{ mb: 2.5, borderRadius: "14px" }}
      />

      <Box
        display="grid"
        gridTemplateColumns={{
          xs: "1fr",
          sm: "repeat(2, 1fr)",
          xl: "repeat(4, 1fr)",
        }}
        gap={2}
        mb={2.5}
      >
        {[1, 2, 3, 4].map((i) => (
          <Skeleton
            key={i}
            variant="rounded"
            height={132}
            sx={{ borderRadius: "14px" }}
          />
        ))}
      </Box>

      <Box
        display="grid"
        gridTemplateColumns={{ xs: "1fr", lg: "repeat(12, 1fr)" }}
        gap={2}
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

const SectionTitle = ({ title, subtitle }) => {
  const theme = useTheme();
  const styles = theme.dashboard;

  return (
    <Box>
      <Typography sx={styles.sectionTitle}>{title}</Typography>
      {subtitle && <Typography sx={styles.sectionSubtitle}>{subtitle}</Typography>}
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
      }}
      style={{
        "--accent": color,
        "--accent-border-strong": alpha(color, 0.28),
      }}
    >
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="flex-start"
        mb={1.75}
      >
        <Box
          sx={styles.iconBox}
          style={{
            "--accent": color,
            "--accent-bg": alpha(color, 0.1),
            "--accent-border": alpha(color, 0.16),
          }}
        >
          {card.icon}
        </Box>

        <Chip
          label={card.caption}
          sx={{
            fontWeight: 400,
            fontSize: "0.64rem",
            height: 20,
            borderRadius: "999px",
            backgroundColor: alpha(color, 0.08),
            color,
          }}
        />
      </Stack>

      <Typography sx={styles.metricValue}>{card.value}</Typography>
      <Typography sx={styles.metricTitle}>{card.title}</Typography>
    </Paper>
  );
};

const ModuleCard = ({ icon, title, subtitle, rows, route }) => {
  const theme = useTheme();
  const styles = theme.dashboard;
  const navigate = useNavigate();

  return (
    <Paper
      elevation={0}
      onClick={() => navigate(route)}
      sx={{
        ...styles.card,
        ...styles.moduleCard,
      }}
    >
      <Stack direction="row" spacing={1.25} alignItems="center" mb={2}>
        <Box sx={styles.iconBox(theme.palette.primary.main, 36, "10px")}>
          {icon}
        </Box>

        <Box>
          <Typography sx={styles.moduleTitle}>{title}</Typography>
          <Typography sx={styles.moduleSubtitle}>{subtitle}</Typography>
        </Box>
      </Stack>

      <Stack spacing={1.5}>
        {rows.map((row, index) => (
          <Box key={row.label}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography sx={styles.moduleRowLabel}>{row.label}</Typography>
              <Typography
                sx={{
                  ...styles.moduleRowValue,
                  color: row.color || "text.primary",
                }}
              >
                {row.value}
              </Typography>
            </Stack>

            {index < rows.length - 1 && <Divider sx={{ mt: 1.5 }} />}
          </Box>
        ))}
      </Stack>
    </Paper>
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
      if (value == null) return "—";

      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: orgCurrency,
      }).format(value);
    },
    [orgCurrency]
  );

  const formatNumber = useCallback((value) => {
    if (value == null) return "—";
    return new Intl.NumberFormat().format(value);
  }, []);

  const formatPercent = useCallback((value) => {
    if (value == null) return "—";
    return `${Number(value).toFixed(2)}%`;
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
    const [_key, timeframe] = queryKey;

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
            : null,
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

  const metricCards = useMemo(
    () => [
      {
        title: "Revenue YTD",
        value:
          financialSummary.revenue_ytd == null
            ? "—"
            : formatCurrency(financialSummary.revenue_ytd),
        caption:
          financialSummary.revenue_ytd == null
            ? "No data"
            : "Financial performance",
        icon: <MonetizationOnOutlinedIcon />,
        colorType: "success",
        route: "/finance/revenue",
      },
      {
        title: salesPerformance.context_label
          ? `${salesPerformance.context_label} This Month`
          : "Sales This Month",
        value:
          salesPerformance.sales_value_this_month == null
            ? "—"
            : formatCurrency(salesPerformance.sales_value_this_month),
        caption:
          salesPerformance.sales_value_this_month == null
            ? "No data"
            : "Current month total",
        icon: <PointOfSaleOutlinedIcon />,
        colorType: "primary",
        route: "/sales/orders",
      },
      {
        title: "New Customers",
        value: formatNumber(salesPerformance.new_customers_this_month),
        caption: "This month",
        icon: <PersonAddAlt1OutlinedIcon />,
        colorType: "info",
        route: "/crm/customers",
      },
      {
        title: "Active Employees",
        value: formatNumber(hrmOverview.active_employees),
        caption: "Current workforce",
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

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (isError && !dashboardData) {
    return (
      <Box sx={styles.shell}>
        <Paper elevation={0} sx={{ ...styles.card, mb: 2.5 }}>
          <Header title="DASHBOARD" subtitle="Welcome to your dashboard" />
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
          spacing={2}
          sx={{ position: "relative", zIndex: 1 }}
        >
          <Box>
            <Header
              title="DASHBOARD"
              subtitle={`Performance overview for last ${timeframeDays} days`}
            />

            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap mt={1}>
              <Chip
                icon={<AccessTimeOutlinedIcon sx={{ fontSize: 14 }} />}
                size="small"
                label={`Updated ${formatDateTime(lastUpdated)}`}
                sx={styles.heroChip}
              />

              {warning && (
                <Chip size="small" label="Partial Data" sx={styles.heroWarningChip} />
              )}
            </Stack>
          </Box>

          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1}
            alignItems={{ xs: "stretch", sm: "center" }}
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
                  onClick={() => {
                    queryClient.invalidateQueries({
                      queryKey: ["dashboard", timeframeDays],
                    });
                    refetch();
                  }}
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
          opacity: isFetching && !isLoading ? 0.65 : 1,
          transition: "opacity 160ms ease",
          pointerEvents: isFetching ? "none" : "auto",
        }}
      >
        <Box
          display="grid"
          gridTemplateColumns={{
            xs: "1fr",
            sm: "repeat(2, 1fr)",
            xl: "repeat(4, 1fr)",
          }}
          gap={2}
          mb={2.5}
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
          display="grid"
          gridTemplateColumns={{ xs: "1fr", lg: "repeat(12, 1fr)" }}
          gap={2}
        >
          <Paper elevation={0} sx={{ ...styles.card, ...styles.chartCard }}>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              justifyContent="space-between"
              alignItems={{ xs: "flex-start", sm: "center" }}
              spacing={1.5}
              mb={1}
            >
              <SectionTitle
                title={
                  salesPerformance.context_label
                    ? `${salesPerformance.context_label} Trend`
                    : "Sales Trend"
                }
                subtitle="Monthly sales trend for the most recent 6-month period"
              />

              <Stack alignItems={{ xs: "flex-start", sm: "flex-end" }}>
                <Typography
                  sx={{
                    fontSize: "1rem",
                    fontWeight: 500,
                    color: "text.primary",
                    letterSpacing: "-0.015em",
                  }}
                >
                  {formatCurrency(salesPerformance.sales_value_this_month)}
                </Typography>
                <Typography
                  sx={{
                    fontSize: "0.7rem",
                    color: "text.secondary",
                    fontWeight: 300,
                  }}
                >
                  Current month total
                </Typography>
              </Stack>
            </Stack>

            <Divider sx={{ mb: 1 }} />

            <Box flex="1 1 auto" minHeight="260px" mt={1} sx={{ px: 0.5 }}>
              {salesTrendForChart[0]?.data?.length > 0 ? (
                <LineChart isDashboard data={salesTrendForChart} />
              ) : (
                <Box
                  display="flex"
                  height="100%"
                  alignItems="center"
                  justifyContent="center"
                >
                  <Typography sx={styles.emptyText}>
                    No trend data available for this timeframe.
                  </Typography>
                </Box>
              )}
            </Box>
          </Paper>

          <Paper elevation={0} sx={{ ...styles.card, ...styles.sideCard }}>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="flex-start"
              mb={1.25}
            >
              <SectionTitle
                title="Recent Sales"
                subtitle="Latest transactions and order activity"
              />

              <Button
                size="small"
                onClick={() => navigate("/sales/orders")}
                sx={{ textTransform: "none", fontSize: "0.7rem" }}
              >
                View All
              </Button>
            </Stack>

            <Stack spacing={1} sx={{ overflow: "auto", pr: 0.5, mt: 0.5 }}>
              {recentSales.slice(0, 8).map((sale, index) => (
                <Box
                  key={sale.id || `sale-${index}`}
                  onClick={() => navigate(`/sales/orders/${sale.id}`)}
                  sx={styles.saleItem}
                >
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    spacing={1.5}
                  >
                    <Box minWidth={0}>
                      <Typography sx={styles.salePrimary} noWrap>
                        {sale.customer?.name ||
                          `Order #${sale.order_number || "N/A"}`}
                      </Typography>

                      <Typography sx={styles.saleSecondary}>
                        {sale.order_date
                          ? new Date(sale.order_date).toLocaleDateString()
                          : "No date"}
                      </Typography>
                    </Box>

                    <Typography sx={styles.saleAmount}>
                      {formatCurrency(sale.total_amount)}
                    </Typography>
                  </Stack>
                </Box>
              ))}

              {recentSales.length === 0 && (
                <Box sx={{ py: 5, textAlign: "center" }}>
                  <Typography sx={styles.emptyText}>
                    No recent sales activity.
                  </Typography>
                </Box>
              )}
            </Stack>
          </Paper>

          <ModuleCard
            route="/inventory"
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