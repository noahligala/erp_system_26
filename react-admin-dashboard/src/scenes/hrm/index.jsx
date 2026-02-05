// src/scenes/hrm/index.jsx (HRM Dashboard - Fixed Partial Load Handling + Robust Fetch)

import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
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
} from "@mui/material";
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

import { tokens } from "../../theme";
import Header from "../../components/Header";
import StatBox from "../../components/StatBox";
import LineChart from "../../components/LineChart";
import BarChart from "../../components/BarChart";
import { useAuth } from "../../api/AuthProvider";

// --- Skeleton Component ---
const DashboardSkeleton = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  return (
    <Box m="20px">
      <Skeleton variant="text" width={250} height={40} sx={{ mb: 1 }} />
      <Skeleton variant="text" width={350} height={20} sx={{ mb: 3 }} />
      <Grid container spacing={3}>
        {[...Array(4)].map((_, i) => (
          <Grid item xs={12} sm={6} lg={3} key={`stat-${i}`}>
            <Paper
              sx={{
                p: 2,
                borderRadius: "12px",
                minHeight: "130px",
                backgroundColor: colors.primary[400],
              }}
            >
              <Skeleton variant="text" width="60%" height={30} />
              <Skeleton variant="text" width="80%" height={20} sx={{ mt: 1 }} />
              <Skeleton variant="circular" width={30} height={30} sx={{ mt: 2 }} />
            </Paper>
          </Grid>
        ))}

        <Grid item xs={12}>
          <Paper sx={{ p: 2.5, borderRadius: "12px", backgroundColor: colors.primary[400] }}>
            <Skeleton variant="text" width="20%" height={30} sx={{ mb: 2 }} />
            <Grid container spacing={3}>
              {[...Array(8)].map((_, i) => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={`nav-${i}`}>
                  <Paper
                    sx={{
                      p: 2,
                      borderRadius: "12px",
                      minHeight: "120px",
                      backgroundColor: colors.primary[500],
                    }}
                  >
                    <Skeleton variant="text" width="50%" height={25} />
                    <Skeleton variant="text" width="70%" height={15} sx={{ mt: 1 }} />
                    <Skeleton variant="text" width="30%" height={20} sx={{ mt: 3, ml: "auto" }} />
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Paper>
        </Grid>

        <Grid item xs={12} lg={8}>
          <Paper
            sx={{
              p: 2.5,
              borderRadius: "12px",
              height: "350px",
              backgroundColor: colors.primary[400],
            }}
          >
            <Skeleton variant="text" width="40%" height={30} sx={{ mb: 2 }} />
            <Skeleton variant="rectangular" width="100%" height={250} />
          </Paper>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Paper
            sx={{
              p: 2.5,
              borderRadius: "12px",
              height: "350px",
              backgroundColor: colors.primary[400],
            }}
          >
            <Skeleton variant="text" width="60%" height={30} sx={{ mb: 2 }} />
            <Skeleton variant="rectangular" width="100%" height={250} />
          </Paper>
        </Grid>

        {[...Array(2)].map((_, idx) => (
          <Grid item xs={12} md={6} lg={4} key={`list-${idx}`}>
            <Paper
              sx={{
                p: 2.5,
                borderRadius: "12px",
                height: "300px",
                backgroundColor: colors.primary[400],
              }}
            >
              <Skeleton variant="text" width="50%" height={30} sx={{ mb: 2 }} />
              {[...Array(3)].map((__, i) => (
                <Skeleton key={i} variant="text" width="90%" height={40} sx={{ mb: 1 }} />
              ))}
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

// --- Navigation Card Component ---
const NavigationCard = ({ title, subtitle, icon, linkTo, color, disabled = false }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const colors = tokens(theme.palette.mode);

  return (
    <Paper
      elevation={2}
      sx={{
        p: 2,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        minHeight: "125px",
        backgroundColor: colors.primary[400],
        borderRadius: "12px",
        opacity: disabled ? 0.6 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out",
        "&:hover": disabled ? {} : { transform: "translateY(-4px)", boxShadow: theme.shadows[6] },
      }}
      onClick={() => !disabled && navigate(linkTo)}
    >
      <Box display="flex" justifyContent="space-between" alignItems="start">
        <Box>
          <Typography variant="h6" fontWeight="600" color={colors.grey[100]}>
            {title}
          </Typography>
          <Typography variant="caption" color={colors.grey[300]}>
            {subtitle}
          </Typography>
        </Box>
        <Box sx={{ color: color || colors.greenAccent[500], fontSize: "28px", mt: "-5px" }}>
          {icon}
        </Box>
      </Box>

      <Box textAlign="right" mt={1}>
        {!disabled ? (
          <Typography variant="body2" color="secondary" sx={{ textTransform: "none", fontWeight: 500 }}>
            View &#8594;
          </Typography>
        ) : (
          <Typography variant="caption" color={colors.grey[500]}>
            (Coming Soon)
          </Typography>
        )}
      </Box>
    </Paper>
  );
};

const HrmDashboard = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const colors = tokens(theme.palette.mode);
  const { apiClient, isAuthenticated, user } = useAuth();

  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  // ✅ Split error types
  const [fatalError, setFatalError] = useState(null);          // no data at all
  const [partialWarning, setPartialWarning] = useState(null);  // data loaded but partial

  const [lastUpdated, setLastUpdated] = useState(null);

  // --- Permissions ---
  const canManageLeave = user && ["MANAGER", "ADMIN", "OWNER"].includes(user.company_role);
  const canManageRecruitment = user && ["MANAGER", "ADMIN", "OWNER"].includes(user.company_role);
  const canAddEmployee = user && ["HR", "MANAGER", "ADMIN", "OWNER"].includes(user.company_role);
  const canViewPayroll = user && ["HR", "ACCOUNTANT", "ADMIN", "OWNER"].includes(user.company_role);

  // ✅ Normalize backend formats
  const normalizeDashboardResponse = (res) => {
    // Supported formats:
    // 1) { success: true, data: {...}, metadata, failed_sections, status }
    // 2) { status: "success", data: {...} }
    // 3) plain object {...}
    if (!res) return { ok: false, message: "Empty response", data: null, warning: null, generatedAt: null };

    const data = res.data ?? res;
    const generatedAt = res.metadata?.generated_at || null;

    // detect "partial" in multiple ways
    const failedSections = Array.isArray(res.failed_sections) ? res.failed_sections : [];
    const isPartial = res.status === "partial" || failedSections.length > 0;

    // detect explicit failure
    if (res.success === false) {
      return { ok: false, message: res.message || res.error || "Failed to load HRM data", data: null, warning: null, generatedAt };
    }

    // Must have data
    if (!data) {
      return { ok: false, message: res.message || "No data returned", data: null, warning: null, generatedAt };
    }

    const warning = isPartial
      ? failedSections.length
        ? `Partial data loaded. Failed sections: ${failedSections.join(", ")}`
        : "Partial data loaded — some dashboard sections may be unavailable."
      : null;

    return { ok: true, message: null, data, warning, generatedAt };
  };

  // ✅ Data Fetching (NO THROW on partial)
  const fetchHrmData = useCallback(
    async (refresh = false) => {
      if (!isAuthenticated) return;

      setLoading(true);

      // on refresh, keep current data visible; only reset fatalError
      if (!dashboardData) {
        setFatalError(null);
      }
      setPartialWarning(null);

      try {
        const response = await apiClient.get("/dashboard/hrm", { params: { refresh } });
        const normalized = normalizeDashboardResponse(response.data);

        if (!normalized.ok) {
          // fatal
          setFatalError(normalized.message);
          if (!dashboardData) setDashboardData(null);
        } else {
          setDashboardData(normalized.data);
          setFatalError(null);
          setPartialWarning(normalized.warning);

          const iso = normalized.generatedAt || DateTime.now().toISO();
          setLastUpdated(DateTime.fromISO(iso));
        }
      } catch (err) {
        console.error("Error fetching HRM dashboard data:", err);
        const message = err?.response?.data?.message || err?.message || "Could not connect or fetch data.";
        setFatalError(message);
        if (!dashboardData) setDashboardData(null);
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [apiClient, isAuthenticated]
  );

  useEffect(() => {
    fetchHrmData();
  }, [fetchHrmData]);

  // --- Loading State ---
  if (loading && !dashboardData) return <DashboardSkeleton />;

  // --- Extract Data with Fallbacks ---
  const hrmOverview = dashboardData?.hrm_overview || {};
  const recruitmentOverview = dashboardData?.recruitment_overview || {};
  const workforceAnalytics = dashboardData?.workforce_analytics || {};
  const upcomingEvents = dashboardData?.upcoming_events || { birthdays: [], anniversaries: [] };

  // --- Prepare Chart Data Safely ---
  const hiringTrendData = (Array.isArray(workforceAnalytics?.hiring_trends) ? workforceAnalytics.hiring_trends : [])
    .map((d) => ({ x: d.month || "N/A", y: d.count || 0 }));

  const departmentBreakdownData = Array.isArray(workforceAnalytics?.department_breakdown)
    ? workforceAnalytics.department_breakdown.map((d) => ({
        id: d.name,
        Department: d.name,
        Count: d.count || 0,
      }))
    : [];

  return (
    <Box m={{ xs: "10px", md: "20px" }}>
      {/* --- Header & Refresh --- */}
      <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1} mb={3}>
        <Header title="HRM DASHBOARD" subtitle="Key metrics and quick actions" />
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <Tooltip title="Refresh Data">
            <span>
              <IconButton onClick={() => fetchHrmData(true)} disabled={loading} sx={{ ml: 1 }}>
                {loading ? <CircularProgress size={24} color="inherit" /> : <RefreshIcon />}
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      </Box>

      {/* ✅ Fatal Error (no data) */}
      {fatalError && !dashboardData && (
        <Alert
          severity="error"
          sx={{ mb: 3 }}
          action={
            <Button onClick={() => fetchHrmData(true)} color="inherit" size="small">
              Retry
            </Button>
          }
        >
          {fatalError}
        </Alert>
      )}

      {/* ✅ Partial Warning (data exists) */}
      {partialWarning && dashboardData && (
        <Alert
          severity="warning"
          sx={{ mb: 3 }}
          action={
            <Button onClick={() => fetchHrmData(true)} color="inherit" size="small">
              Refresh
            </Button>
          }
        >
          {partialWarning}
        </Alert>
      )}

      {/* --- Main Content Grid --- */}
      {dashboardData && (
        <Grid container spacing={2} sx={{ opacity: loading ? 0.7 : 1, transition: "opacity 0.2s ease" }}>
          {/* ROW 1: StatBoxes */}
          <Grid item xs={12} sm={6} lg={3}>
            <StatBox
              title={hrmOverview.active_employees ?? "N/A"}
              subtitle="Active Employees"
              icon={<GroupIcon sx={{ color: colors.greenAccent[600], fontSize: 28 }} />}
            />
          </Grid>
          <Grid item xs={12} sm={6} lg={3}>
            <StatBox
              title={hrmOverview.new_hires_period ?? "N/A"}
              subtitle="New Hires (Recent)"
              icon={<PersonAddIcon sx={{ color: colors.blueAccent[500], fontSize: 28 }} />}
            />
          </Grid>
          <Grid item xs={12} sm={6} lg={3}>
            <StatBox
              title={hrmOverview.pending_leave_requests ?? "N/A"}
              subtitle="Pending Leave Requests"
              icon={
                <BeachAccessIcon
                  sx={{ color: colors.yellowAccent ? colors.yellowAccent[600] : "orange", fontSize: 28 }}
                />
              }
            />
          </Grid>
          <Grid item xs={12} sm={6} lg={3}>
            <StatBox
              title={recruitmentOverview.open_positions ?? "N/A"}
              subtitle="Open Positions"
              icon={<BusinessCenterIcon sx={{ color: colors.blueAccent[300], fontSize: 28 }} />}
            />
          </Grid>

          {/* ROW 2: Quick Actions */}
          <Grid item xs={12}>
            <Paper sx={{ p: 2.5, borderRadius: "12px", backgroundColor: colors.primary[400] }}>
              <Typography variant="h6" fontWeight="600" color={colors.grey[100]} mb={1}>
                Quick Actions
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6} md={4} lg={3}>
                  <NavigationCard
                    title="Employees"
                    subtitle="View & Manage Team"
                    icon={<GroupIcon />}
                    linkTo="/team"
                    color={colors.blueAccent[400]}
                  />
                </Grid>

                <Grid item xs={12} sm={6} md={4} lg={3}>
                  <NavigationCard
                    title="Add Employee"
                    subtitle="Onboard New Hire"
                    icon={<PersonAddAlt1Icon />}
                    linkTo="/hrm/add-employee"
                    color={colors.tealAccent ? colors.tealAccent[500] : "teal"}
                    disabled={!canAddEmployee}
                  />
                </Grid>

                <Grid item xs={12} sm={6} md={4} lg={3}>
                  <NavigationCard
                    title="Leave Management"
                    subtitle="Requests & Approvals"
                    icon={<BeachAccessIcon />}
                    linkTo={canManageLeave ? "/hrm/manage-leave" : "/hrm/request-leave"}
                    color={colors.yellowAccent ? colors.yellowAccent[500] : "orange"}
                  />
                </Grid>

                <Grid item xs={12} sm={6} md={4} lg={3}>
                  <NavigationCard
                    title="Recruitment"
                    subtitle="Job Openings"
                    icon={<BusinessCenterIcon />}
                    linkTo="/recruitment/openings"
                    color={colors.greenAccent[500]}
                    disabled={!canManageRecruitment}
                  />
                </Grid>

                <Grid item xs={12} sm={6} md={4} lg={3}>
                  <NavigationCard
                    title="Add Job Opening"
                    subtitle="Post New Position"
                    icon={<AddBusinessIcon />}
                    linkTo="/recruitment/add-opening"
                    color={colors.greenAccent[600]}
                    disabled={!canManageRecruitment}
                  />
                </Grid>

                <Grid item xs={12} sm={6} md={4} lg={3}>
                  <NavigationCard
                    title="Applicants"
                    subtitle="Track Candidates"
                    icon={<PersonAddIcon />}
                    linkTo="/recruitment/applicants"
                    color={colors.purpleAccent ? colors.purpleAccent[500] : "purple"}
                    disabled={!canManageRecruitment}
                  />
                </Grid>

                <Grid item xs={12} sm={6} md={4} lg={3}>
                  <NavigationCard
                    title="Payroll"
                    subtitle="Manage & Run Payroll"
                    icon={<PaymentsIcon />}
                    linkTo="/accounts/payroll"
                    color={colors.redAccent[500]}
                    disabled={!canViewPayroll}
                  />
                </Grid>

                <Grid item xs={12} sm={6} md={4} lg={3}>
                  <NavigationCard
                    title="Performance"
                    subtitle="Reviews & Goals"
                    icon={<TrendingUpIcon />}
                    linkTo="/performance"
                    color={colors.orangeAccent ? colors.orangeAccent[500] : "orange"}
                    disabled
                  />
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          {/* ROW 3: Charts */}
          <Grid item xs={12} lg={4}>
            <Paper sx={{ p: 2.5, backgroundColor: colors.primary[400], borderRadius: "12px", height: "350px" }}>
              <Typography variant="h6" color={colors.grey[100]} fontWeight="600">
                Hiring Trends
              </Typography>
              <Box height="280px" mt={1}>
                {loading ? (
                  <Skeleton variant="rectangular" width="100%" height="100%" />
                ) : hiringTrendData.length > 0 ? (
                  <LineChart isDashboard data={[{ id: "Hires", data: hiringTrendData }]} />
                ) : (
                  <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                    <Typography color={colors.grey[400]} variant="body2">
                      No hiring trend data.
                    </Typography>
                  </Box>
                )}
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12} lg={4}>
            <Paper
              sx={{
                p: 2.5,
                backgroundColor: colors.primary[400],
                borderRadius: "12px",
                height: "350px",
                width: "100%",
              }}
            >
              <Typography variant="h6" color={colors.grey[100]} fontWeight="600">
                Department Breakdown
              </Typography>

              <Box height="280px" mt={1}>
                {loading ? (
                  <Skeleton variant="rectangular" width="100%" height="100%" />
                ) : departmentBreakdownData.length > 0 ? (
                  <BarChart
                    isDashboard
                    data={departmentBreakdownData}
                    keys={["Count"]}
                    indexBy="Department"
                    layout="vertical"
                    margin={{ top: 10, right: 30, bottom: 40, left: 100 }}
                    padding={0.4}
                    valueScale={{ type: "linear" }}
                    indexScale={{ type: "band", round: true }}
                    axisTop={null}
                    axisRight={null}
                    axisBottom={{
                      tickSize: 5,
                      tickPadding: 5,
                      tickRotation: 0,
                      legend: "Employee Count",
                      legendPosition: "middle",
                      legendOffset: 32,
                      format: (e) => (Math.floor(e) === e ? e : ""),
                    }}
                    axisLeft={{
                      tickSize: 5,
                      tickPadding: 5,
                      tickRotation: 0,
                      legend: "",
                      legendPosition: "middle",
                      legendOffset: -85,
                    }}
                    labelSkipWidth={12}
                    labelSkipHeight={12}
                    tooltip={({ value, indexValue }) => (
                      <strong
                        style={{
                          color: colors.grey[100],
                          background: colors.primary[500],
                          padding: "3px 6px",
                          borderRadius: "3px",
                        }}
                      >
                        {indexValue}: {value}
                      </strong>
                    )}
                    theme={{
                      axis: {
                        ticks: { text: { fill: colors.grey[300] } },
                        legend: { text: { fill: colors.grey[200] } },
                      },
                      tooltip: { container: { background: colors.primary[500], color: colors.grey[100] } },
                    }}
                  />
                ) : (
                  <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                    <Typography color={colors.grey[400]} variant="body2">
                      No department data.
                    </Typography>
                  </Box>
                )}
              </Box>
            </Paper>
          </Grid>

          {/* ROW 4: Lists */}
          <Grid item xs={12} md={6} lg={4}>
            <Paper
              sx={{
                p: 2.5,
                backgroundColor: colors.primary[400],
                borderRadius: "12px",
                height: "300px",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <Box display="flex" alignItems="center" mb={2}>
                <CakeOutlinedIcon sx={{ color: colors.pinkAccent ? colors.pinkAccent[500] : "pink", mr: 1 }} />
                <Typography variant="h6" color={colors.grey[100]} fontWeight="600">
                  Upcoming Events (Next 7d)
                </Typography>
              </Box>

              <Divider sx={{ mb: 1, borderColor: colors.grey[700] }} />

              <Box sx={{ flexGrow: 1, overflowY: "auto" }}>
                {loading ? (
                  <Box p={2}>
                    <Skeleton />
                    <Skeleton />
                    <Skeleton />
                  </Box>
                ) : (upcomingEvents.birthdays?.length === 0 && upcomingEvents.anniversaries?.length === 0) ? (
                  <Typography color={colors.grey[400]} variant="body2" textAlign="center" mt={4}>
                    No upcoming events.
                  </Typography>
                ) : (
                  <List dense sx={{ p: 0 }}>
                    {(upcomingEvents.birthdays || []).map((e) => (
                      <ListItem key={`b-${e.id}`} sx={{ py: 0.5 }}>
                        <ListItemIcon sx={{ minWidth: "35px" }}>
                          <Avatar
                            sx={{
                              bgcolor: colors.pinkAccent ? colors.pinkAccent[700] : "lightpink",
                              width: 24,
                              height: 24,
                            }}
                          >
                            <CakeOutlinedIcon fontSize="inherit" />
                          </Avatar>
                        </ListItemIcon>
                        <ListItemText
                          primary={e.name}
                          secondary={`Birthday on ${DateTime.fromISO(e.date).toLocaleString(DateTime.DATE_MED)}`}
                          primaryTypographyProps={{ fontSize: "0.9rem", color: colors.grey[100] }}
                          secondaryTypographyProps={{ fontSize: "0.75rem", color: colors.grey[400] }}
                        />
                      </ListItem>
                    ))}

                    {(upcomingEvents.anniversaries || []).map((e) => (
                      <ListItem key={`a-${e.id}`} sx={{ py: 0.5 }}>
                        <ListItemIcon sx={{ minWidth: "35px" }}>
                          <Avatar
                            sx={{
                              bgcolor: colors.tealAccent ? colors.tealAccent[700] : "lightteal",
                              width: 24,
                              height: 24,
                            }}
                          >
                            <CelebrationOutlinedIcon fontSize="inherit" />
                          </Avatar>
                        </ListItemIcon>
                        <ListItemText
                          primary={e.name}
                          secondary={`Anniversary (${e.years} yrs) on ${DateTime.fromISO(e.date).toLocaleString(
                            DateTime.DATE_MED
                          )}`}
                          primaryTypographyProps={{ fontSize: "0.9rem", color: colors.grey[100] }}
                          secondaryTypographyProps={{ fontSize: "0.75rem", color: colors.grey[400] }}
                        />
                      </ListItem>
                    ))}
                  </List>
                )}
              </Box>
            </Paper>
          </Grid>

          {canManageLeave && (
            <Grid item xs={12} md={6} lg={4}>
              <Paper
                sx={{
                  p: 2.5,
                  backgroundColor: colors.primary[400],
                  borderRadius: "12px",
                  height: "300px",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <Box display="flex" alignItems="center" mb={2}>
                  <PlaylistAddCheckIcon sx={{ color: colors.yellowAccent ? colors.yellowAccent[500] : "orange", mr: 1 }} />
                  <Typography variant="h6" color={colors.grey[100]} fontWeight="600">
                    Pending Actions
                  </Typography>
                </Box>

                <Divider sx={{ mb: 1, borderColor: colors.grey[700] }} />

                <Box sx={{ flexGrow: 1, overflowY: "auto" }}>
                  {loading ? (
                    <Box p={2}>
                      <Skeleton />
                      <Skeleton />
                      <Skeleton />
                    </Box>
                  ) : (hrmOverview.pending_leave_requests ?? 0) === 0 ? (
                    <Typography color={colors.grey[400]} variant="body2" textAlign="center" mt={4}>
                      No pending actions.
                    </Typography>
                  ) : (
                    <List dense sx={{ p: 0 }}>
                      {hrmOverview.pending_leave_requests > 0 && (
                        <ListItemButton onClick={() => navigate("/hrm/manage-leave")} sx={{ py: 0.5 }}>
                          <ListItemIcon sx={{ minWidth: "35px" }}>
                            <BeachAccessIcon sx={{ color: colors.grey[300] }} />
                          </ListItemIcon>
                          <ListItemText
                            primary={`${hrmOverview.pending_leave_requests} Leave Request(s)`}
                            secondary="Awaiting Approval"
                            primaryTypographyProps={{ fontSize: "0.9rem", color: colors.grey[100] }}
                            secondaryTypographyProps={{ fontSize: "0.75rem", color: colors.grey[400] }}
                          />
                          <Typography variant="caption" color="secondary">
                            Review &#8594;
                          </Typography>
                        </ListItemButton>
                      )}
                    </List>
                  )}
                </Box>
              </Paper>
            </Grid>
          )}

          <Grid item xs={12} lg={4}>
            <Paper
              sx={{
                p: 2.5,
                backgroundColor: colors.primary[400],
                borderRadius: "12px",
                height: "300px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Typography color={colors.grey[500]}>(Future Summary/Report)</Typography>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* --- Last Updated Footer --- */}
      {lastUpdated && (
        <Typography
          variant="caption"
          color={colors.grey[500]}
          sx={{ mt: 3, display: "block", textAlign: "center" }}
        >
          Last updated: {lastUpdated.toLocaleString(DateTime.DATETIME_MED_WITH_SECONDS)}
        </Typography>
      )}
    </Box>
  );
};

export default HrmDashboard;
