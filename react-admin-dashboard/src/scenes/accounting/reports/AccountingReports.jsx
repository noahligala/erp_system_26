import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

import { apiClient } from "../../../api/apiClient.js";

import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import AssessmentOutlinedIcon from "@mui/icons-material/AssessmentOutlined";
import BalanceOutlinedIcon from "@mui/icons-material/BalanceOutlined";
import AccountBalanceOutlinedIcon from "@mui/icons-material/AccountBalanceOutlined";
import RequestQuoteOutlinedIcon from "@mui/icons-material/RequestQuoteOutlined";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import SavingsOutlinedIcon from "@mui/icons-material/SavingsOutlined";
import PaidOutlinedIcon from "@mui/icons-material/PaidOutlined";
import SyncAltOutlinedIcon from "@mui/icons-material/SyncAltOutlined";
import CalculateOutlinedIcon from "@mui/icons-material/CalculateOutlined";
import PriceChangeOutlinedIcon from "@mui/icons-material/PriceChangeOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import ArchiveOutlinedIcon from "@mui/icons-material/ArchiveOutlined";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";

const getAccentVars = (color) => ({
  "--accent": color,
  "--accent-bg": alpha(color, 0.1),
  "--accent-border": alpha(color, 0.16),
  "--accent-border-strong": alpha(color, 0.32),
});

const safeNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const formatCurrency = (value, currency = "KES") => {
  const number = safeNumber(value);

  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(number);
};

const formatRatio = (value) => safeNumber(value).toFixed(2);

const formatPercent = (value) => {
  const number = safeNumber(value);

  return `${number.toFixed(1)}%`;
};

const KpiCard = ({ title, value, icon, description, trend, color }) => {
  const theme = useTheme();
  const styles = theme.financeReports;

  return (
    <Paper
      elevation={0}
      sx={styles.kpiCard}
      style={getAccentVars(color)}
    >
      <Stack direction="row" justifyContent="space-between" spacing={1.5}>
        <Box minWidth={0}>
          <Typography sx={styles.kpiTitle}>{title}</Typography>
          <Typography sx={styles.kpiValue}>{value}</Typography>
        </Box>

        <Box sx={styles.kpiIconBox} style={getAccentVars(color)}>
          {icon}
        </Box>
      </Stack>

      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        spacing={1}
        mt={1.25}
      >
        <Typography sx={styles.kpiDescription}>{description}</Typography>

        {trend && (
          <Chip
            label={trend}
            size="small"
            sx={styles.trendChip}
            style={getAccentVars(color)}
          />
        )}
      </Stack>
    </Paper>
  );
};

const ReportCard = ({ report }) => {
  const theme = useTheme();
  const styles = theme.financeReports;
  const navigate = useNavigate();

  return (
    <Paper
      elevation={0}
      onClick={() => navigate(report.path)}
      sx={styles.reportCard}
      style={getAccentVars(report.color)}
    >
      <Box sx={styles.reportIconBox} style={getAccentVars(report.color)}>
        {report.icon}
      </Box>

      <Typography sx={styles.reportTitle}>{report.title}</Typography>

      <Typography sx={styles.reportDescription}>
        {report.description}
      </Typography>

      <Box sx={styles.reportMeta}>
        <Chip label={report.tag} size="small" sx={styles.reportTag} />

        <ArrowForwardRoundedIcon sx={styles.arrowIcon} />
      </Box>
    </Paper>
  );
};

const SectionHeader = ({ title, subtitle }) => {
  const theme = useTheme();
  const styles = theme.financeReports;

  return (
    <Box sx={styles.sectionHeader}>
      <Typography sx={styles.sectionTitle}>{title}</Typography>
      {subtitle && <Typography sx={styles.sectionSubtitle}>{subtitle}</Typography>}
    </Box>
  );
};

