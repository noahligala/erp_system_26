import React, { useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import {
  Box,
  Button,
  IconButton,
  Typography,
  useTheme,
  CircularProgress,
  Alert,
  Paper,
  Divider,
  Skeleton,
  Tooltip,
  Grid,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Avatar,
  ListItemButton,
  Stack,
  LinearProgress,
  Chip,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { DateTime } from "luxon";

import RefreshIcon from "@mui/icons-material/Refresh";
import GroupIcon from "@mui/icons-material/Group";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import BusinessCenterIcon from "@mui/icons-material/BusinessCenter";
import BeachAccessIcon from "@mui/icons-material/BeachAccess";
import CakeOutlinedIcon from "@mui/icons-material/CakeOutlined";
import CelebrationOutlinedIcon from "@mui/icons-material/CelebrationOutlined";
import PlaylistAddCheckIcon from "@mui/icons-material/PlaylistAddCheck";
import AddBusinessIcon from "@mui/icons-material/AddBusiness";
import PersonAddAlt1Icon from "@mui/icons-material/PersonAddAlt1";
import PaymentsIcon from "@mui/icons-material/Payments";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import AutoGraphRoundedIcon from "@mui/icons-material/AutoGraphRounded";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";

import Header from "../../components/Header";
import LineChart from "../../components/LineChart";
import BarChart from "../../components/BarChart";
import { useAuth } from "../../api/AuthProvider";

const hasRole = (user, roles) => user && roles.includes(user.company_role);

const getAccentVars = (color) => ({
  "--accent": color,
  "--accent-bg": alpha(color, 0.1),
  "--accent-border": alpha(color, 0.16),
  "--accent-border-strong": alpha(color, 0.28),
});

const normalizeDashboardResponse = (res) => {
  if (!res) {
    return {
      ok: false,
      message: "Empty response",
      data: null,
      warning: null,
      generatedAt: null,
    };
  }

  const data = res.data ?? res;
  const generatedAt = res.metadata?.generated_at || null;
  const failedSections = Array.isArray(res.failed_sections)
    ? res.failed_sections
    : [];
  const isPartial = res.status === "partial" || failedSections.length > 0;

  if (res.success === false) {
    return {
      ok: !!data,
      message: res.message || res.error || "Failed to load HRM data",
      data: data || null,
      warning: data ? "Server returned partial/failed response." : null,
      generatedAt,
    };
  }

  const warning = isPartial
    ? failedSections.length
      ? `Partial data loaded. Unavailable: ${failedSections.join(", ")}`
      : "Partial data loaded — some dashboard sections may be unavailable."
    : null;

  return {
    ok: true,
    message: null,
    data,
    warning,
    generatedAt,
  };
};

const formatNumber = (value) => {
  if (value === null || value === undefined || value === "") return "—";

  const number = Number(value);
  if (!Number.isFinite(number)) return value;

  return new Intl.NumberFormat("en-KE").format(number);
};

const DashboardSkeleton = () => {
  const theme = useTheme();
  const styles = theme.hrmDashboard;

  return (
    <Box sx={styles.shell}>
      <Skeleton
        variant="rounded"
        height={118}
        sx={{ borderRadius: "14px", mb: 2.5 }}
      />

      <Grid container spacing={2}>
        {[...Array(4)].map((_, i) => (
          <Grid item xs={12} sm={6} lg={3} key={`stat-${i}`}>
            <Paper sx={{ ...styles.card, minHeight: 136 }}>
              <Skeleton variant="circular" width={38} height={38} />
              <Skeleton variant="text" width="48%" height={34} sx={{ mt: 2 }} />
              <Skeleton variant="text" width="74%" height={18} />
            </Paper>
          </Grid>
        ))}

        <Grid item xs={12}>
          <Paper sx={styles.card}>
            <Skeleton variant="text" width={170} height={28} sx={{ mb: 1.5 }} />

            <Grid container spacing={1.5}>
              {[...Array(8)].map((_, i) => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={`nav-${i}`}>
                  <Paper sx={{ ...styles.subtleCard, minHeight: 124 }}>
                    <Skeleton variant="circular" width={34} height={34} />
                    <Skeleton
                      variant="text"
                      width="58%"
                      height={24}
                      sx={{ mt: 1.5 }}
                    />
                    <Skeleton variant="text" width="78%" height={16} />
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

const AccentIcon = ({ icon, color, small = false }) => {
  const theme = useTheme();
  const styles = theme.hrmDashboard;

  return (
    <Box
      sx={small ? styles.iconBoxSmall : styles.iconBox}
      style={getAccentVars(color)}
    >
      {icon}
    </Box>
  );
};

const SectionHeader = ({ title, subtitle, icon, action }) => {
  const theme = useTheme();
  const styles = theme.hrmDashboard;

  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      justifyContent="space-between"
      alignItems={{ xs: "flex-start", sm: "center" }}
      spacing={1.5}
      sx={{ mb: 1.5 }}
    >
      <Stack direction="row" spacing={1.25} alignItems="flex-start">
        {icon && <Box sx={{ mt: 0.15 }}>{icon}</Box>}

        <Box>
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

const EmptyState = ({ title, subtitle }) => {
  const theme = useTheme();
  const styles = theme.hrmDashboard;

  return (
    <Box
      sx={{
        height: "100%",
        minHeight: 150,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        px: 2.5,
      }}
    >
      <Box>
        <Box sx={styles.emptyIcon} />

        <Typography
          sx={{
            fontWeight: 500,
            color: "text.primary",
            fontSize: "0.8rem",
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

const StatCard = ({ title, value, subtitle, icon, color, trend }) => {
  const theme = useTheme();
  const styles = theme.hrmDashboard;

  return (
    <Paper
      elevation={0}
      sx={{
        ...styles.card,
        ...styles.statCard,
        height: "100%",
      }}
      style={getAccentVars(color)}
    >
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="flex-start"
        spacing={1.5}
      >
        <AccentIcon icon={icon} color={color} />

        {trend && (
          <Chip
            size="small"
            icon={<AutoGraphRoundedIcon sx={{ fontSize: 14 }} />}
            label={trend}
            sx={{
              height: 22,
              borderRadius: "999px",
              bgcolor: alpha(color, 0.09),
              color,
              fontWeight: 400,
              fontSize: "0.64rem",
              "& .MuiChip-icon": { color },
            }}
          />
        )}
      </Stack>

      <Box sx={{ mt: 2 }}>
        <Typography sx={styles.statValue}>{formatNumber(value)}</Typography>
        <Typography sx={styles.statTitle}>{title}</Typography>

        {subtitle && (
          <Typography sx={styles.statSubtitle}>{subtitle}</Typography>
        )}
      </Box>
    </Paper>
  );
};

const NavigationCard = ({
  title,
  subtitle,
  icon,
  linkTo,
  color,
  disabled = false,
  badge,
}) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const styles = theme.hrmDashboard;

  const handleClick = useCallback(() => {
    if (!disabled) navigate(linkTo);
  }, [disabled, navigate, linkTo]);

  return (
    <Paper
      elevation={0}
      onClick={handleClick}
      data-disabled={disabled ? "true" : "false"}
      sx={{
        ...styles.subtleCard,
        ...styles.navCard,
        height: "100%",
      }}
      style={getAccentVars(color)}
    >
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="flex-start"
        spacing={1.5}
      >
        <AccentIcon icon={icon} color={color} small />

        {badge && (
          <Chip
            label={badge}
            size="small"
            sx={{
              height: 21,
              fontSize: "0.62rem",
              borderRadius: "999px",
              bgcolor: alpha(color, 0.09),
              color,
              fontWeight: 400,
              maxWidth: 112,
            }}
          />
        )}
      </Stack>

      <Box sx={{ mt: 1.5 }}>
        <Typography sx={styles.navTitle}>{title}</Typography>
        <Typography sx={styles.navSubtitle}>{subtitle}</Typography>
      </Box>

      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mt: 1.5 }}
      >
        <Typography
          sx={{
            ...styles.navAction,
            color: disabled ? "text.disabled" : "var(--accent)",
          }}
        >
          {disabled ? "Restricted" : "Open module"}
        </Typography>

        {!disabled && (
          <ArrowForwardRoundedIcon
            sx={{
              fontSize: 18,
              color,
            }}
          />
        )}
      </Stack>
    </Paper>
  );
};

const EventItem = ({ type, name, date, years }) => {
  const theme = useTheme();
  const isBirthday = type === "birthday";
  const color = isBirthday
    ? theme.palette.secondary.main
    : theme.palette.primary.main;

  return (
    <ListItem
      sx={{
        py: 0.75,
        px: 0.75,
        borderRadius: "12px",
        mb: 0.5,
        border: `1px solid ${alpha(theme.palette.divider, 0.55)}`,
        "&:hover": {
          bgcolor: alpha(color, 0.045),
          borderColor: alpha(color, 0.16),
        },
      }}
    >
      <ListItemIcon sx={{ minWidth: 40 }}>
        <Avatar
          sx={{
            bgcolor: alpha(color, 0.11),
            color,
            width: 30,
            height: 30,
            border: `1px solid ${alpha(color, 0.16)}`,
          }}
        >
          {isBirthday ? (
            <CakeOutlinedIcon sx={{ fontSize: 16 }} />
          ) : (
            <CelebrationOutlinedIcon sx={{ fontSize: 16 }} />
          )}
        </Avatar>
      </ListItemIcon>

      <ListItemText
        primary={name}
        secondary={
          isBirthday
            ? `Birthday on ${DateTime.fromISO(date).toLocaleString(
                DateTime.DATE_MED
              )}`
            : `Anniversary (${years} yrs) on ${DateTime.fromISO(
                date
              ).toLocaleString(DateTime.DATE_MED)}`
        }
        primaryTypographyProps={{
          fontSize: "0.76rem",
          fontWeight: 500,
          color: "text.primary",
        }}
        secondaryTypographyProps={{
          fontSize: "0.68rem",
          color: "text.secondary",
          fontWeight: 400,
        }}
      />
    </ListItem>
  );
};

const HrmDashboard = () => {
  const theme = useTheme();
  const styles = theme.hrmDashboard;
  const navigate = useNavigate();
  const { apiClient, isAuthenticated, user } = useAuth();

  const canManageLeave = hasRole(user, ["MANAGER", "ADMIN", "OWNER"]);
  const canManageRecruitment = hasRole(user, ["MANAGER", "ADMIN", "OWNER"]);
  const canAddEmployee = hasRole(user, ["HR", "MANAGER", "ADMIN", "OWNER"]);
  const canViewPayroll = hasRole(user, [
    "HR",
    "ACCOUNTANT",
    "ADMIN",
    "OWNER",
  ]);

  const fetchHrmDashboard = async ({ signal }) => {
    const response = await apiClient.get("/dashboard/hrm", { signal });
    const normalized = normalizeDashboardResponse(response.data);

    if (!normalized.ok && !normalized.data) {
      throw new Error(normalized.message);
    }

    return normalized;
  };

  const {
    data: normalizedData,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["hrm-dashboard"],
    queryFn: fetchHrmDashboard,
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
    retry: 2,
    placeholderData: keepPreviousData,
  });

  const dashboardData = normalizedData?.data;
  const partialWarning = normalizedData?.warning;

  const lastUpdated = useMemo(() => {
    return normalizedData?.generatedAt
      ? DateTime.fromISO(normalizedData.generatedAt)
      : null;
  }, [normalizedData]);

  const hrmOverview = dashboardData?.hrm_overview || {};
  const recruitmentOverview = dashboardData?.recruitment_overview || {};
  const workforceAnalytics = dashboardData?.workforce_analytics || {};
  const upcomingEvents = dashboardData?.upcoming_events || {
    birthdays: [],
    anniversaries: [],
  };

  const hiringTrendData = useMemo(() => {
    const trends = Array.isArray(workforceAnalytics?.hiring_trends)
      ? workforceAnalytics.hiring_trends
      : [];

    return trends.map((d) => ({
      x: d.month || "N/A",
      y: Number.isFinite(Number(d.count)) ? Number(d.count) : 0,
    }));
  }, [workforceAnalytics]);

  const departmentBreakdownData = useMemo(() => {
    const breakdown = Array.isArray(workforceAnalytics?.department_breakdown)
      ? workforceAnalytics.department_breakdown
      : [];

    return breakdown.map((d) => ({
      id: d.name || "Unknown",
      Department: d.name || "Unknown",
      Count: Number.isFinite(Number(d.count)) ? Number(d.count) : 0,
    }));
  }, [workforceAnalytics]);

  const birthdayCount = upcomingEvents.birthdays?.length || 0;
  const anniversaryCount = upcomingEvents.anniversaries?.length || 0;
  const eventCount = birthdayCount + anniversaryCount;

  const pendingLeave = Number(hrmOverview.pending_leave_requests || 0);
  const activeEmployees = Number(hrmOverview.active_employees || 0);
  const newHires = Number(hrmOverview.new_hires_period || 0);
  const openPositions = Number(recruitmentOverview.open_positions || 0);

  if (isLoading) return <DashboardSkeleton />;

  if (isError && !dashboardData) {
    return (
      <Box sx={styles.shell}>
        <Paper elevation={0} sx={{ ...styles.card, mb: 2.5 }}>
          <Header
            title="HRM DASHBOARD"
            subtitle="Key metrics and quick actions"
          />
        </Paper>

        <Alert
          severity="error"
          sx={{
            borderRadius: "12px",
            fontSize: "0.76rem",
            fontWeight: 400,
          }}
          action={
            <Button onClick={() => refetch()} color="inherit" size="small">
              Retry
            </Button>
          }
        >
          {error.message}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={styles.shell}>
      <Paper elevation={0} sx={{ ...styles.card, ...styles.heroCard }}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", md: "center" }}
          spacing={2}
        >
          <Box>
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              flexWrap="wrap"
              useFlexGap
              sx={{ mb: 1 }}
            >
              <Chip
                icon={<ShieldOutlinedIcon sx={{ fontSize: 14 }} />}
                label="Human Resource Management"
                size="small"
                sx={{
                  borderRadius: "999px",
                  bgcolor: alpha(theme.palette.primary.main, 0.09),
                  color: theme.palette.primary.main,
                  fontWeight: 400,
                  fontSize: "0.66rem",
                  "& .MuiChip-icon": {
                    color: theme.palette.primary.main,
                  },
                }}
              />

              {lastUpdated && (
                <Chip
                  icon={<AccessTimeRoundedIcon sx={{ fontSize: 14 }} />}
                  label={`Updated ${lastUpdated.toLocaleString(
                    DateTime.TIME_SIMPLE
                  )}`}
                  size="small"
                  sx={{
                    borderRadius: "999px",
                    bgcolor: alpha(theme.palette.text.primary, 0.055),
                    color: "text.secondary",
                    fontWeight: 400,
                    fontSize: "0.66rem",
                    "& .MuiChip-icon": {
                      color: "text.secondary",
                    },
                  }}
                />
              )}
            </Stack>

            <Typography sx={styles.heroTitle}>HRM Dashboard</Typography>

            <Typography sx={styles.heroSubtitle}>
              Monitor workforce health, approvals, recruitment activity, and
              people operations from one control center.
            </Typography>
          </Box>

          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1}
            alignItems={{ xs: "stretch", sm: "center" }}
            width={{ xs: "100%", md: "auto" }}
          >
            <Button
              variant="contained"
              startIcon={<PersonAddAlt1Icon />}
              onClick={() => navigate("/hrm/add-employee")}
              disabled={!canAddEmployee}
              sx={{
                borderRadius: "10px",
                px: 1.75,
                py: 0.85,
                textTransform: "none",
                fontWeight: 500,
                fontSize: "0.75rem",
                boxShadow: "none",
              }}
            >
              Add Employee
            </Button>

            <Tooltip title="Refresh dashboard">
              <span>
                <IconButton
                  onClick={() => refetch()}
                  disabled={isFetching}
                  sx={{
                    width: 38,
                    height: 38,
                    borderRadius: "10px",
                    bgcolor: alpha(theme.palette.primary.main, 0.09),
                    color: theme.palette.primary.main,
                    border: `1px solid ${alpha(
                      theme.palette.primary.main,
                      0.16
                    )}`,
                    "&:hover": {
                      bgcolor: alpha(theme.palette.primary.main, 0.13),
                    },
                  }}
                >
                  {isFetching ? (
                    <CircularProgress size={18} color="inherit" />
                  ) : (
                    <RefreshIcon fontSize="small" />
                  )}
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
        </Stack>

        <Divider sx={{ my: 2, borderColor: alpha(theme.palette.divider, 0.7) }} />

        <Grid container spacing={1.25}>
          <Grid item xs={6} md={3}>
            <Typography sx={{ fontSize: "0.66rem", color: "text.secondary" }}>
              Workforce
            </Typography>
            <Typography sx={{ fontSize: "0.9rem", fontWeight: 500 }}>
              {formatNumber(activeEmployees)} active
            </Typography>
          </Grid>

          <Grid item xs={6} md={3}>
            <Typography sx={{ fontSize: "0.66rem", color: "text.secondary" }}>
              Recruitment
            </Typography>
            <Typography sx={{ fontSize: "0.9rem", fontWeight: 500 }}>
              {formatNumber(openPositions)} open roles
            </Typography>
          </Grid>

          <Grid item xs={6} md={3}>
            <Typography sx={{ fontSize: "0.66rem", color: "text.secondary" }}>
              Approvals
            </Typography>
            <Typography sx={{ fontSize: "0.9rem", fontWeight: 500 }}>
              {formatNumber(pendingLeave)} pending
            </Typography>
          </Grid>

          <Grid item xs={6} md={3}>
            <Typography sx={{ fontSize: "0.66rem", color: "text.secondary" }}>
              Events
            </Typography>
            <Typography sx={{ fontSize: "0.9rem", fontWeight: 500 }}>
              {formatNumber(eventCount)} this week
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      {isFetching && !isLoading && (
        <LinearProgress
          sx={{
            mb: 2,
            borderRadius: "999px",
            height: 4,
            bgcolor: alpha(theme.palette.primary.main, 0.08),
          }}
        />
      )}

      {partialWarning && dashboardData && (
        <Alert
          severity="warning"
          sx={{
            mb: 2.5,
            borderRadius: "12px",
            fontSize: "0.76rem",
            fontWeight: 400,
          }}
        >
          {partialWarning}
        </Alert>
      )}

      {dashboardData && (
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} lg={3}>
            <StatCard
              title="Active Employees"
              subtitle="Current active workforce"
              value={activeEmployees}
              icon={<GroupIcon />}
              color={theme.palette.primary.main}
              trend="Live"
            />
          </Grid>

          <Grid item xs={12} sm={6} lg={3}>
            <StatCard
              title="New Hires"
              subtitle="Recently onboarded employees"
              value={newHires}
              icon={<PersonAddIcon />}
              color={theme.palette.info.main}
              trend="Recent"
            />
          </Grid>

          <Grid item xs={12} sm={6} lg={3}>
            <StatCard
              title="Pending Leave"
              subtitle="Requests awaiting action"
              value={pendingLeave}
              icon={<BeachAccessIcon />}
              color={theme.palette.warning.main}
              trend={canManageLeave ? "Review" : "Track"}
            />
          </Grid>

          <Grid item xs={12} sm={6} lg={3}>
            <StatCard
              title="Open Positions"
              subtitle="Recruitment pipeline"
              value={openPositions}
              icon={<BusinessCenterIcon />}
              color={theme.palette.success.main}
              trend="Hiring"
            />
          </Grid>

          <Grid item xs={12}>
            <Paper elevation={0} sx={styles.card}>
              <SectionHeader
                title="Quick Actions"
                subtitle="Frequently used HR operations and management modules."
                action={
                  <Chip
                    size="small"
                    label="Operations"
                    sx={{
                      bgcolor: alpha(theme.palette.primary.main, 0.08),
                      color: theme.palette.primary.main,
                      fontSize: "0.66rem",
                    }}
                  />
                }
              />

              <Grid container spacing={1.5}>
                <Grid item xs={12} sm={6} md={4} lg={3}>
                  <NavigationCard
                    title="Employees"
                    subtitle="View and manage your team"
                    icon={<GroupIcon />}
                    linkTo="/team"
                    color={theme.palette.primary.main}
                    badge="Core"
                  />
                </Grid>

                <Grid item xs={12} sm={6} md={4} lg={3}>
                  <NavigationCard
                    title="Add Employee"
                    subtitle="Onboard a new team member"
                    icon={<PersonAddAlt1Icon />}
                    linkTo="/hrm/add-employee"
                    color={theme.palette.info.main}
                    disabled={!canAddEmployee}
                  />
                </Grid>

                <Grid item xs={12} sm={6} md={4} lg={3}>
                  <NavigationCard
                    title="Leave Management"
                    subtitle="Requests, approvals and balances"
                    icon={<BeachAccessIcon />}
                    linkTo={
                      canManageLeave
                        ? "/hrm/manage-leave"
                        : "/hrm/request-leave"
                    }
                    color={theme.palette.warning.main}
                    badge={pendingLeave ? `${pendingLeave} pending` : null}
                  />
                </Grid>

                <Grid item xs={12} sm={6} md={4} lg={3}>
                  <NavigationCard
                    title="Recruitment"
                    subtitle="Manage job openings"
                    icon={<BusinessCenterIcon />}
                    linkTo="/recruitment/openings"
                    color={theme.palette.success.main}
                    disabled={!canManageRecruitment}
                  />
                </Grid>

                <Grid item xs={12} sm={6} md={4} lg={3}>
                  <NavigationCard
                    title="Add Job Opening"
                    subtitle="Publish a new position"
                    icon={<AddBusinessIcon />}
                    linkTo="/recruitment/add-opening"
                    color={theme.palette.success.light}
                    disabled={!canManageRecruitment}
                  />
                </Grid>

                <Grid item xs={12} sm={6} md={4} lg={3}>
                  <NavigationCard
                    title="Applicants"
                    subtitle="Track and review candidates"
                    icon={<PersonAddIcon />}
                    linkTo="/recruitment/applicants"
                    color={theme.palette.secondary.main}
                    disabled={!canManageRecruitment}
                  />
                </Grid>

                <Grid item xs={12} sm={6} md={4} lg={3}>
                  <NavigationCard
                    title="Payroll"
                    subtitle="Manage and run payroll"
                    icon={<PaymentsIcon />}
                    linkTo="/accounts/payroll"
                    color={theme.palette.error.main}
                    disabled={!canViewPayroll}
                  />
                </Grid>

                <Grid item xs={12} sm={6} md={4} lg={3}>
                  <NavigationCard
                    title="Performance"
                    subtitle="Reviews, goals and progress"
                    icon={<TrendingUpIcon />}
                    linkTo="/performance"
                    color={theme.palette.warning.main}
                    disabled
                  />
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          <Grid item xs={12} lg={8}>
            <Paper elevation={0} sx={{ ...styles.card, ...styles.chartCard }}>
              <SectionHeader
                title="Hiring Trends"
                subtitle="Monthly hiring movement across the selected period."
                icon={
                  <AccentIcon
                    icon={<TrendingUpIcon />}
                    color={theme.palette.primary.main}
                    small
                  />
                }
                action={
                  <Chip
                    size="small"
                    label={`${hiringTrendData.length} periods`}
                    sx={{
                      borderRadius: "999px",
                      fontWeight: 400,
                      bgcolor: alpha(theme.palette.primary.main, 0.08),
                      color: theme.palette.primary.main,
                      fontSize: "0.66rem",
                    }}
                  />
                }
              />

              <Divider sx={{ borderColor: alpha(theme.palette.divider, 0.55) }} />

              <Box flex={1} minHeight={0} mt={1.5}>
                {hiringTrendData.length > 0 ? (
                  <LineChart
                    isDashboard
                    data={[{ id: "Hires", data: hiringTrendData }]}
                  />
                ) : (
                  <EmptyState
                    title="No hiring trend data"
                    subtitle="Hiring activity will appear here once records are available."
                  />
                )}
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12} lg={4}>
            <Paper elevation={0} sx={{ ...styles.card, ...styles.chartCard }}>
              <SectionHeader
                title="Department Breakdown"
                subtitle="Employee distribution by department."
                icon={
                  <AccentIcon
                    icon={<GroupIcon />}
                    color={theme.palette.info.main}
                    small
                  />
                }
              />

              <Divider sx={{ borderColor: alpha(theme.palette.divider, 0.55) }} />

              <Box flex={1} minHeight={0} mt={1.5}>
                {departmentBreakdownData.length > 0 ? (
                  <BarChart
                    isDashboard
                    data={departmentBreakdownData}
                    keys={["Count"]}
                    indexBy="Department"
                    layout="vertical"
                    margin={{ top: 10, right: 12, bottom: 38, left: 42 }}
                    padding={0.4}
                    valueScale={{ type: "linear" }}
                    indexScale={{ type: "band", round: true }}
                    axisTop={null}
                    axisRight={null}
                    axisBottom={{
                      tickSize: 5,
                      tickPadding: 5,
                      tickRotation: -25,
                      format: (e) => (Math.floor(e) === e ? e : ""),
                    }}
                    axisLeft={{
                      tickSize: 5,
                      tickPadding: 5,
                      tickRotation: 0,
                    }}
                    labelSkipWidth={12}
                    labelSkipHeight={12}
                    theme={{
                      axis: {
                        ticks: {
                          text: {
                            fill: theme.palette.text.secondary,
                            fontSize: 10,
                          },
                        },
                      },
                      tooltip: {
                        container: {
                          background: theme.palette.background.paper,
                          color: theme.palette.text.primary,
                          borderRadius: 10,
                          fontSize: 12,
                          boxShadow: theme.custom?.shadowPopup,
                        },
                      },
                    }}
                  />
                ) : (
                  <EmptyState
                    title="No department data"
                    subtitle="Department analytics will appear after employee records are grouped."
                  />
                )}
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6} lg={4}>
            <Paper elevation={0} sx={{ ...styles.card, ...styles.listCard }}>
              <SectionHeader
                title="Upcoming Events"
                subtitle="Birthdays and anniversaries in the next 7 days."
                icon={
                  <AccentIcon
                    icon={<CelebrationOutlinedIcon />}
                    color={theme.palette.secondary.main}
                    small
                  />
                }
                action={
                  <Chip
                    size="small"
                    label={`${eventCount} event${eventCount === 1 ? "" : "s"}`}
                    sx={{
                      borderRadius: "999px",
                      fontWeight: 400,
                      bgcolor: alpha(theme.palette.secondary.main, 0.08),
                      color: theme.palette.secondary.main,
                      fontSize: "0.66rem",
                    }}
                  />
                }
              />

              <Divider sx={{ borderColor: alpha(theme.palette.divider, 0.55) }} />

              <Box sx={{ flexGrow: 1, overflowY: "auto", pr: 0.5, mt: 1 }}>
                {eventCount === 0 ? (
                  <EmptyState
                    title="No upcoming events"
                    subtitle="No birthdays or anniversaries are due this week."
                  />
                ) : (
                  <List dense sx={{ p: 0 }}>
                    {(upcomingEvents.birthdays || []).map((event) => (
                      <EventItem
                        key={`birthday-${event.id}`}
                        type="birthday"
                        name={event.name}
                        date={event.date}
                      />
                    ))}

                    {(upcomingEvents.anniversaries || []).map((event) => (
                      <EventItem
                        key={`anniversary-${event.id}`}
                        type="anniversary"
                        name={event.name}
                        date={event.date}
                        years={event.years}
                      />
                    ))}
                  </List>
                )}
              </Box>
            </Paper>
          </Grid>

          {canManageLeave && (
            <Grid item xs={12} md={6} lg={4}>
              <Paper elevation={0} sx={{ ...styles.card, ...styles.listCard }}>
                <SectionHeader
                  title="Pending Actions"
                  subtitle="Items requiring manager or admin review."
                  icon={
                    <AccentIcon
                      icon={<PlaylistAddCheckIcon />}
                      color={theme.palette.warning.main}
                      small
                    />
                  }
                />

                <Divider
                  sx={{ borderColor: alpha(theme.palette.divider, 0.55) }}
                />

                <Box sx={{ flexGrow: 1, overflowY: "auto", pr: 0.5, mt: 1 }}>
                  {pendingLeave === 0 ? (
                    <EmptyState
                      title="All clear"
                      subtitle="There are no pending HR approvals right now."
                    />
                  ) : (
                    <List dense sx={{ p: 0 }}>
                      <ListItemButton
                        onClick={() => navigate("/hrm/manage-leave")}
                        sx={{
                          py: 1.1,
                          px: 1.15,
                          borderRadius: "12px",
                          border: `1px solid ${alpha(
                            theme.palette.warning.main,
                            0.2
                          )}`,
                          bgcolor: alpha(theme.palette.warning.main, 0.045),
                          "&:hover": {
                            bgcolor: alpha(theme.palette.warning.main, 0.075),
                          },
                        }}
                      >
                        <ListItemIcon sx={{ minWidth: 40 }}>
                          <Avatar
                            sx={{
                              bgcolor: alpha(theme.palette.warning.main, 0.11),
                              color: theme.palette.warning.main,
                              width: 32,
                              height: 32,
                            }}
                          >
                            <BeachAccessIcon sx={{ fontSize: 17 }} />
                          </Avatar>
                        </ListItemIcon>

                        <ListItemText
                          primary={`${pendingLeave} Leave Request(s)`}
                          secondary="Awaiting approval"
                          primaryTypographyProps={{
                            fontSize: "0.76rem",
                            fontWeight: 500,
                            color: "text.primary",
                          }}
                          secondaryTypographyProps={{
                            fontSize: "0.68rem",
                            color: "text.secondary",
                            fontWeight: 400,
                          }}
                        />

                        <ArrowForwardRoundedIcon
                          sx={{
                            color: theme.palette.warning.main,
                            fontSize: 19,
                          }}
                        />
                      </ListItemButton>
                    </List>
                  )}
                </Box>
              </Paper>
            </Grid>
          )}

          <Grid item xs={12} lg={canManageLeave ? 4 : 8}>
            <Paper
              elevation={0}
              sx={{
                ...styles.card,
                ...styles.futureInsightCard,
              }}
            >
              <Box sx={{ maxWidth: 420 }}>
                <Chip
                  label="Coming soon"
                  size="small"
                  sx={{
                    borderRadius: "999px",
                    fontWeight: 400,
                    bgcolor: alpha(theme.palette.primary.main, 0.08),
                    color: theme.palette.primary.main,
                    mb: 1.25,
                    fontSize: "0.66rem",
                  }}
                />

                <Typography
                  sx={{
                    fontWeight: 500,
                    fontSize: "0.95rem",
                    letterSpacing: "-0.02em",
                    color: "text.primary",
                  }}
                >
                  Workforce intelligence
                </Typography>

                <Typography
                  sx={{
                    mt: 0.75,
                    color: "text.secondary",
                    fontSize: "0.74rem",
                    lineHeight: 1.65,
                    fontWeight: 400,
                  }}
                >
                  Future insights can include leave utilization, turnover risk,
                  department cost trends, attendance alerts, and performance
                  review summaries.
                </Typography>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      )}

      {lastUpdated && (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            mt: 2.5,
            textAlign: "right",
            fontSize: "0.68rem",
            fontWeight: 400,
          }}
        >
          Last updated:{" "}
          {lastUpdated.toLocaleString(DateTime.DATETIME_MED_WITH_SECONDS)}
        </Typography>
      )}
    </Box>
  );
};

export default HrmDashboard;