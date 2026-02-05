import React, { useState, useEffect } from "react"; // Added React import
import { useParams, Link as RouterLink, useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  useTheme,
  Grid,
  Paper,
  CircularProgress,
  Alert,
  Divider,
  Button,
  Chip,
  List, // <-- Import List components
  ListItem,
  ListItemText,
  ListItemIcon,
} from "@mui/material";
import {
  PersonOutline,
  WorkOutline,
  AccountBalanceWalletOutlined,
  ReceiptOutlined, // Statutory icon
  EditOutlined,
  ArrowBackOutlined,
  BeachAccessOutlined, // Leave Icon
  CheckCircleOutline, // <-- Icons for leave status
  HighlightOff,
  HourglassEmpty,
  EventBusyOutlined, // Cancelled icon
} from "@mui/icons-material";
import Header from "../../components/Header";
import { tokens } from "../../theme";
import { useAuth } from "../../api/AuthProvider";
import { DateTime } from "luxon"; // <-- Import Luxon

// Reusable Section Component
const ProfileSection = ({ title, icon, children }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  return (
    <Paper elevation={2} sx={{ p: 3, mb: 3, borderRadius: "12px", backgroundColor: colors.primary[400] }}>
      <Box display="flex" alignItems="center" mb={2}>
        {icon}
        <Typography variant="h6" color={colors.grey[100]} sx={{ ml: 1, fontWeight: 600 }}>{title}</Typography>
      </Box>
       {/* Ensure children passed to Grid are valid React nodes before wrapping */}
      {React.Children.count(children) > 0 ? (
           <Grid container spacing={2}>{children}</Grid>
       ) : (
           children // Render directly if not multiple items needing grid spacing (e.g., the List)
       )}
    </Paper>
  );
};


// Reusable Detail Item
const DetailItem = ({ label, value }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  return (
    <Grid item xs={12} sm={6} md={4}>
      <Typography variant="body2" color={colors.grey[300]} sx={{ mb: 0.5 }}>{label}</Typography>
      <Typography variant="body1" color={colors.grey[100]} component="span">
        {value === null || value === undefined || value === '' ? "N/A" : value}
      </Typography>
    </Grid>
  );
};

