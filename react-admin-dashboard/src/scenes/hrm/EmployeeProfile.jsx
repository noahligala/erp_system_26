import React, { useState, useEffect, useCallback } from "react";
import { useParams, Link as RouterLink, useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  useTheme,
  Paper,
  CircularProgress,
  Alert,
  Divider,
  Button,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Stack,
} from "@mui/material";
import {
  PersonOutline,
  WorkOutline,
  AccountBalanceWalletOutlined,
  ReceiptOutlined,
  EditOutlined,
  ArrowBackOutlined,
  BeachAccessOutlined,
  CheckCircleOutline,
  HighlightOff,
  HourglassEmpty,
  EventBusyOutlined,
} from "@mui/icons-material";
import Header from "../../components/Header";
import { useAuth } from "../../api/AuthProvider";
import { DateTime } from "luxon";

const formatDate = (dateString) => {
  if (!dateString) return "N/A";

  const dt = DateTime.fromISO(dateString);

  return dt.isValid ? dt.toLocaleString(DateTime.DATE_MED) : "Invalid Date";
};

const formatDateTime = (dateString) => {
  if (!dateString) return "N/A";

  const dt = DateTime.fromISO(dateString);

  return dt.isValid ? dt.toLocaleString(DateTime.DATETIME_SHORT) : "Invalid Date";
};

