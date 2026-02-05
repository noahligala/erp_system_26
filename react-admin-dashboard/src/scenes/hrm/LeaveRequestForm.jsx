import { useState, useEffect } from "react";
import {
  Box,
  Button,
  TextField,
  Typography,
  useTheme,
  Grid,
  MenuItem,
  CircularProgress,
  Alert,
  Snackbar,
  Select,
  InputLabel,
  FormControl,
  Paper,
  FormHelperText,
  Divider, // Import Divider
} from "@mui/material";
import { AdapterLuxon } from "@mui/x-date-pickers/AdapterLuxon";
import { LocalizationProvider, DatePicker } from "@mui/x-date-pickers";
import { DateTime } from "luxon";
import { Formik, Field } from "formik";
import * as yup from "yup";
import { useNavigate } from "react-router-dom";
import Header from "../../components/Header";
import { tokens } from "../../theme";
import { useAuth } from "../../api/AuthProvider";
import BalanceIcon from '@mui/icons-material/AccountBalanceWalletOutlined'; // Icon for balance
import EventNoteIcon from '@mui/icons-material/EventNote'; // Icon for dates
import EditNoteIcon from '@mui/icons-material/EditNote'; // Icon for reason

const LeaveRequestForm = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const navigate = useNavigate();
  const { apiClient, isAuthenticated, user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [leaveBalance, setLeaveBalance] = useState(null);

  // --- Fetch Data (Keep as is) ---
  useEffect(() => {
    if (!isAuthenticated) {
      setError("Authentication required.");
      setDataLoading(false);
      return;
    }
    const fetchData = async () => {
       setDataLoading(true);
       setError("");
       try {
         const [typesRes, balanceRes] = await Promise.all([
           apiClient.get("/leave-types"),
           apiClient.get("/leave-balance"),
         ]);
         const typesData = typesRes.data?.data || (Array.isArray(typesRes.data) ? typesRes.data : []);
         const balanceData = balanceRes.data?.data || balanceRes.data || null;
         setLeaveTypes(typesData);
         setLeaveBalance(balanceData);
         if (!typesData.length) console.warn("No leave types loaded.");
         if (!balanceData) console.warn("Could not load leave balance.");
       } catch (err) {
         console.error("Failed to load leave data:", err);
         setError("Could not load necessary leave information.");
       } finally {
         setDataLoading(false);
       }
     };
    fetchData();
  }, [apiClient, isAuthenticated]);

  // --- Initial Values & Validation (Keep as is) ---
  const initialValues = {
    leave_type_id: "",
    start_date: null,
    end_date: null,
    reason: "",
  };
  const validationSchema = yup.object({
    leave_type_id: yup.string().required("Leave type is required"),
    start_date: yup.date().nullable().required("Start date is required").typeError("Invalid date"),
    end_date: yup.date().nullable().required("End date is required").typeError("Invalid date")
      .min(yup.ref('start_date'), "End date cannot be before start date"),
    reason: yup.string().required("Reason is required").max(500, "Max 500 chars"),
  });

  // --- Handle Submit (Keep as is) ---
 const handleFormSubmit = async (values, { setSubmitting, resetForm }) => {
    setError("");
    setSuccess("");
    setLoading(true);
    const formattedValues = {
      ...values,
      start_date: values.start_date ? DateTime.fromJSDate(values.start_date).toISODate() : null,
      end_date: values.end_date ? DateTime.fromJSDate(values.end_date).toISODate() : null,
    };
    try {
      const response = await apiClient.post("/leave-requests", formattedValues);
      if (response.data?.status === "success") {
        setSuccess("Leave request submitted successfully!");
        resetForm();
      } else {
         if (response.data?.errors) {
            const errorMessages = Object.values(response.data.errors).flat().join('. ');
            throw new Error(errorMessages || 'Validation failed.');
        }
        throw new Error(response.data?.message || "Failed to submit request.");
      }
    } catch (err) {
      console.error("Leave request submission error:", err);
      setError(err.response?.data?.message || err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
      setSubmitting(false);
    }
  };


  // --- ✨ Enhanced Leave Balance Display ---
  const renderLeaveBalance = () => {
    if (!leaveBalance) return <Typography color={colors.grey[300]}>Leave balance information not available.</Typography>;

    // Convert keys like 'annual_leave_balance' to 'Annual Leave'
    const formatLabel = (key) =>
      key.replace(/_/g, ' ').replace(' balance', '').replace(/\b\w/g, l => l.toUpperCase());

    return (
      <Grid container spacing={2}>
        {Object.entries(leaveBalance).map(([key, value]) => (
          <Grid item xs={6} sm={4} key={key}>
             <Typography variant="body2" color={colors.grey[300]}>
               {formatLabel(key)}
             </Typography>
             <Typography variant="h6" color={colors.grey[100]} fontWeight="bold">
               {value ?? 'N/A'} days
             </Typography>
          </Grid>
        ))}
      </Grid>
    );
  };

  // --- Loading State ---
  if (dataLoading) {
    return (
      <Box m="20px" display="flex" justifyContent="center" alignItems="center" height="80vh">
        <CircularProgress color="secondary" />
        <Typography ml={2}>Loading leave information...</Typography>
      </Box>
    );
  }

  // --- Main Render ---
  return (
    <LocalizationProvider dateAdapter={AdapterLuxon}>
      <Box m={{ xs: "10px", md: "20px" }}> {/* Responsive Margin */}
        <Header title="LEAVE REQUEST" subtitle="Submit a new request for time off" />

        {error && !success && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

        {/* ✨ Enhanced Balance Section */}
        <Paper
            elevation={2}
            sx={{
                p: { xs: 2, md: 3 }, // Responsive Padding
                mb: 4,
                backgroundColor: colors.primary[400],
                borderRadius: "12px",
             }}
        >
          <Box display="flex" alignItems="center" mb={2}>
            <BalanceIcon sx={{ color: colors.greenAccent[400], mr: 1 }} />
            <Typography variant="h5" color={colors.grey[100]} fontWeight="600">
              Your Leave Balance
            </Typography>
          </Box>
          <Divider sx={{ mb: 2, borderColor: colors.grey[700] }} />
          {renderLeaveBalance()}
        </Paper>

        {/* ✨ Form Wrapped in Paper */}
        <Paper
          elevation={2}
          sx={{
            p: { xs: 2, md: 3 },
            backgroundColor: colors.primary[400],
            borderRadius: "12px",
          }}
        >
          <Formik
            initialValues={initialValues}
            validationSchema={validationSchema}
            onSubmit={handleFormSubmit}
          >
            {({ values, errors, touched, handleBlur, handleChange, handleSubmit, setFieldValue, isSubmitting }) => (
              <form onSubmit={handleSubmit}>
                <Grid container spacing={3}>

                  {/* --- Leave Type Section --- */}
                  <Grid item xs={12}>
                    <Typography variant="h6" color={colors.grey[100]} sx={{ mb: 2 }}>Leave Details</Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth variant="filled" error={!!touched.leave_type_id && !!errors.leave_type_id}>
                      <InputLabel id="leave-type-label">Leave Type *</InputLabel>
                      <Select
                        labelId="leave-type-label"
                        label="Leave Type *"
                        name="leave_type_id"
                        value={values.leave_type_id}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        required
                      >
                        <MenuItem value=""><em>Select Leave Type</em></MenuItem>
                        {leaveTypes.map((type) => (
                          <MenuItem key={type.id} value={type.id}>{type.name}</MenuItem>
                        ))}
                      </Select>
                      {touched.leave_type_id && errors.leave_type_id && (
                        <FormHelperText>{errors.leave_type_id}</FormHelperText>
                      )}
                    </FormControl>
                  </Grid>

                  {/* --- Dates Section --- */}
                  <Grid item xs={12} sx={{ mt: 2 }}>
                     <Box display="flex" alignItems="center" mb={2}>
                         <EventNoteIcon sx={{ color: colors.blueAccent[300], mr: 1 }}/>
                         <Typography variant="h6" color={colors.grey[100]}>Dates</Typography>
                     </Box>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Field name="start_date">
                      {({ field, form, meta }) => (
                        <DatePicker
                          label="Start Date *"
                          value={field.value ? DateTime.fromJSDate(field.value) : null} // Use DateTime for input value
                          onChange={(date) => form.setFieldValue(field.name, date ? date.toJSDate() : null)}
                        //   inputFormat="dd/MM/yyyy" // inputFormat deprecated, use format prop
                          format="dd/MM/yyyy" // Use format instead
                          renderInput={(params) => ( // renderInput deprecated, use slotProps
                             <TextField
                                {...params}
                                fullWidth
                                variant="filled"
                                onBlur={field.onBlur}
                                error={meta.touched && !!meta.error}
                                helperText={meta.touched && meta.error}
                                required
                            />
                          )}
                           // Example using slotProps (newer MUI versions)
                           slotProps={{
                               textField: {
                                   fullWidth: true,
                                   variant: 'filled',
                                   required: true,
                                   onBlur: field.onBlur,
                                   error: meta.touched && !!meta.error,
                                   helperText: meta.touched && meta.error,
                               },
                           }}
                        />
                      )}
                    </Field>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Field name="end_date">
                      {({ field, form, meta }) => (
                        <DatePicker
                          label="End Date *"
                          value={field.value ? DateTime.fromJSDate(field.value) : null}
                          onChange={(date) => form.setFieldValue(field.name, date ? date.toJSDate() : null)}
                          format="dd/MM/yyyy"
                          minDate={values.start_date ? DateTime.fromJSDate(values.start_date) : undefined}
                           // Example using slotProps
                           slotProps={{
                               textField: {
                                   fullWidth: true,
                                   variant: 'filled',
                                   required: true,
                                   onBlur: field.onBlur,
                                   error: meta.touched && !!meta.error,
                                   helperText: meta.touched && meta.error,
                               },
                           }}
                        />
                      )}
                    </Field>
                  </Grid>

                  {/* --- Reason Section --- */}
                   <Grid item xs={12} sx={{ mt: 2 }}>
                       <Box display="flex" alignItems="center" mb={2}>
                            <EditNoteIcon sx={{ color: colors.redAccent[300], mr: 1 }}/>
                            <Typography variant="h6" color={colors.grey[100]}>Reason</Typography>
                       </Box>
                   </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      variant="filled"
                      label="Reason for Leave *"
                      name="reason"
                      multiline
                      rows={4}
                      value={values.reason}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={!!touched.reason && !!errors.reason}
                      helperText={touched.reason && errors.reason}
                      required
                      placeholder="Please provide details about your leave request..." // Added placeholder
                    />
                  </Grid>
                </Grid>

                {/* --- Submit Button --- */}
                <Box display="flex" justifyContent="flex-end" mt={4}>
                  <Button
                    type="submit"
                    color="secondary"
                    variant="contained"
                    disabled={loading || isSubmitting || dataLoading}
                    sx={{ px: 4, py: 1.2, fontWeight: 'bold' }} // Added styling
                  >
                    {loading ? <CircularProgress size={24} color="inherit" /> : "Submit Request"}
                  </Button>
                </Box>
              </form>
            )}
          </Formik>
        </Paper> {/* End Form Paper */}

        {/* --- Snackbar (Keep as is) --- */}
        <Snackbar open={!!success} autoHideDuration={4000} onClose={() => setSuccess("")} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
          <Alert onClose={() => setSuccess("")} severity="success" variant="filled" sx={{ width: '100%' }}>
            {success}
          </Alert>
        </Snackbar>
      </Box>
    </LocalizationProvider>
  );
};

export default LeaveRequestForm;