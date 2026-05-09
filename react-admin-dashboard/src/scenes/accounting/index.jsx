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

import { apiClient } from "../../api/apiClient";
import LineChart from "../../components/LineChart";

import AccountBalanceWalletOutlinedIcon from "@mui/icons-material/AccountBalanceWalletOutlined";
import AccountBalanceOutlinedIcon from "@mui/icons-material/AccountBalanceOutlined";
import AccountTreeOutlinedIcon from "@mui/icons-material/AccountTreeOutlined";
import AddIcon from "@mui/icons-material/Add";
import AssessmentIcon from "@mui/icons-material/Assessment";
import AssignmentTurnedInOutlinedIcon from "@mui/icons-material/AssignmentTurnedInOutlined";
import CalculateOutlinedIcon from "@mui/icons-material/CalculateOutlined";
import CallMadeOutlinedIcon from "@mui/icons-material/CallMadeOutlined";
import CallReceivedOutlinedIcon from "@mui/icons-material/CallReceivedOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CreditCardOutlinedIcon from "@mui/icons-material/CreditCardOutlined";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import FactCheckOutlinedIcon from "@mui/icons-material/FactCheckOutlined";
import GavelOutlinedIcon from "@mui/icons-material/GavelOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import LockClockOutlinedIcon from "@mui/icons-material/LockClockOutlined";
import PaidOutlinedIcon from "@mui/icons-material/PaidOutlined";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
import PriceChangeOutlinedIcon from "@mui/icons-material/PriceChangeOutlined";
import ReceiptIcon from "@mui/icons-material/Receipt";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import RequestQuoteOutlinedIcon from "@mui/icons-material/RequestQuoteOutlined";
import SavingsOutlinedIcon from "@mui/icons-material/SavingsOutlined";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import SyncAltOutlinedIcon from "@mui/icons-material/SyncAltOutlined";
import TrendingDownOutlinedIcon from "@mui/icons-material/TrendingDownOutlined";
import TrendingUpOutlinedIcon from "@mui/icons-material/TrendingUpOutlined";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import AccessTimeOutlinedIcon from "@mui/icons-material/AccessTimeOutlined";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";

const FINANCE_ENDPOINTS = [
  ["summary", "/accounting/dashboard-summary"],
  ["trends", "/accounting/financial-trends?months=6"],
  ["ratios", "/accounting/key-ratios"],
  ["alerts", "/accounting/alerts"],
  ["arAging", "/invoices/reports/ar-aging"],
  ["apAging", "/accounting/reports/ap-aging"],
  ["cashflow", "/accounting/reports/cashflow-summary"],
  ["budget", "/accounting/reports/budget-vs-actual"],
  ["tax", "/accounting/reports/tax-summary"],
  ["period", "/accounting/period-status"],
];

const getAccentVars = (color) => ({
  "--accent": color,
  "--accent-bg": alpha(color, 0.1),
  "--accent-border": alpha(color, 0.16),
  "--accent-border-strong": alpha(color, 0.28),
});

const getAlertIcon = (type) => {
  if (type === "error") return <ErrorOutlineIcon />;
  if (type === "success") return <CheckCircleOutlineIcon />;
  return <WarningAmberIcon />;
};

const formatBucketLabel = (bucket) => {
  if (bucket === "current") return "0 - 30 Days";
  if (bucket === "90+") return "Over 90 Days";
  return `${bucket} Days`;
};

const safeNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const getPayload = (result, fallback) => {
  if (result.status !== "fulfilled") return fallback;

  const data = result.value?.data;

  if (data?.data !== undefined) return data.data;

  return data ?? fallback;
};

const FinanceModuleCard = ({ module }) => {
  const theme = useTheme();
  const styles = theme.accountsDashboard;
  const navigate = useNavigate();

  return (
    <Paper
      elevation={0}
      onClick={() => navigate(module.path)}
      sx={{
        ...styles.card,
        ...styles.moduleCard,
      }}
      style={getAccentVars(module.color)}
    >
      <Stack direction="row" spacing={1.2} alignItems="flex-start">
        <Box sx={styles.iconBoxSmall} style={getAccentVars(module.color)}>
          {module.icon}
        </Box>

        <Box minWidth={0}>
          <Typography sx={styles.moduleTitle}>{module.title}</Typography>
          <Typography sx={styles.moduleSubtitle}>{module.description}</Typography>
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

      <Typography sx={styles.moduleMeta}>{module.meta}</Typography>
    </Paper>
  );
};