const AccountingReports = () => {
  const theme = useTheme();
  const styles = theme.financeReports;

  const [loading, setLoading] = useState(true);
  const [ratios, setRatios] = useState(null);

  const fetchRatios = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    fetchRatios();
  }, [fetchRatios]);

  const kpis = useMemo(() => {
    const currentRatio = safeNumber(ratios?.current_ratio);
    const quickRatio = safeNumber(ratios?.quick_ratio);
    const netMargin =
      ratios?.net_profit_margin_ytd !== undefined
        ? safeNumber(ratios.net_profit_margin_ytd)
        : safeNumber(ratios?.net_profit_margin) * 100;

    const ytdNetIncome = safeNumber(ratios?.ytd_net_income);
    const ytdRevenue = safeNumber(ratios?.ytd_revenue);

    return [
      {
        title: "Current Ratio",
        value: formatRatio(currentRatio),
        description: "Short-term liquidity",
        trend: currentRatio >= 1.5 ? "Healthy" : "Review",
        icon: <ShowChartIcon />,
        color:
          currentRatio >= 1.5
            ? theme.palette.success.main
            : theme.palette.warning.main,
      },
      {
        title: "Quick Ratio",
        value: formatRatio(quickRatio),
        description: "Liquidity excluding stock",
        trend: quickRatio >= 0.8 ? "Stable" : "Tight",
        icon: <BalanceOutlinedIcon />,
        color:
          quickRatio >= 0.8
            ? theme.palette.info.main
            : theme.palette.warning.main,
      },
      {
        title: "Net Profit Margin",
        value: formatPercent(netMargin),
        description: "YTD profitability",
        trend: netMargin >= 0 ? "Positive" : "Loss",
        icon:
          netMargin >= 0 ? (
            <TrendingUpIcon />
          ) : (
            <TrendingDownIcon />
          ),
        color:
          netMargin >= 0
            ? theme.palette.success.main
            : theme.palette.error.main,
      },
      {
        title: "YTD Net Income",
        value: formatCurrency(ytdNetIncome),
        description: "Year-to-date performance",
        trend: ytdNetIncome >= 0 ? "Gain" : "Loss",
        icon:
          ytdNetIncome >= 0 ? (
            <TrendingUpIcon />
          ) : (
            <TrendingDownIcon />
          ),
        color:
          ytdNetIncome >= 0
            ? theme.palette.success.main
            : theme.palette.error.main,
      },
      {
        title: "YTD Revenue",
        value: formatCurrency(ytdRevenue),
        description: "Year-to-date top line",
        trend: "Revenue",
        icon: <ShowChartIcon />,
        color: theme.palette.primary.main,
      },
    ];
  }, [ratios, theme]);

  const reports = useMemo(
    () => [
      {
        title: "Profit & Loss",
        description: "View income, expenses, and net profit for a selected period.",
        path: "/accounts/reports/profit-loss",
        tag: "Income",
        icon: <AssessmentOutlinedIcon />,
        color: theme.palette.success.main,
      },
      {
        title: "Balance Sheet",
        description: "View assets, liabilities, and equity as of a specific date.",
        path: "/accounts/reports/balance-sheet",
        tag: "Position",
        icon: <AccountBalanceOutlinedIcon />,
        color: theme.palette.info.main,
      },
      {
        title: "Trial Balance",
        description: "Check if total debits equal total credits for all accounts.",
        path: "/accounts/reports/trial-balance",
        tag: "Control",
        icon: <BalanceOutlinedIcon />,
        color: theme.palette.primary.main,
      },
      {
        title: "General Ledger",
        description: "Drill down into transactions for a specific account.",
        path: "/accounts/reports/general-ledger",
        tag: "Ledger",
        icon: <ReceiptLongOutlinedIcon />,
        color: theme.palette.warning.main,
      },
      {
        title: "Payment Voucher",
        description: "Create and print payment vouchers for expenses.",
        path: "/accounts/reports/payment-vouchers",
        tag: "Payments",
        icon: <RequestQuoteOutlinedIcon />,
        color: theme.palette.error.main,
      },
      {
        title: "Fixed Assets",
        description: "Manage assets, depreciation, disposal, and registers.",
        path: "/accounts/fixed-assets",
        tag: "Assets",
        icon: <Inventory2OutlinedIcon />,
        color: theme.palette.info.main,
      },
      {
        title: "Reports Registry",
        description: "Retrieve previously generated and archived reports.",
        path: "/accounting/reports/archive",
        tag: "Archive",
        icon: <ArchiveOutlinedIcon />,
        color: theme.palette.primary.main,
      },
      {
        title: "Cash Flow",
        description: "Monitor operating, investing, and financing cash movement.",
        path: "/accounts/reports/cash-flow",
        tag: "Cash",
        icon: <SavingsOutlinedIcon />,
        color: theme.palette.success.main,
      },
      {
        title: "Budget vs Actual",
        description: "Set targets and evaluate GL performance against budgets.",
        path: "/accounts/reports/budget-vs-actual",
        tag: "Planning",
        icon: <PriceChangeOutlinedIcon />,
        color: theme.palette.warning.main,
      },
      {
        title: "A/R Aging",
        description: "Monitor outstanding customer receivables by aging bucket.",
        path: "/accounts/reports/ar-aging",
        tag: "Receivables",
        icon: <PaidOutlinedIcon />,
        color: theme.palette.info.main,
      },
      {
        title: "A/P Aging",
        description: "Monitor outstanding supplier balances and payables exposure.",
        path: "/accounts/reports/ap-aging",
        tag: "Payables",
        icon: <RequestQuoteOutlinedIcon />,
        color: theme.palette.error.main,
      },
      {
        title: "Bank Reconciliation",
        description: "Review bank matching and unreconciled ledger lines.",
        path: "/accounts/reconciliation/bank",
        tag: "Banking",
        icon: <SyncAltOutlinedIcon />,
        color: theme.palette.primary.main,
      },
      {
        title: "Tax Summary",
        description: "Review PAYE, VAT, NSSF, NHIF, and statutory obligations.",
        path: "/accounts/reports/tax-summary",
        tag: "Compliance",
        icon: <CalculateOutlinedIcon />,
        color: theme.palette.error.main,
      },
    ],
    [theme]
  );

  return (
    <Box sx={styles.shell}>
      <Paper elevation={0} sx={styles.heroCard}>
        <Box sx={styles.heroOverlay} />

        <Box sx={{ position: "relative", zIndex: 1 }}>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap mb={1}>
            <Chip
              icon={<ShieldOutlinedIcon sx={{ fontSize: 14 }} />}
              label="Finance Reporting Hub"
              size="small"
              sx={styles.heroChip}
            />
          </Stack>

          <Typography sx={styles.heroTitle}>Financial Reports</Typography>

          <Typography sx={styles.heroSubtitle}>
            Access enterprise-grade financial reports, key ratios, ledger
            controls, statutory summaries, cashflow insights, and archived
            reporting from one workspace.
          </Typography>
        </Box>
      </Paper>

      <SectionHeader
        title="Key Performance Indicators"
        subtitle="Real-time liquidity and profitability ratios for finance control."
      />

      {loading ? (
        <Paper elevation={0} sx={styles.loadingCard}>
          <CircularProgress size={26} />
        </Paper>
      ) : ratios ? (
        <Box sx={styles.kpiGrid}>
          {kpis.map((kpi) => (
            <KpiCard key={kpi.title} {...kpi} />
          ))}
        </Box>
      ) : (
        <Paper elevation={0} sx={styles.errorCard}>
          <Typography sx={{ color: "text.secondary", fontSize: "0.78rem" }}>
            Could not load key ratios.
          </Typography>
        </Paper>
      )}

      <SectionHeader
        title="Report Library"
        subtitle="Generate statutory, management, ledger, cash, budget, and control reports."
      />

      <Box sx={styles.reportGrid}>
        {reports.map((report) => (
          <ReportCard key={report.title} report={report} />
        ))}
      </Box>
    </Box>
  );
};

export default AccountingReports;