const EmployeeProfile = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const { id } = useParams();
  const { apiClient, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [employee, setEmployee] = useState(null);
  const [leaveBalance, setLeaveBalance] = useState(null);
  const [leaveHistory, setLeaveHistory] = useState([]); // State for leave history
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isAuthenticated || !id) {
      setError("Authentication required or Employee ID missing.");
      setLoading(false);
      return;
    }

    const fetchProfileData = async () => {
      setLoading(true);
      setError("");
      // Reset states on refetch
      setEmployee(null);
      setLeaveBalance(null);
      setLeaveHistory([]);

      try {
        const results = await Promise.allSettled([ // Use allSettled to handle partial failures
           apiClient.get(`/employees/${id}`),
           apiClient.get(`/employees/${id}/leave-balance`),
           apiClient.get(`/employees/${id}/leave-history`)
        ]);

        const [employeeResult, balanceResult, historyResult] = results;
        let fetchError = null; // Accumulate non-critical errors

        // Process Employee Data (Critical)
        if (employeeResult.status === 'fulfilled' && employeeResult.value.data?.status === "success") {
          setEmployee(employeeResult.value.data.data);
        } else {
            const empError = employeeResult.reason?.response?.data?.message || employeeResult.reason?.message || "Failed to fetch employee data";
            console.error("Critical Error fetching employee:", employeeResult.reason || employeeResult.value);
            setError(employeeResult.reason?.response?.status === 404 ? "Employee not found." : empError);
            setLoading(false); // Stop loading if critical fetch fails
            return; // Exit early if employee data fails
        }

        // Process Leave Balance Data (Non-critical)
        if (balanceResult.status === 'fulfilled' && balanceResult.value.data?.status === "success") {
           setLeaveBalance(balanceResult.value.data.data);
        } else {
            console.warn("Could not load leave balance:", balanceResult.reason?.response?.data?.message || balanceResult.reason?.message || balanceResult.value);
            setLeaveBalance({}); // Set to empty object on error
            fetchError = (fetchError ? fetchError + "; " : "") + "Could not load leave balance.";
        }

        // Process Leave History Data (Non-critical)
        if (historyResult.status === 'fulfilled' && historyResult.value.data?.status === "success") {
           setLeaveHistory(historyResult.value.data.data || []);
        } else {
            console.warn("Could not load leave history:", historyResult.reason?.response?.data?.message || historyResult.reason?.message || historyResult.value);
            setLeaveHistory([]);
             fetchError = (fetchError ? fetchError + "; " : "") + "Could not load leave history.";
        }

        // Set accumulated non-critical errors if any
        if(fetchError) {
            setError(prev => prev ? prev + " " + fetchError : fetchError);
        }

      } catch (err) {
        // Catch unexpected errors during Promise.allSettled itself (less likely)
        console.error("Unexpected error fetching employee profile data:", err);
        setError("An unexpected error occurred while loading profile data.");
        setEmployee(null);
        setLeaveBalance(null);
        setLeaveHistory([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [apiClient, isAuthenticated, id]); // Rerun if ID changes

  // Formatting Helper for Dates
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
        // Use Luxon for more robust parsing and formatting
       const dt = DateTime.fromISO(dateString);
       return dt.isValid ? dt.toLocaleString(DateTime.DATE_MED) : "Invalid Date";
    } catch {
      return "Format Error";
    }
  };

  // Formatting Helper for Currency
  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined ) return "N/A";
    const numericAmount = Number(amount);
    if (isNaN(numericAmount)) return "N/A";
    return `KSh ${numericAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Helper for Status Chip Color
  const getStatusChipColor = (status) => { /* ... keep as is ... */ };

   // Helper to get Leave Status Icon
  const getLeaveStatusIcon = (status) => {
     switch (status) {
       case 'pending': return <HourglassEmpty fontSize="small" sx={{ color: colors.yellowAccent ? colors.yellowAccent[500] : 'orange' }} />;
       case 'approved': return <CheckCircleOutline fontSize="small" color="success" />;
       case 'rejected': return <HighlightOff fontSize="small" color="error" />;
       case 'cancelled': return <EventBusyOutlined fontSize="small" color="action"/>;
       default: return null;
     }
  };

  // Loading State UI
  if (loading) { /* ... keep as is ... */ }

  // Error State UI (Only block if employee failed to load)
   if (error && !employee && !loading) {
     return (
       <Box m="20px">
         <Header title="ERROR" subtitle="Could not load profile" />
         <Alert severity="error">{error}</Alert>
          <Button startIcon={<ArrowBackOutlined />} sx={{ mt: 2 }} onClick={() => navigate('/team')} color="secondary" variant="outlined">
            Back to Team List
          </Button>
       </Box>
     );
   }

   // No Employee Found UI (Should be caught by error state now if fetch failed)
   if (!employee && !loading) {
      return (
        <Box m="20px">
          <Header title="EMPLOYEE PROFILE" subtitle="Employee not found" />
          <Alert severity="warning">No employee data available or employee not found.</Alert>
           <Button startIcon={<ArrowBackOutlined />} sx={{ mt: 2 }} onClick={() => navigate('/team')} color="secondary" variant="outlined">
            Back to Team List
           </Button>
        </Box>
      );
   }

  // Helper to Render Leave Balance Details
  const renderLeaveBalanceDetails = () => {
     if (leaveBalance === null && loading) { // Show loading specifically for balance
        return <DetailItem label="Balance" value={<CircularProgress size={20}/>} />;
     }
     if (leaveBalance === null || typeof leaveBalance !== 'object' || Object.keys(leaveBalance).length === 0) {
         return <DetailItem label="Balance" value="Unavailable or No Data" />;
     }

     const formatLabel = (key) => key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

     return Object.entries(leaveBalance).map(([key, value]) => (
        <DetailItem
            key={key}
            label={`${formatLabel(key)}`} // Removed 'Balance' suffix as it's in the section title
            value={`${Number(value).toFixed(1) ?? 'N/A'} days`} // Format to 1 decimal place
        />
     ));
  };

  // Main Profile Display
  return (
    <Box m={{ xs: "10px", md: "20px" }}>
       {/* Show non-critical errors (like balance/history failing) as Alerts */}
       {error && employee && (
            <Alert severity="warning" sx={{ mb: 2 }}>
                {error}
            </Alert>
       )}

      {/* Header and Buttons */}
      <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1} mb={3}>
        <Header title="EMPLOYEE PROFILE" subtitle={`Details for ${employee?.full_name || '...'}`} />
        <Box display="flex" gap={1}>
           <Button startIcon={<ArrowBackOutlined />} onClick={() => navigate('/team')} color="secondary" variant="outlined">
            Back to List
           </Button>
           <Button component={RouterLink} to={`/hrm/edit-employee/${id}`} startIcon={<EditOutlined />} color="secondary" variant="contained">
            Edit Employee
           </Button>
        </Box>
      </Box>

      {/* Profile Sections */}
      {employee && ( // Render sections only if employee data is loaded
         <>
            <ProfileSection title="Personal Information" icon={<PersonOutline sx={{ color: colors.greenAccent[400] }} />}>
                <DetailItem label="Full Name" value={employee.full_name} />
                <DetailItem label="Email Address" value={employee.email} />
                <DetailItem label="Phone Number" value={employee.phone_number} />
                <DetailItem label="National ID" value={employee.national_id} />
            </ProfileSection>

            <ProfileSection title="Employment Details" icon={<WorkOutline sx={{ color: colors.blueAccent[400] }} />}>
                <DetailItem label="Department" value={employee.department} />
                <DetailItem label="Job Title" value={employee.job_title} />
                <DetailItem label="Employee Status" value={
                    <Chip label={employee.status || 'N/A'} color={getStatusChipColor(employee.status)} size="small" sx={{ textTransform: 'capitalize' }} />
                }/>
                <DetailItem label="Hire Date" value={formatDate(employee.hired_on)} />
                <DetailItem label="Salary" value={formatCurrency(employee.salary)} />
                <DetailItem label="Company Role" value={employee.accessLevel || 'N/A'} />
            </ProfileSection>

            {/* Leave Information Section */}
            <ProfileSection title="Leave Information" icon={<BeachAccessOutlined sx={{ color: colors.yellowAccent ? colors.yellowAccent[400] : '#FFC107' }} />}>
                {/* Balance */}
                {renderLeaveBalanceDetails()}

                {/* History */}
                {(leaveHistory && leaveHistory.length > 0) && (
                    <>
                        <Grid item xs={12} sx={{ mt: 2, mb: 1 }}>
                            <Divider sx={{ borderColor: colors.grey[700] }}/>
                            <Typography variant="subtitle1" color={colors.grey[200]} sx={{ mt: 2 }}> {/* Changed to subtitle1 */}
                                Recent Leave Requests (Last 10)
                            </Typography>
                        </Grid>
                        <Grid item xs={12}>
                           {/* Use Box instead of Grid container for the List */}
                           <Box sx={{ width: '100%' }}>
                                <List dense disablePadding>
                                    {leaveHistory.map((req) => (
                                        <ListItem key={req.id} disableGutters sx={{ py: 0.5, borderBottom: `1px dashed ${colors.grey[700]}` }}>
                                            <ListItemIcon sx={{ minWidth: '30px' }}>
                                                {getLeaveStatusIcon(req.status)}
                                            </ListItemIcon>
                                            <ListItemText
                                                primary={
                                                    <Typography variant="body2" component="span" sx={{ fontWeight: 500 }}>
                                                        {req.leave_type?.name || 'Unknown Type'}
                                                        {' ('}{req.requested_days || '?'} days): {formatDate(req.start_date)} - {formatDate(req.end_date)}
                                                    </Typography>
                                                }
                                                secondary={
                                                    <Typography variant="caption" color={colors.grey[400]} component="span">
                                                        Requested: {DateTime.fromISO(req.created_at).toLocaleString(DateTime.DATETIME_SHORT)} | Status: {req.status}
                                                    </Typography>
                                                    }
                                            />
                                        </ListItem>
                                    ))}
                                </List>
                            </Box>
                        </Grid>
                    </>
                )}
                 {(!leaveHistory || leaveHistory.length === 0) && !loading && ( // Show message if history is empty and not loading
                    <Grid item xs={12} sx={{ mt: 2 }}>
                        <Typography variant="body2" color={colors.grey[300]}>No recent leave requests found.</Typography>
                    </Grid>
                 )}
            </ProfileSection>


            <ProfileSection title="Statutory Information" icon={<ReceiptOutlined sx={{ color: colors.redAccent[400] }} />}>
                <DetailItem label="KRA Pin" value={employee.kra_pin} />
                <DetailItem label="NSSF Number" value={employee.nssf_number} />
                <DetailItem label="NHIF Number" value={employee.nhif_number} />
            </ProfileSection>

            <ProfileSection title="Bank Details" icon={<AccountBalanceWalletOutlined sx={{ color: colors.purpleAccent[400] }} />}>
                <DetailItem label="Bank Name" value={employee.bank_name} />
                <DetailItem label="Bank Branch" value={employee.bank_branch} />
                <DetailItem label="Account Number" value={employee.bank_account} />
            </ProfileSection>
         </>
        )}
    </Box>
  );
};

export default EmployeeProfile;