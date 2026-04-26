import { useState, useEffect, useCallback, useMemo } from "react";
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
  Divider,
  Stack,
  Fade,
  Grow,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { AdapterLuxon } from "@mui/x-date-pickers/AdapterLuxon";
import { LocalizationProvider, DatePicker } from "@mui/x-date-pickers";
import { DateTime } from "luxon";
import { Formik, Field } from "formik";
import * as yup from "yup";
import { useNavigate } from "react-router-dom";

// Icons
import BalanceIcon from '@mui/icons-material/AccountBalanceWalletOutlined'; 
import EventNoteIcon from '@mui/icons-material/EventNoteOutlined'; 
import EditNoteIcon from '@mui/icons-material/EditNoteOutlined'; 
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

import Header from "../../components/Header";
import { tokens } from "../../theme";
import { useAuth } from "../../api/AuthProvider";

const appleFont = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', sans-serif";

const LeaveRequestForm = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const isDark = theme.palette.mode === "dark";
  const navigate = useNavigate();
  const { apiClient, isAuthenticated } = useAuth();

  // ==========================================
  // 🛡️ CRASH-PROOF COLOR ENGINE
  // ==========================================
  const getColor = useCallback((colorPath, fallback = "#888888") => {
    try {
      const parts = colorPath.split('.');
      let value = colors;
      for (const part of parts) {
        if (!value || typeof value !== 'object') return fallback;
        value = value[part];
      }
      return value || fallback;
    } catch (error) {
      return fallback;
    }
  }, [colors]);

  const safeColors = useMemo(() => ({
    primary: { main: getColor('primary[500]', '#1976d2') },
    greenAccent: { main: getColor('greenAccent[500]', '#4caf50') },
    redAccent: { main: getColor('redAccent[500]', '#f44336') },
    blueAccent: { main: getColor('blueAccent[500]', '#2196f3') },
    orangeAccent: { main: getColor('orangeAccent[500]', '#ff9800') },
    grey: {
      50: getColor('grey[50]', '#fafafa'),
      100: getColor('grey[100]', '#f5f5f5'),
      200: getColor('grey[200]', '#eeeeee'),
      300: getColor('grey[300]', '#e0e0e0'),
      400: getColor('grey[400]', '#bdbdbd'),
      500: getColor('grey[500]', '#9e9e9e'),
      600: getColor('grey[600]', '#757575'),
      700: getColor('grey[700]', '#616161'),
      800: getColor('grey[800]', '#424242'),
      900: getColor('grey[900]', '#212121'),
    }
  }), [getColor]);

  // State Management
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [leaveBalance, setLeaveBalance] = useState(null);

  // ==========================================
  // DATA FETCHING
  // ==========================================
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
       } catch (err) {
         console.error("Failed to load leave data:", err);
         setError("Could not load necessary leave information from the server.");
       } finally {
         setDataLoading(false);
       }
     };
    fetchData();
  }, [apiClient, isAuthenticated]);

  // ==========================================
  // FORMIK CONFIGURATION
  // ==========================================
  const initialValues = {
    leave_type_id: "",
    start_date: null,
    end_date: null,
    reason: "",
  };

  const validationSchema = yup.object({
    leave_type_id: yup.string().required("Please select a leave type"),
    start_date: yup.date().nullable().required("Start date is required").typeError("Invalid date format"),
    end_date: yup.date().nullable().required("End date is required").typeError("Invalid date format")
      .min(yup.ref('start_date'), "End date cannot be earlier than start date"),
    reason: yup.string().required("Please provide a reason").max(500, "Reason must be under 500 characters"),
  });

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
        setSuccess("Your leave request has been submitted successfully!");
        resetForm();
      } else {
         if (response.data?.errors) {
            const errorMessages = Object.values(response.data.errors).flat().join('. ');
            throw new Error(errorMessages || 'Validation failed.');
        }
        throw new Error(response.data?.message || "Failed to submit request.");
      }
    } catch (err) {
      console.error("Submission error:", err);
      setError(err.response?.data?.message || err.message || "An unexpected error occurred during submission.");
    } finally {
      setLoading(false);
      setSubmitting(false);
    }
  };

  // ==========================================
  // STYLES & RENDER HELPERS
  // ==========================================
  const cardSx = {
    borderRadius: "24px",
    p: { xs: 2.5, md: 4 },
    backgroundColor: isDark ? alpha(safeColors.primary.main, 0.5) : '#ffffff',
    border: `1px solid ${isDark ? alpha(safeColors.grey[700], 0.4) : alpha(safeColors.grey[300], 0.5)}`,
    boxShadow: isDark ? '0 20px 40px rgba(0,0,0,0.2)' : '0 10px 30px rgba(0,0,0,0.03)',
  };

  const inputSx = {
    "& .MuiOutlinedInput-root": {
      borderRadius: "14px",
      backgroundColor: isDark ? alpha(safeColors.primary.main, 0.4) : alpha(safeColors.grey[50], 0.8),
      "& fieldset": { borderColor: alpha(safeColors.grey[500], 0.3) },
      "&:hover fieldset": { borderColor: safeColors.blueAccent.main },
      "&.Mui-focused fieldset": { borderColor: safeColors.blueAccent.main, borderWidth: '2px' },
    },
    "& .MuiInputLabel-root": { fontFamily: appleFont }
  };

  const renderLeaveBalance = () => {
    if (!leaveBalance) return (
      <Alert severity="info" icon={<InfoOutlinedIcon />} sx={{ borderRadius: '12px', backgroundColor: alpha(safeColors.blueAccent.main, 0.1) }}>
        Leave balance information is currently unavailable.
      </Alert>
    );

    const formatLabel = (key) => key.replace(/_/g, ' ').replace(' balance', '').replace(/\b\w/g, l => l.toUpperCase());

    return (
      <Box display="grid" gridTemplateColumns={{ xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(4, 1fr)" }} gap="16px">
        {Object.entries(leaveBalance).map(([key, value], i) => (
          <Grow in={true} timeout={400 + (i * 150)} key={key}>
            <Box 
              sx={{ 
                p: 2, 
                borderRadius: '16px', 
                backgroundColor: alpha(safeColors.primary.main, 0.3),
                border: `1px solid ${alpha(safeColors.grey[500], 0.1)}`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start'
              }}
            >
               <Typography variant="caption" color={safeColors.grey[400]} fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                 {formatLabel(key)}
               </Typography>
               <Typography variant="h4" color={safeColors.grey[100]} fontWeight="800" sx={{ mt: 0.5 }}>
                 {value ?? '—'} <Typography component="span" variant="body2" color={safeColors.grey[500]} fontWeight={600}>days</Typography>
               </Typography>
            </Box>
          </Grow>
        ))}
      </Box>
    );
  };

  if (dataLoading) {
    return (
      <Box m="20px" display="flex" justifyContent="center" alignItems="center" flexDirection="column" height="80vh" gap={2}>
        <CircularProgress color="secondary" />
        <Typography color={safeColors.grey[200]} fontWeight={600} sx={{ fontFamily: appleFont }}>Fetching your entitlements...</Typography>
      </Box>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterLuxon}>
      <Box m={{ xs: "12px", md: "20px" }} sx={{ '& *': { fontFamily: appleFont } }}>
        <Header title="REQUEST LEAVE" subtitle="Submit a formal request for time off" />

        {error && !success && (
          <Grow in={true}><Alert severity="error" icon={<ErrorOutlineIcon />} sx={{ mb: 3, borderRadius: '14px' }}>{error}</Alert></Grow>
        )}

        {/* ===== LEAVE BALANCE ===== */}
        <Fade in={true} timeout={600}>
          <Paper elevation={0} sx={{ ...cardSx, mb: 4 }}>
            <Stack direction="row" alignItems="center" mb={3} spacing={1.5}>
              <Box sx={{ p: 1.2, borderRadius: '12px', backgroundColor: alpha(safeColors.blueAccent.main, 0.1), color: safeColors.blueAccent.main, display: 'flex' }}>
                <BalanceIcon />
              </Box>
              <Box>
                <Typography variant="h5" color={safeColors.grey[100]} fontWeight="800">Your Leave Entitlements</Typography>
                <Typography variant="body2" color={safeColors.grey[400]}>Available days for the current fiscal year</Typography>
              </Box>
            </Stack>
            <Divider sx={{ mb: 3, borderColor: alpha(safeColors.grey[500], 0.15) }} />
            {renderLeaveBalance()}
          </Paper>
        </Fade>

        {/* ===== LEAVE FORM ===== */}
        <Fade in={true} timeout={800}>
          <Paper elevation={0} sx={cardSx}>
            <Formik initialValues={initialValues} validationSchema={validationSchema} onSubmit={handleFormSubmit}>
              {({ values, errors, touched, handleBlur, handleChange, handleSubmit, isSubmitting }) => (
                <form onSubmit={handleSubmit}>
                  <Grid container spacing={3}>

                    {/* Type Section */}
                    <Grid item xs={12}>
                      <Stack direction="row" alignItems="center" spacing={1.5} mb={1}>
                        <FlightTakeoffIcon sx={{ color: safeColors.orangeAccent.main }}/>
                        <Typography variant="h6" color={safeColors.grey[100]} fontWeight="700">Leave Configuration</Typography>
                      </Stack>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth variant="outlined" error={!!touched.leave_type_id && !!errors.leave_type_id} sx={inputSx}>
                        <InputLabel id="leave-type-label">Select Leave Type</InputLabel>
                        <Select
                          labelId="leave-type-label"
                          label="Select Leave Type"
                          name="leave_type_id"
                          value={values.leave_type_id}
                          onChange={handleChange}
                          onBlur={handleBlur}
                        >
                          <MenuItem value="" disabled><em>Select Leave Type</em></MenuItem>
                          {leaveTypes.map((type) => (
                            <MenuItem key={type.id} value={type.id}>{type.name}</MenuItem>
                          ))}
                        </Select>
                        {touched.leave_type_id && errors.leave_type_id && <FormHelperText>{errors.leave_type_id}</FormHelperText>}
                      </FormControl>
                    </Grid>

                    {/* Dates Section */}
                    <Grid item xs={12} sx={{ mt: 2 }}>
                       <Stack direction="row" alignItems="center" spacing={1.5} mb={1}>
                           <EventNoteIcon sx={{ color: safeColors.greenAccent.main }}/>
                           <Typography variant="h6" color={safeColors.grey[100]} fontWeight="700">Duration</Typography>
                       </Stack>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Field name="start_date">
                        {({ field, form, meta }) => (
                          <DatePicker
                            label="Start Date"
                            value={field.value ? DateTime.fromJSDate(field.value) : null}
                            onChange={(date) => form.setFieldValue(field.name, date ? date.toJSDate() : null)}
                            format="dd MMM yyyy"
                            slotProps={{
                              textField: {
                                fullWidth: true,
                                onBlur: field.onBlur,
                                error: meta.touched && !!meta.error,
                                helperText: meta.touched && meta.error,
                                sx: inputSx
                              }
                            }}
                          />
                        )}
                      </Field>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Field name="end_date">
                        {({ field, form, meta }) => (
                          <DatePicker
                            label="End Date"
                            value={field.value ? DateTime.fromJSDate(field.value) : null}
                            onChange={(date) => form.setFieldValue(field.name, date ? date.toJSDate() : null)}
                            format="dd MMM yyyy"
                            minDate={values.start_date ? DateTime.fromJSDate(values.start_date) : undefined}
                            slotProps={{
                              textField: {
                                fullWidth: true,
                                onBlur: field.onBlur,
                                error: meta.touched && !!meta.error,
                                helperText: meta.touched && meta.error,
                                sx: inputSx
                              }
                            }}
                          />
                        )}
                      </Field>
                    </Grid>

                    {/* Reason Section */}
                    <Grid item xs={12} sx={{ mt: 2 }}>
                       <Stack direction="row" alignItems="center" spacing={1.5} mb={1}>
                            <EditNoteIcon sx={{ color: safeColors.redAccent.main }}/>
                            <Typography variant="h6" color={safeColors.grey[100]} fontWeight="700">Justification</Typography>
                       </Stack>
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        variant="outlined"
                        label="Reason for Leave"
                        name="reason"
                        multiline
                        rows={4}
                        value={values.reason}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={!!touched.reason && !!errors.reason}
                        helperText={touched.reason && errors.reason}
                        placeholder="Please provide additional details regarding your request..."
                        sx={inputSx}
                      />
                    </Grid>
                  </Grid>

                  <Divider sx={{ mt: 4, mb: 3, borderColor: alpha(safeColors.grey[500], 0.15) }} />

                  {/* Submit Button */}
                  <Box display="flex" justifyContent="flex-end">
                    <Button
                      type="submit"
                      variant="contained"
                      disabled={loading || isSubmitting || dataLoading}
                      startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <CheckCircleOutlineIcon />}
                      sx={{ 
                        px: 4, 
                        py: 1.5, 
                        fontWeight: 800, 
                        borderRadius: '12px',
                        backgroundColor: safeColors.blueAccent.main,
                        boxShadow: `0 8px 16px ${alpha(safeColors.blueAccent.main, 0.2)}`,
                        '&:hover': {
                          backgroundColor: safeColors.blueAccent.dark,
                          boxShadow: `0 12px 20px ${alpha(safeColors.blueAccent.main, 0.3)}`,
                          transform: 'translateY(-2px)'
                        },
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {loading ? "Processing..." : "Submit Application"}
                    </Button>
                  </Box>
                </form>
              )}
            </Formik>
          </Paper>
        </Fade>

        {/* ===== SUCCESS SNACKBAR ===== */}
        <Snackbar open={!!success} autoHideDuration={5000} onClose={() => setSuccess("")} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
          <Alert onClose={() => setSuccess("")} severity="success" variant="filled" sx={{ width: '100%', borderRadius: '12px', fontWeight: 600 }}>
            {success}
          </Alert>
        </Snackbar>
      </Box>
    </LocalizationProvider>
  );
};

export default LeaveRequestForm;