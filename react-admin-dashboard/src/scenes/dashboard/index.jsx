import { Box, Button, IconButton, Typography, useTheme, CircularProgress, Alert } from "@mui/material";
import { tokens } from "../../theme";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import PointOfSaleIcon from "@mui/icons-material/PointOfSale";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import MonetizationOnIcon from "@mui/icons-material/MonetizationOn";
import GroupIcon from "@mui/icons-material/Group";
import RefreshIcon from "@mui/icons-material/Refresh";
import Header from "../../components/Header";
import LineChart from "../../components/LineChart";
import StatBox from "../../components/StatBox";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useAuth } from "../../api/AuthProvider";

const Dashboard = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const { apiClient, isAuthenticated } = useAuth();

  // Data
  const [dashboardData, setDashboardData] = useState(null);

  // Loading states
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Messaging
  const [fatalError, setFatalError] = useState(null); // only when we have NO data to show
  const [warning, setWarning] = useState(null); // partial loads or refresh failures

  // Metadata
  const [lastUpdated, setLastUpdated] = useState(null);
  const [timeframeDays, setTimeframeDays] = useState(30);

  // Keep latest dashboardData without adding it to hook deps (prevents fetch loop)
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

  /**
   * Conform to backend DashboardController:
   * GET /dashboard?refresh=true|false&timeframe=30
   * Response:
   * {
   *   success: bool,
   *   status: "complete"|"partial",
   *   data: {...},
   *   failed_sections: [...],
   *   metadata: { generated_at, timeframe_days, ... }
   * }
   */
  const fetchDashboardData = useCallback(
    async (refresh = false) => {
      if (!isAuthenticated) return;

      if (refresh) {
        setRefreshing(true);
      } else {
        setLoadingInitial(true);
        setFatalError(null);
        setWarning(null);
      }

      const params = {
        timeframe: timeframeDays,
        ...(refresh ? { refresh: true } : {}),
      };

      try {
        const response = await apiClient.get("/dashboard", { params });
        const payload = response?.data;

        const data = payload?.data;
        const status = payload?.status; // complete|partial
        const failed = Array.isArray(payload?.failed_sections) ? payload.failed_sections : [];
        const meta = payload?.metadata || {};
        const generatedAt = meta.generated_at;

        if (!data || typeof data !== "object") {
          throw new Error(payload?.message || payload?.error || "Invalid dashboard response.");
        }

        setDashboardData(data);

        // metadata.timeframe_days is authoritative if backend changes it
        if (Number.isFinite(Number(meta.timeframe_days))) {
          setTimeframeDays(Number(meta.timeframe_days));
        }

        if (generatedAt) {
          const dt = new Date(generatedAt);
          setLastUpdated(Number.isFinite(dt.getTime()) ? dt : new Date());
        } else {
          setLastUpdated(new Date());
        }

        // Partial is NOT fatal; show warning only
        if (status === "partial" || failed.length > 0) {
          const msg =
            payload?.message ||
            `Partial data loaded — some sections may be unavailable${failed.length ? `: ${failed.join(", ")}` : ""}.`;
          setWarning(msg);
        } else {
          setWarning(null);
        }

        setFatalError(null);
      } catch (err) {
        console.error("Dashboard fetch error:", err);

        // If we already have data, keep it and only show warning
        if (dashboardDataRef.current) {
          setWarning(err?.message || "Refresh failed — showing last loaded data.");
        } else {
          setFatalError(err?.message || "Could not connect to the server.");
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
    fetchDashboardData(false);
  }, [fetchDashboardData]);

  // Extract data (backend-driven; no placeholders)
  const financialSummary = useMemo(() => dashboardData?.financial_summary || {}, [dashboardData]);
  const salesPerformance = useMemo(() => dashboardData?.sales_performance || {}, [dashboardData]);
  const hrmOverview = useMemo(() => dashboardData?.hrm_overview || {}, [dashboardData]);
  const inventoryStatus = useMemo(() => dashboardData?.inventory_status || {}, [dashboardData]);
  const purchasingOverview = useMemo(() => dashboardData?.purchasing_overview || {}, [dashboardData]);
  const recentSales = useMemo(() => dashboardData?.recent_sales || [], [dashboardData]);

  /**
   * Charts:
   * DashboardService returns sales_trend_last_6_months like:
   * [{ month: "2025-08", total_sales: 12345 }, ...]
   * Convert to whatever your LineChart expects.
   *
   * If your LineChart expects Nivo:
   * [{ id: "Sales", data: [{ x: "2025-08", y: 12345 }, ...] }]
   */
  const salesTrendForChart = useMemo(() => {
    const trend = Array.isArray(salesPerformance?.sales_trend_last_6_months)
      ? salesPerformance.sales_trend_last_6_months
      : [];

    return [
      {
        id: "Sales",
        data: trend.map((t) => ({
          x: t.month || "N/A",
          y: Number(t.total_sales) || 0,
        })),
      },
    ];
  }, [salesPerformance]);

  // Initial loading screen
  if (loadingInitial && !dashboardData) {
    return (
      <Box m="20px" display="flex" justifyContent="center" alignItems="center" height="80vh">
        <CircularProgress color="secondary" />
        <Typography ml={2}>Loading Dashboard...</Typography>
      </Box>
    );
  }

  // Fatal error screen
  if (fatalError && !dashboardData) {
    return (
      <Box m="20px">
        <Header title="DASHBOARD" subtitle="Welcome to your dashboard" />
        <Alert severity="error" sx={{ mt: 3 }}>
          Failed to load dashboard data: {fatalError}
          <Button onClick={() => fetchDashboardData(true)} sx={{ ml: 2 }} color="error">
            Retry
          </Button>
        </Alert>
      </Box>
    );
  }

  return (
    <Box m="20px">
      {/* HEADER */}
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Header title="DASHBOARD" subtitle={`Welcome! Showing data for the last ${timeframeDays} days.`} />

        <Box display="flex" alignItems="center" gap={1}>
          <IconButton onClick={() => fetchDashboardData(true)} title="Refresh Data" disabled={refreshing} sx={{ mr: 1 }}>
            {refreshing ? <CircularProgress size={22} color="inherit" /> : <RefreshIcon />}
          </IconButton>

          <Button
            sx={{
              backgroundColor: colors.blueAccent[700],
              color: colors.grey[100],
              fontSize: "14px",
              fontWeight: "bold",
              padding: "10px 20px",
            }}
          >
            <DownloadOutlinedIcon sx={{ mr: "10px" }} />
            Download Reports
          </Button>
        </Box>
      </Box>

      {/* Warning (partial load or refresh fail) */}
      {warning && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          {warning}
        </Alert>
      )}

      {/* GRID */}
      <Box
        display="grid"
        gridTemplateColumns="repeat(12, 1fr)"
        gridAutoRows="140px"
        gap="20px"
        sx={{
          mt: 2,
          opacity: refreshing ? 0.85 : 1,
          transition: "opacity 0.2s ease-in-out",
        }}
      >
        {/* Revenue YTD */}
        <Box gridColumn="span 3" backgroundColor={colors.primary[400]} display="flex" alignItems="center" justifyContent="center">
          <StatBox
            title={formatCurrency(financialSummary.revenue_ytd)}
            subtitle="Revenue YTD"
            // No fake progress/increase; backend must provide if you want them
            icon={<MonetizationOnIcon sx={{ color: colors.greenAccent[600], fontSize: "26px" }} />}
          />
        </Box>

        {/* Sales This Month */}
        <Box gridColumn="span 3" backgroundColor={colors.primary[400]} display="flex" alignItems="center" justifyContent="center">
          <StatBox
            title={formatCurrency(salesPerformance.sales_value_this_month)}
            subtitle={salesPerformance.context_label ? `${salesPerformance.context_label} This Month` : "Sales This Month"}
            icon={<PointOfSaleIcon sx={{ color: colors.greenAccent[600], fontSize: "26px" }} />}
          />
        </Box>

        {/* New Customers This Month */}
        <Box gridColumn="span 3" backgroundColor={colors.primary[400]} display="flex" alignItems="center" justifyContent="center">
          <StatBox
            title={String(salesPerformance.new_customers_this_month ?? 0)}
            subtitle="New Customers (This Month)"
            icon={<PersonAddIcon sx={{ color: colors.greenAccent[600], fontSize: "26px" }} />}
          />
        </Box>

        {/* Active Employees */}
        <Box gridColumn="span 3" backgroundColor={colors.primary[400]} display="flex" alignItems="center" justifyContent="center">
          <StatBox
            title={String(hrmOverview.active_employees ?? 0)}
            subtitle="Active Employees"
            icon={<GroupIcon sx={{ color: colors.greenAccent[600], fontSize: "26px" }} />}
          />
        </Box>

        {/* Revenue / Sales Trend */}
        <Box gridColumn="span 8" gridRow="span 2" backgroundColor={colors.primary[400]}>
          <Box mt="25px" p="0 30px" display="flex" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="h5" fontWeight="600" color={colors.grey[100]}>
                {salesPerformance.context_label ? `${salesPerformance.context_label} Trend` : "Sales Trend"}
              </Typography>
              <Typography variant="h3" fontWeight="bold" color={colors.greenAccent[500]}>
                {formatCurrency(salesPerformance.sales_value_this_month)}
              </Typography>
            </Box>
          </Box>

          <Box height="250px" m="-20px 0 0 0">
            {/* Pass Nivo-like structure. Adjust if your LineChart expects something else. */}
            <LineChart isDashboard={true} data={salesTrendForChart} />
          </Box>
        </Box>

        {/* Recent Sales */}
        <Box gridColumn="span 4" gridRow="span 2" backgroundColor={colors.primary[400]} overflow="auto">
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            borderBottom={`4px solid ${colors.primary[500]}`}
            sx={{ color: colors.grey[100], padding: "15px" }}
          >
            <Typography variant="h5" fontWeight="600">
              Recent Sales
            </Typography>
          </Box>

          {(Array.isArray(recentSales) ? recentSales : []).slice(0, 5).map((sale, i) => (
            <Box
              key={`sale-${sale.id || i}`}
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              borderBottom={`4px solid ${colors.primary[500]}`}
              p="15px"
            >
              <Box>
                <Typography color={colors.greenAccent[500]} variant="h5" fontWeight="600">
                  {sale.customer?.name || `Order #${sale.order_number || "N/A"}`}
                </Typography>
                <Typography color={colors.grey[100]}>
                  {sale.order_date ? new Date(sale.order_date).toLocaleDateString() : "—"}
                </Typography>
              </Box>
              <Box backgroundColor={colors.greenAccent[500]} p="5px 10px" borderRadius="4px">
                {formatCurrency(sale.total_amount)}
              </Box>
            </Box>
          ))}

          {(!recentSales || recentSales.length === 0) && (
            <Typography p="15px" color={colors.grey[300]}>
              No recent sales activity.
            </Typography>
          )}
        </Box>

        {/* Inventory */}
        <Box gridColumn="span 4" gridRow="span 2" backgroundColor={colors.primary[400]} p="20px">
          <Typography variant="h5" fontWeight="600" color={colors.grey[100]} mb={2}>
            Inventory Status
          </Typography>
          <Box display="flex" flexDirection="column" gap={2}>
            <Box display="flex" justifyContent="space-between">
              <Typography color={colors.grey[100]}>Low Stock Items:</Typography>
              <Typography color={colors.greenAccent[500]} fontWeight="bold">
                {inventoryStatus.products_low_on_stock ?? 0}
              </Typography>
            </Box>
            <Box display="flex" justifyContent="space-between">
              <Typography color={colors.grey[100]}>Total Value:</Typography>
              <Typography color={colors.greenAccent[500]} fontWeight="bold">
                {formatCurrency(inventoryStatus.total_inventory_value)}
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Purchasing */}
        <Box gridColumn="span 4" gridRow="span 2" backgroundColor={colors.primary[400]} p="20px">
          <Typography variant="h5" fontWeight="600" color={colors.grey[100]} mb={2}>
            Purchasing
          </Typography>
          <Box display="flex" flexDirection="column" gap={2}>
            <Box display="flex" justifyContent="space-between">
              <Typography color={colors.grey[100]}>Open POs:</Typography>
              <Typography color={colors.greenAccent[500]} fontWeight="bold">
                {purchasingOverview.open_purchase_orders_count ?? 0}
              </Typography>
            </Box>
            <Box display="flex" justifyContent="space-between">
              <Typography color={colors.grey[100]}>PO Value:</Typography>
              <Typography color={colors.greenAccent[500]} fontWeight="bold">
                {formatCurrency(purchasingOverview.open_purchase_orders_value)}
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Financial Health */}
        <Box gridColumn="span 4" gridRow="span 2" backgroundColor={colors.primary[400]} p="20px">
          <Typography variant="h5" fontWeight="600" color={colors.grey[100]} mb={2}>
            Financial Health
          </Typography>
          <Box display="flex" flexDirection="column" gap={2}>
            <Box display="flex" justifyContent="space-between">
              <Typography color={colors.grey[100]}>Profit Margin (YTD):</Typography>
              <Typography color={colors.greenAccent[500]} fontWeight="bold">
                {Number(financialSummary.profit_margin_ytd ?? 0).toFixed(2)}%
              </Typography>
            </Box>
            <Box display="flex" justifyContent="space-between">
              <Typography color={colors.grey[100]}>Cash Balance:</Typography>
              <Typography color={colors.greenAccent[500]} fontWeight="bold">
                {formatCurrency(financialSummary.cash_balance)}
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Footer */}
      {lastUpdated && (
        <Typography variant="caption" color={colors.grey[500]} sx={{ mt: 3, display: "block", textAlign: "center" }}>
          Last updated: {lastUpdated.toLocaleString()}
        </Typography>
      )}
    </Box>
  );
};

export default Dashboard;