const KpiCard = ({ kpi, formatCurrency }) => {
  const theme = useTheme();
  const styles = theme.accountsDashboard;

  const growth = Number(kpi.growth);
  const hasGrowth = !kpi.static && Number.isFinite(growth);
  const isPositive =
    (growth > 0 && !kpi.inverseGood) || (growth < 0 && kpi.inverseGood);
  const growthColor = isPositive
    ? theme.palette.success.main
    : theme.palette.error.main;

  return (
    <Paper
      elevation={0}
      sx={{ ...styles.card, ...styles.kpiCard }}
      style={getAccentVars(kpi.color)}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1.25} mb={2}>
        <Box sx={styles.iconBox} style={getAccentVars(kpi.color)}>
          {kpi.icon}
        </Box>

        {hasGrowth && (
          <Chip
            size="small"
            icon={growth > 0 ? <TrendingUpOutlinedIcon /> : <TrendingDownOutlinedIcon />}
            label={`${Math.abs(growth).toFixed(1)}%`}
            sx={{
              ...styles.growthChip,
              backgroundColor: alpha(growthColor, 0.12),
              color: growthColor,
              "& .MuiChip-icon": {
                color: growthColor,
              },
            }}
          />
        )}
      </Stack>

      <Typography sx={styles.kpiValue}>{formatCurrency(kpi.value)}</Typography>
      <Typography sx={styles.kpiLabel}>{kpi.label}</Typography>
    </Paper>
  );
};

const RatioBar = ({ label, value, threshold, progressMultiplier = 50 }) => {
  const theme = useTheme();
  const styles = theme.accountsDashboard;
  const isHealthy = safeNumber(value) >= threshold;
  const color = isHealthy ? theme.palette.success.main : theme.palette.error.main;

  return (
    <Box sx={styles.ratioRow}>
      <Stack direction="row" justifyContent="space-between" mb={1}>
        <Typography sx={styles.ratioLabel}>{label}</Typography>
        <Typography sx={{ ...styles.ratioValue, color }}>
          {safeNumber(value).toFixed(2)}
        </Typography>
      </Stack>

      <LinearProgress
        variant="determinate"
        value={Math.min(safeNumber(value) * progressMultiplier, 100)}
        sx={styles.ratioProgress(color)}
      />
    </Box>
  );
};