const formatCurrency = (amount) => {
  if (amount === null || amount === undefined || amount === "") return "N/A";

  const numericAmount = Number(amount);

  if (!Number.isFinite(numericAmount)) return "N/A";

  return `KSh ${numericAmount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const formatEmpty = (value) => {
  if (value === null || value === undefined || value === "") return "N/A";
  return value;
};

const formatLeaveLabel = (key) =>
  key.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

const DetailItem = ({ label, value }) => {
  const theme = useTheme();
  const styles = theme.employeeProfile;

  return (
    <Box sx={styles.detailItem}>
      <Typography sx={styles.detailLabel}>{label}</Typography>
      <Typography component="div" sx={styles.detailValue}>
        {formatEmpty(value)}
      </Typography>
    </Box>
  );
};

const ProfileSection = ({ title, icon, color, children }) => {
  const theme = useTheme();
  const styles = theme.employeeProfile;

  return (
    <Paper elevation={0} sx={styles.sectionCard}>
      <Box sx={styles.sectionHeader}>
        <Box sx={styles.sectionIcon(color)}>{icon}</Box>
        <Typography sx={styles.sectionTitle}>{title}</Typography>
      </Box>

      <Box sx={styles.detailGrid}>{children}</Box>
    </Paper>
  );
};

const EmployeeProfile = () => {
  const theme = useTheme();
  const styles = theme.employeeProfile;
  const { id } = useParams();
  const { apiClient, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [employee, setEmployee] = useState(null);
  const [leaveBalance, setLeaveBalance] = useState(null);
  const [leaveHistory, setLeaveHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchProfileData = useCallback(async () => {
    if (!isAuthenticated || !id) {
      setError("Authentication required or employee ID missing.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    setEmployee(null);
    setLeaveBalance(null);
    setLeaveHistory([]);

    try {
      const results = await Promise.allSettled([
        apiClient.get(`/employees/${id}`),
        apiClient.get(`/employees/${id}/leave-balance`),
        apiClient.get(`/employees/${id}/leave-history`),
      ]);

      const [employeeResult, balanceResult, historyResult] = results;

      let nonCriticalError = "";

      if (
        employeeResult.status === "fulfilled" &&
        employeeResult.value.data?.status === "success"
      ) {
        setEmployee(employeeResult.value.data.data);
      } else {
        const message =
          employeeResult.reason?.response?.data?.message ||
          employeeResult.reason?.message ||
          "Failed to fetch employee data.";

        setError(
          employeeResult.reason?.response?.status === 404
            ? "Employee not found."
            : message
        );
        setLoading(false);
        return;
      }

      if (
        balanceResult.status === "fulfilled" &&
        balanceResult.value.data?.status === "success"
      ) {
        setLeaveBalance(balanceResult.value.data.data);
      } else {
        setLeaveBalance({});
        nonCriticalError = "Could not load leave balance.";
      }

      if (
        historyResult.status === "fulfilled" &&
        historyResult.value.data?.status === "success"
      ) {
        setLeaveHistory(historyResult.value.data.data || []);
      } else {
        setLeaveHistory([]);
        nonCriticalError = nonCriticalError
          ? `${nonCriticalError} Could not load leave history.`
          : "Could not load leave history.";
      }

      if (nonCriticalError) {
        setError(nonCriticalError);
      }
    } catch (err) {
      console.error("Unexpected error fetching employee profile data:", err);
      setError("An unexpected error occurred while loading profile data.");
      setEmployee(null);
      setLeaveBalance(null);
      setLeaveHistory([]);
    } finally {
      setLoading(false);
    }
  }, [apiClient, id, isAuthenticated]);

  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);

  const getLeaveStatusIcon = (status) => {
    switch (String(status || "").toLowerCase()) {
      case "pending":
        return (
          <HourglassEmpty
            fontSize="small"
            sx={{ color: theme.palette.warning.main }}
          />
        );
      case "approved":
        return (
          <CheckCircleOutline
            fontSize="small"
            sx={{ color: theme.palette.success.main }}
          />
        );
      case "rejected":
        return (
          <HighlightOff
            fontSize="small"
            sx={{ color: theme.palette.error.main }}
          />
        );
      case "cancelled":
        return (
          <EventBusyOutlined
            fontSize="small"
            sx={{ color: theme.palette.text.secondary }}
          />
        );
      default:
        return (
          <HourglassEmpty
            fontSize="small"
            sx={{ color: theme.palette.text.secondary }}
          />
        );
    }
  };

  const renderLeaveBalanceDetails = () => {
    if (
      leaveBalance === null ||
      typeof leaveBalance !== "object" ||
      Object.keys(leaveBalance).length === 0
    ) {
      return <DetailItem label="Balance" value="Unavailable or no data" />;
    }

    return Object.entries(leaveBalance).map(([key, value]) => {
      const number = Number(value);

      return (
        <DetailItem
          key={key}
          label={formatLeaveLabel(key)}
          value={
            Number.isFinite(number) ? `${number.toFixed(1)} days` : "N/A"
          }
        />
      );
    });
  };

  if (loading) {
    return (
      <Box sx={styles.shell}>
        <Paper elevation={0} sx={styles.loadingCard}>
          <CircularProgress size={26} />
          <Typography
            sx={{
              mt: 1.5,
              color: "text.secondary",
              fontSize: "0.78rem",
            }}
          >
            Loading employee profile...
          </Typography>
        </Paper>
      </Box>
    );
  }

  if (error && !employee) {
    return (
      <Box sx={styles.shell}>
        <Paper elevation={0} sx={styles.headerCard}>
          <Header title="ERROR" subtitle="Could not load profile" />
        </Paper>

        <Alert severity="error" sx={styles.alert}>
          {error}
        </Alert>

        <Button
          startIcon={<ArrowBackOutlined />}
          onClick={() => navigate("/team")}
          variant="outlined"
          sx={styles.secondaryButton}
        >
          Back to Team List
        </Button>
      </Box>
    );
  }

  if (!employee) {
    return (
      <Box sx={styles.shell}>
        <Paper elevation={0} sx={styles.headerCard}>
          <Header title="EMPLOYEE PROFILE" subtitle="Employee not found" />
        </Paper>

        <Alert severity="warning" sx={styles.alert}>
          No employee data available or employee not found.
        </Alert>

        <Button
          startIcon={<ArrowBackOutlined />}
          onClick={() => navigate("/team")}
          variant="outlined"
          sx={styles.secondaryButton}
        >
          Back to Team List
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={styles.shell}>
      {error && (
        <Alert severity="warning" sx={styles.alert}>
          {error}
        </Alert>
      )}

      <Paper elevation={0} sx={styles.headerCard}>
        <Box sx={styles.headerRow}>
          <Header
            title="EMPLOYEE PROFILE"
            subtitle={`Details for ${employee.full_name || "employee"}`}
          />

          <Box sx={styles.actionStack}>
            <Button
              startIcon={<ArrowBackOutlined />}
              onClick={() => navigate("/team")}
              variant="outlined"
              sx={styles.secondaryButton}
            >
              Back to List
            </Button>

            <Button
              component={RouterLink}
              to={`/hrm/edit-employee/${id}`}
              startIcon={<EditOutlined />}
              variant="contained"
              sx={styles.primaryButton}
            >
              Edit Employee
            </Button>
          </Box>
        </Box>
      </Paper>

      <ProfileSection
        title="Personal Information"
        icon={<PersonOutline />}
        color={theme.palette.success.main}
      >
        <DetailItem label="Full Name" value={employee.full_name} />
        <DetailItem label="Email Address" value={employee.email} />
        <DetailItem label="Phone Number" value={employee.phone_number} />
        <DetailItem label="National ID" value={employee.national_id} />
      </ProfileSection>

      <ProfileSection
        title="Employment Details"
        icon={<WorkOutline />}
        color={theme.palette.info.main}
      >
        <DetailItem label="Department" value={employee.department} />
        <DetailItem label="Job Title" value={employee.job_title} />

        <DetailItem
          label="Employee Status"
          value={
            <Chip
              label={employee.status || "N/A"}
              size="small"
              sx={styles.statusChip(employee.status)}
            />
          }
        />

        <DetailItem label="Hire Date" value={formatDate(employee.hired_on)} />
        <DetailItem label="Salary" value={formatCurrency(employee.salary)} />
        <DetailItem label="Company Role" value={employee.accessLevel || "N/A"} />
      </ProfileSection>

      <ProfileSection
        title="Leave Information"
        icon={<BeachAccessOutlined />}
        color={theme.palette.warning.main}
      >
        {renderLeaveBalanceDetails()}

        {leaveHistory?.length > 0 && (
          <>
            <Box sx={styles.leaveDividerBlock}>
              <Divider />
              <Typography sx={styles.leaveSubTitle}>
                Recent Leave Requests
              </Typography>
            </Box>

            <Box sx={styles.leaveListWrap}>
              <List dense disablePadding>
                {leaveHistory.slice(0, 10).map((request) => (
                  <ListItem key={request.id} disableGutters sx={styles.leaveListItem}>
                    <ListItemIcon sx={styles.leaveStatusIconWrap}>
                      {getLeaveStatusIcon(request.status)}
                    </ListItemIcon>

                    <ListItemText
                      primary={
                        <Typography sx={styles.leavePrimary}>
                          {request.leave_type?.name || "Unknown Type"} (
                          {request.requested_days || "?"} days):{" "}
                          {formatDate(request.start_date)} -{" "}
                          {formatDate(request.end_date)}
                        </Typography>
                      }
                      secondary={
                        <Typography sx={styles.leaveSecondary}>
                          Requested: {formatDateTime(request.created_at)} |
                          Status: {request.status || "N/A"}
                        </Typography>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          </>
        )}

        {(!leaveHistory || leaveHistory.length === 0) && (
          <Typography sx={styles.emptyText}>
            No recent leave requests found.
          </Typography>
        )}
      </ProfileSection>

      <ProfileSection
        title="Statutory Information"
        icon={<ReceiptOutlined />}
        color={theme.palette.error.main}
      >
        <DetailItem label="KRA Pin" value={employee.kra_pin} />
        <DetailItem label="NSSF Number" value={employee.nssf_number} />
        <DetailItem label="NHIF Number" value={employee.nhif_number} />
      </ProfileSection>

      <ProfileSection
        title="Bank Details"
        icon={<AccountBalanceWalletOutlined />}
        color={theme.palette.primary.main}
      >
        <DetailItem label="Bank Name" value={employee.bank_name} />
        <DetailItem label="Bank Branch" value={employee.bank_branch} />
        <DetailItem label="Account Number" value={employee.bank_account} />
      </ProfileSection>
    </Box>
  );
};

export default EmployeeProfile;