const AgingBuckets = ({ title, subtitle, totals, reportPath, warningBuckets = ["61-90", "90+"] }) => {
  const theme = useTheme();
  const styles = theme.accountsDashboard;
  const navigate = useNavigate();

  return (
    <Paper elevation={0} sx={{ ...styles.card, ...styles.halfCard }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        spacing={1.25}
        mb={1.5}
      >
        <Box>
          <Typography sx={styles.sectionTitle}>{title}</Typography>
          <Typography sx={styles.sectionSubtitle}>{subtitle}</Typography>
        </Box>

        <Button
          variant="outlined"
          size="small"
          onClick={() => navigate(reportPath)}
          sx={styles.reportButton}
        >
          Full Report
        </Button>
      </Stack>

      <Grid container spacing={2} sx={styles.arGrid}>
        {["current", "31-60", "61-90", "90+"].map((bucket) => {
          const amount = safeNumber(totals?.[bucket]);
          const isWarning = warningBuckets.includes(bucket) && amount > 0;

          return (
            <Grid item xs={6} md={3} key={bucket}>
              <Box sx={styles.arBucket}>
                <Typography sx={styles.arBucketLabel}>
                  {formatBucketLabel(bucket)}
                </Typography>

                <Typography
                  sx={{
                    ...styles.arBucketValue,
                    color: isWarning ? theme.palette.error.main : "text.primary",
                  }}
                >
                  KES {amount.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Typography>
              </Box>
            </Grid>
          );
        })}
      </Grid>
    </Paper>
  );
};

const AccountsDashboard = () => {
  const theme = useTheme();
  const styles = theme.accountsDashboard;
  const navigate = useNavigate();

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
    apAging: null,
    cashflow: null,
    budget: null,
    tax: null,
    period: null,
  });

  const formatCurrency = useCallback((value, currency = "KES") => {
    const number = Number(value);

    if (!Number.isFinite(number)) {
      return `${currency} 0.00`;
    }

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

  const getGrowth = useCallback(
    (metricKey) => {
      if (!dashboardData.trends || dashboardData.trends.length < 2) return null;

      const current = safeNumber(
        dashboardData.trends[dashboardData.trends.length - 1]?.[metricKey]
      );
      const previous = safeNumber(
        dashboardData.trends[dashboardData.trends.length - 2]?.[metricKey]
      );

      if (!previous) return 0;

      return ((current - previous) / previous) * 100;
    },
    [dashboardData.trends]
  );

  const fetchDashboard = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError(null);

    try {
      const results = await Promise.allSettled(
        FINANCE_ENDPOINTS.map(([, endpoint]) => apiClient.get(endpoint))
      );

      const failed = results
        .map((result, index) =>
          result.status === "rejected" ? FINANCE_ENDPOINTS[index][0] : null
        )
        .filter(Boolean);

      setDashboardData({
        summary: getPayload(results[0], null),
        trends: Array.isArray(getPayload(results[1], []))
          ? getPayload(results[1], [])
          : [],
        ratios: getPayload(results[2], null),
        alerts: Array.isArray(getPayload(results[3], []))
          ? getPayload(results[3], [])
          : [],
        arAging: getPayload(results[4], null),
        apAging: getPayload(results[5], null),
        cashflow: getPayload(results[6], null),
        budget: getPayload(results[7], null),
        tax: getPayload(results[8], null),
        period: getPayload(results[9], null),
      });

      if (failed.length) {
        setError(
          `Some finance modules failed to load: ${failed.join(", ")}. Showing available data.`
        );
      }

      setLastUpdated(new Date());
    } catch (err) {
      console.error("Finance dashboard aggregation error:", err);
      setError("Failed to load finance dashboard.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const { summary, ratios, alerts, arAging, apAging, cashflow, budget, tax, period } =
    dashboardData;

  const lineChartData = useMemo(() => {
    if (!dashboardData.trends || dashboardData.trends.length === 0) return [];

    return [
      {
        id: "Revenue",
        color: theme.palette.success.main,
        data: dashboardData.trends.map((item) => ({
          x: item.month,
          y: safeNumber(item.revenue),
        })),
      },
      {
        id: "Expenses",
        color: theme.palette.error.main,
        data: dashboardData.trends.map((item) => ({
          x: item.month,
          y: safeNumber(item.expenses),
        })),
      },
    ];
  }, [dashboardData.trends, theme.palette.error.main, theme.palette.success.main]);

  const kpis = useMemo(
    () => [
      {
        label: "Revenue (MTD)",
        value: summary?.revenue,
        growth: getGrowth("revenue"),
        icon: <CallMadeOutlinedIcon />,
        color: theme.palette.info.main,
      },
      {
        label: "Expenses (MTD)",
        value: summary?.expenses,
        growth: getGrowth("expenses"),
        inverseGood: true,
        icon: <CallReceivedOutlinedIcon />,
        color: theme.palette.error.main,
      },
      {
        label: "Net Income (MTD)",
        value: summary?.net_income,
        growth: (getGrowth("revenue") || 0) - (getGrowth("expenses") || 0),
        icon: <TrendingUpOutlinedIcon />,
        color: theme.palette.success.main,
      },
      {
        label: "Cash & Equivalents",
        value: summary?.cash_balance,
        icon: <AccountBalanceWalletOutlinedIcon />,
        color: theme.palette.warning.main,
        static: true,
      },
    ],
    [
      summary,
      getGrowth,
      theme.palette.error.main,
      theme.palette.info.main,
      theme.palette.success.main,
      theme.palette.warning.main,
    ]
  );

  const financeModules = useMemo(
    () => [
      {
        title: "General Ledger",
        description: "Ledger activity, account balances, and drill-downs.",
        path: "/accounts/general-ledger",
        icon: <AccountBalanceOutlinedIcon />,
        color: theme.palette.primary.main,
        meta: "Ledger control",
      },
      {
        title: "Chart of Accounts",
        description: "Maintain account structure for all financial reporting.",
        path: "/accounts/chart-of-accounts",
        icon: <AccountTreeOutlinedIcon />,
        color: theme.palette.info.main,
        meta: "Account setup",
      },
      {
        title: "Journal Entries",
        description: "Create, review, post, and reverse journal entries.",
        path: "/accounts/journal-entries",
        icon: <ReceiptLongOutlinedIcon />,
        color: theme.palette.success.main,
        meta: "Posting workflow",
      },
      {
        title: "Accounts Receivable",
        description: "Customer invoices, receipts, collections, and aging.",
        path: "/sales/invoices",
        icon: <PaidOutlinedIcon />,
        color: theme.palette.warning.main,
        meta: "Revenue cycle",
      },
      {
        title: "Accounts Payable",
        description: "Supplier bills, vendor balances, and payment scheduling.",
        path: "/accounts/bills",
        icon: <RequestQuoteOutlinedIcon />,
        color: theme.palette.error.main,
        meta: "Payables control",
      },
      {
        title: "Customer Payments",
        description: "Receive, allocate, and reconcile customer payments.",
        path: "/sales/payments/customer-payments",
        icon: <PaymentsOutlinedIcon />,
        color: theme.palette.success.main,
        meta: "Collections",
      },
      {
        title: "Bank Reconciliation",
        description: "Match bank transactions against ledger movements.",
        path: "/accounts/reconciliation/bank",
        icon: <SyncAltOutlinedIcon />,
        color: theme.palette.info.main,
        meta: "Cash control",
      },
      {
        title: "Payment Vouchers",
        description: "Prepare, approve, and track outgoing payments.",
        path: "/accounts/payment-vouchers",
        icon: <CreditCardOutlinedIcon />,
        color: theme.palette.warning.main,
        meta: "Disbursements",
      },
      {
        title: "Fixed Assets",
        description: "Asset acquisition, depreciation, disposal, and registers.",
        path: "/accounts/fixed-assets",
        icon: <Inventory2OutlinedIcon />,
        color: theme.palette.primary.main,
        meta: "Asset lifecycle",
      },
      {
        title: "Payroll Finance",
        description: "Payroll journals, liabilities, payslips, and statutory postings.",
        path: "/accounts/payroll",
        icon: <SavingsOutlinedIcon />,
        color: theme.palette.success.main,
        meta: "Payroll control",
      },
      {
        title: "Tax & Compliance",
        description: "VAT, PAYE, withholding tax, and statutory summaries.",
        path: "/accounts/tax",
        icon: <CalculateOutlinedIcon />,
        color: theme.palette.error.main,
        meta: "Compliance",
      },
      {
        title: "Budgets",
        description: "Budget setup, budget-vs-actual, variance tracking.",
        path: "/accounts/budgets",
        icon: <PriceChangeOutlinedIcon />,
        color: theme.palette.warning.main,
        meta: budget?.variance
          ? `Variance: ${safeNumber(budget.variance).toFixed(1)}%`
          : "Planning",
      },
      {
        title: "Cashflow",
        description: "Cash inflows, outflows, burn, and runway summaries.",
        path: "/accounts/cashflow",
        icon: <AccountBalanceWalletOutlinedIcon />,
        color: theme.palette.info.main,
        meta: cashflow?.net_cashflow
          ? formatCurrency(cashflow.net_cashflow)
          : "Liquidity",
      },
      {
        title: "Financial Reports",
        description: "Trial balance, P&L, balance sheet, and general ledger reports.",
        path: "/accounts/reports",
        icon: <AssessmentIcon />,
        color: theme.palette.primary.main,
        meta: "Reporting hub",
      },
      {
        title: "Audit Trail",
        description: "Track financial changes, approvals, and posting history.",
        path: "/accounts/audit-trail",
        icon: <FactCheckOutlinedIcon />,
        color: theme.palette.success.main,
        meta: "Governance",
      },
      {
        title: "Period Close",
        description: "Month-end close, locks, approvals, and audit checks.",
        path: "/accounts/period-close",
        icon: <LockClockOutlinedIcon />,
        color: theme.palette.error.main,
        meta: period?.status ? `Status: ${period.status}` : "Close process",
      },
      {
        title: "Approvals",
        description: "Finance approvals for payments, journals, and adjustments.",
        path: "/accounts/approvals",
        icon: <AssignmentTurnedInOutlinedIcon />,
        color: theme.palette.warning.main,
        meta: "Control queue",
      },
      {
        title: "Policies",
        description: "Finance rules, approval limits, and compliance policies.",
        path: "/accounts/policies",
        icon: <GavelOutlinedIcon />,
        color: theme.palette.info.main,
        meta: "Governance",
      },
    ],
    [
      theme.palette.primary.main,
      theme.palette.info.main,
      theme.palette.success.main,
      theme.palette.warning.main,
      theme.palette.error.main,
      budget,
      cashflow,
      period,
      formatCurrency,
    ]
  );

  if (loading && !dashboardData.summary) {
    return (
      <Box sx={styles.shell}>
        <Paper elevation={0} sx={styles.loadingCard}>
          <Stack alignItems="center" spacing={1.5}>
            <CircularProgress size={26} />
            <Typography sx={{ color: "text.secondary", fontSize: "0.78rem" }}>
              Loading enterprise finance workspace...
            </Typography>
          </Stack>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={styles.shell}>
      <Paper elevation={0} sx={{ ...styles.card, ...styles.heroCard }}>
        <Box sx={styles.heroOverlay} />

        <Stack
          direction={{ xs: "column", lg: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", lg: "center" }}
          spacing={2}
          sx={{ position: "relative", zIndex: 1 }}
        >
          <Box minWidth={0}>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap mb={1}>
              <Chip
                icon={<ShieldOutlinedIcon sx={{ fontSize: 14 }} />}
                label="Enterprise Finance Control Center"
                size="small"
                sx={styles.heroChip}
              />

              <Chip
                icon={<AccessTimeOutlinedIcon sx={{ fontSize: 14 }} />}
                label={`Synced: ${formatDateTime(lastUpdated)}`}
                size="small"
                sx={styles.heroChip}
              />
            </Stack>

            <Typography sx={styles.heroTitle}>Finance Department</Typography>

            <Typography sx={styles.heroSubtitle}>
              Manage accounting, treasury, receivables, payables, payroll finance,
              tax, compliance, fixed assets, budgets, audit, and financial reporting
              from one scalable SaaS workspace.
            </Typography>
          </Box>

          <Tooltip title="Force sync finance data">
            <span>
              <IconButton
                onClick={() => fetchDashboard(true)}
                disabled={refreshing}
                sx={styles.heroIconButton}
              >
                {refreshing ? (
                  <CircularProgress size={20} color="inherit" />
                ) : (
                  <RefreshRoundedIcon fontSize="small" />
                )}
              </IconButton>
            </span>
          </Tooltip>
        </Stack>

        {refreshing && (
          <LinearProgress
            sx={{
              mt: 2.5,
              borderRadius: "999px",
              height: 4,
              backgroundColor: "rgba(255,255,255,0.12)",
              "& .MuiLinearProgress-bar": {
                backgroundColor: "#fff",
              },
            }}
          />
        )}
      </Paper>

      <Box sx={styles.actionBar}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          sx={styles.primaryActionButton}
          onClick={() => navigate("/accounts/journal-entries/new")}
        >
          Journal Entry
        </Button>

        <Button
          variant="outlined"
          startIcon={<ReceiptIcon />}
          sx={styles.secondaryActionButton}
          onClick={() => navigate("/sales/payments/customer-payments")}
        >
          Receive Payment
        </Button>

        <Button
          variant="outlined"
          startIcon={<RequestQuoteOutlinedIcon />}
          sx={styles.secondaryActionButton}
          onClick={() => navigate("/accounts/bills/new")}
        >
          Supplier Bill
        </Button>

        <Button
          variant="outlined"
          startIcon={<AssessmentIcon />}
          endIcon={<ArrowForwardRoundedIcon />}
          sx={styles.secondaryActionButton}
          onClick={() => navigate("/accounts/reports")}
        >
          Reports
        </Button>
      </Box>

      {(error || alerts?.length > 0) && (
        <Stack spacing={1.25} sx={styles.alertStack}>
          {error && <Alert severity="warning">{error}</Alert>}

          {alerts?.map((alertItem, index) => (
            <Alert
              key={`${alertItem.title || "alert"}-${index}`}
              severity={alertItem.type || "info"}
              icon={getAlertIcon(alertItem.type)}
            >
              <Typography sx={{ fontWeight: 500, fontSize: "0.78rem" }}>
                {alertItem.title}
              </Typography>
              <Typography sx={{ fontSize: "0.72rem", color: "text.secondary" }}>
                {alertItem.message}
              </Typography>
            </Alert>
          ))}
        </Stack>
      )}

      <Box sx={styles.kpiGrid}>
        {kpis.map((kpi) => (
          <KpiCard key={kpi.label} kpi={kpi} formatCurrency={formatCurrency} />
        ))}
      </Box>

      <Box sx={styles.moduleGrid}>
        {financeModules.map((module) => (
          <FinanceModuleCard key={module.title} module={module} />
        ))}
      </Box>

      <Box sx={styles.contentGrid}>
        <Paper elevation={0} sx={{ ...styles.card, ...styles.chartCard }}>
          <Box>
            <Typography sx={styles.sectionTitle}>Financial Trends</Typography>
            <Typography sx={styles.sectionSubtitle}>
              Revenue vs expenses for the last 6 months.
            </Typography>
          </Box>

          <Divider sx={{ mt: 1.5 }} />

          <Box sx={styles.chartBox}>
            {lineChartData.length > 0 ? (
              <LineChart isDashboard data={lineChartData} />
            ) : (
              <Box sx={styles.emptyBox}>Insufficient trend data available.</Box>
            )}
          </Box>
        </Paper>

        <Paper elevation={0} sx={{ ...styles.card, ...styles.ratioCard }}>
          <Box>
            <Typography sx={styles.sectionTitle}>Key Ratios</Typography>
            <Typography sx={styles.sectionSubtitle}>
              Liquidity and profitability health.
            </Typography>
          </Box>

          <Divider sx={{ mt: 1.5, mb: 2.5 }} />

          <RatioBar
            label="Current Ratio"
            value={ratios?.current_ratio}
            threshold={1}
          />

          <RatioBar
            label="Quick Ratio"
            value={ratios?.quick_ratio}
            threshold={0.8}
          />

          <Box>
            <Stack direction="row" justifyContent="space-between" mb={1}>
              <Typography sx={styles.ratioLabel}>YTD Net Margin</Typography>
              <Typography
                sx={{
                  ...styles.ratioValue,
                  color:
                    safeNumber(ratios?.net_profit_margin_ytd) > 0
                      ? theme.palette.success.main
                      : theme.palette.error.main,
                }}
              >
                {ratios?.net_profit_margin_ytd
                  ? `${ratios.net_profit_margin_ytd}%`
                  : "0.00%"}
              </Typography>
            </Stack>
          </Box>
        </Paper>

        <AgingBuckets
          title="A/R Aging Snapshot"
          subtitle="Outstanding customer receivables by age."
          totals={arAging?.totals}
          reportPath="/accounts/reports"
        />

        <AgingBuckets
          title="A/P Aging Snapshot"
          subtitle="Outstanding supplier payables by age."
          totals={apAging?.totals}
          reportPath="/accounts/reports/ap-aging"
        />

        <Paper elevation={0} sx={{ ...styles.card, ...styles.halfCard }}>
          <Typography sx={styles.sectionTitle}>Tax Summary</Typography>
          <Typography sx={styles.sectionSubtitle}>
            Tax obligations and statutory finance exposure.
          </Typography>

          <Divider sx={{ my: 1.5 }} />

          {[
            ["VAT Payable", tax?.vat_payable],
            ["PAYE Payable", tax?.paye_payable],
            ["Withholding Tax", tax?.withholding_tax],
            ["Other Statutory", tax?.other_statutory],
          ].map(([label, value]) => (
            <Box key={label} sx={styles.listItem}>
              <Stack direction="row" justifyContent="space-between" spacing={1.5}>
                <Box>
                  <Typography sx={styles.listTitle}>{label}</Typography>
                  <Typography sx={styles.listSubtitle}>Current obligation</Typography>
                </Box>
                <Typography sx={styles.listValue}>{formatCurrency(value)}</Typography>
              </Stack>
            </Box>
          ))}
        </Paper>

        <Paper elevation={0} sx={{ ...styles.card, ...styles.halfCard }}>
          <Typography sx={styles.sectionTitle}>Cashflow & Budget Control</Typography>
          <Typography sx={styles.sectionSubtitle}>
            Liquidity, variance, and planning indicators.
          </Typography>

          <Divider sx={{ my: 1.5 }} />

          {[
            ["Net Cashflow", cashflow?.net_cashflow],
            ["Operating Cashflow", cashflow?.operating_cashflow],
            ["Budget Variance", budget?.variance_amount],
            ["Budget Utilization", budget?.utilization_amount],
          ].map(([label, value]) => (
            <Box key={label} sx={styles.listItem}>
              <Stack direction="row" justifyContent="space-between" spacing={1.5}>
                <Box>
                  <Typography sx={styles.listTitle}>{label}</Typography>
                  <Typography sx={styles.listSubtitle}>Finance control metric</Typography>
                </Box>
                <Typography sx={styles.listValue}>{formatCurrency(value)}</Typography>
              </Stack>
            </Box>
          ))}
        </Paper>
      </Box>
    </Box>
  );
};

export default AccountsDashboard;