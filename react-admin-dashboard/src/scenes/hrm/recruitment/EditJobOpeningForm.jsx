import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
  IconButton,
  Tooltip,
} from "@mui/material";
import { AdapterLuxon } from "@mui/x-date-pickers/AdapterLuxon";
import { LocalizationProvider, DatePicker } from "@mui/x-date-pickers";
import { DateTime } from "luxon";
import { Formik, Field } from "formik";
import * as yup from "yup";
import Header from "../../../components/Header";
import { tokens } from "../../../theme";
import { useAuth } from "../../../api/AuthProvider";
import ArrowBackOutlinedIcon from "@mui/icons-material/ArrowBackOutlined";

const EditJobOpeningForm = ({ isEdit = false }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const navigate = useNavigate();
  const { id } = useParams(); // For edit mode
  const { apiClient, isAuthenticated } = useAuth();

  const [loading, setLoading] = useState(false); // Form submission loading
  const [dataLoading, setDataLoading] = useState(isEdit); // Only load data if editing
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [departments, setDepartments] = useState([]);
  const [jobTitles, setJobTitles] = useState([]);

  // Initial values state
  const [initialValues, setInitialValues] = useState({
    title: "",
    description: "",
    department_id: "",
    job_title_id: "",
    status: isEdit ? "" : "draft", // Default to draft for new, load for edit
    positions_to_fill: 1,
    posted_date: null,
    closing_date: null,
  });

  // Fetch dropdowns and existing opening data if editing
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
        // Fetch dropdowns always
        const [deptRes, titleRes] = await Promise.all([
          apiClient.get("/departments"),
          apiClient.get("/job-titles"),
        ]);

        const extractData = (res) => res.data?.data || (Array.isArray(res.data) ? res.data : []);
        setDepartments(extractData(deptRes));
        setJobTitles(extractData(titleRes));

        // Fetch existing opening only if in edit mode
        if (isEdit && id) {
          const openingRes = await apiClient.get(`/job-openings/${id}`);
          if (openingRes.data?.status === "success" && openingRes.data.data) {
            const data = openingRes.data.data;
            setInitialValues({
              title: data.title || "",
              description: data.description || "",
              department_id: data.department_id || "",
              job_title_id: data.job_title_id || "",
              status: data.status || "draft",
              positions_to_fill: data.positions_to_fill || 1,
              // Convert date strings to JS Date objects for DatePicker
              posted_date: data.posted_date ? DateTime.fromISO(data.posted_date).toJSDate() : null,
              closing_date: data.closing_date ? DateTime.fromISO(data.closing_date).toJSDate() : null,
            });
          } else {
            throw new Error(openingRes.data?.message || "Failed to fetch job opening details");
          }
        }
      } catch (err) {
        console.error("Failed to load form data:", err);
        setError("Could not load necessary data. " + (err.response?.data?.message || err.message));
        if (isEdit) navigate("/recruitment/openings"); // Redirect if editing fails
      } finally {
        setDataLoading(false);
      }
    };

    fetchData();
  }, [apiClient, isAuthenticated, id, isEdit, navigate]);

  // Validation Schema
  const validationSchema = yup.object({
    title: yup.string().required("Job title is required").max(255),
    description: yup.string().nullable(),
    department_id: yup.string().nullable(), // Make optional or required based on rules
    job_title_id: yup.string().nullable(), // Make optional or required based on rules
    status: yup.string().required("Status is required").oneOf(['draft', 'open', 'closed', 'on_hold']),
    positions_to_fill: yup.number().nullable().integer("Must be a whole number").min(1, "Must fill at least 1 position").typeError("Must be a number"),
    posted_date: yup.date().nullable().typeError("Invalid date"),
    closing_date: yup.date().nullable().typeError("Invalid date")
        .min(yup.ref('posted_date'), "Closing date cannot be before posted date"),
  });

  // Form Submission
  const handleFormSubmit = async (values, { setSubmitting, resetForm }) => {
    setError("");
    setSuccess("");
    setLoading(true);

    const formattedValues = {
      ...values,
      // Format dates back to YYYY-MM-DD
      posted_date: values.posted_date ? DateTime.fromJSDate(values.posted_date).toISODate() : null,
      closing_date: values.closing_date ? DateTime.fromJSDate(values.closing_date).toISODate() : null,
      // Ensure positions_to_fill is a number or null
      positions_to_fill: values.positions_to_fill ? Number(values.positions_to_fill) : null,
      // Ensure IDs are null if empty string
      department_id: values.department_id || null,
      job_title_id: values.job_title_id || null,
    };

    try {
      let response;
      if (isEdit) {
        response = await apiClient.put(`/job-openings/${id}`, formattedValues);
      } else {
        response = await apiClient.post("/job-openings", formattedValues);
      }

      if (response.data?.status === "success") {
        setSuccess(`Job opening ${isEdit ? 'updated' : 'created'} successfully!`);
        if (!isEdit) resetForm();
        setTimeout(() => navigate("/recruitment/openings"), 1500); // Redirect back to list
      } else {
         if (response.data?.errors) {
            const errorMessages = Object.values(response.data.errors).flat().join('. ');
            throw new Error(errorMessages || 'Validation failed.');
        }
        throw new Error(response.data?.message || `Failed to ${isEdit ? 'update' : 'create'} job opening.`);
      }
    } catch (err) {
      console.error("Job opening submission error:", err);
      setError(err.response?.data?.message || err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
      setSubmitting(false);
    }
  };

  if (dataLoading) {
    return (
      <Box m="20px" display="flex" justifyContent="center" alignItems="center" height="80vh">
        <CircularProgress color="secondary" />
        <Typography ml={2}>Loading form data...</Typography>
      </Box>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterLuxon}>
      <Box m={{ xs: "10px", md: "20px" }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Header
                title={isEdit ? "EDIT JOB OPENING" : "CREATE JOB OPENING"}
                subtitle={isEdit ? `Update details for opening ID: ${id}` : "Define a new job vacancy"}
            />
             <Button
                startIcon={<ArrowBackOutlinedIcon />}
                onClick={() => navigate('/recruitment/openings')}
                sx={{ height: 'fit-content' }}
             >
                Back to List
            </Button>
        </Box>

        {error && !success && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

        <Paper elevation={2} sx={{ p: { xs: 2, md: 3 }, backgroundColor: colors.primary[400], borderRadius: "12px" }}>
          <Formik
            initialValues={initialValues}
            validationSchema={validationSchema}
            onSubmit={handleFormSubmit}
            enableReinitialize // Important for edit mode
          >
            {({ values, errors, touched, handleBlur, handleChange, handleSubmit, setFieldValue, isSubmitting }) => (
              <form onSubmit={handleSubmit}>
                <Grid container spacing={3}>

                  {/* Basic Info */}
                  <Grid item xs={12}>
                    <Typography variant="h6" color={colors.grey[100]} sx={{ mb: 1 }}>Basic Information</Typography>
                  </Grid>
                  <Grid item xs={12} md={8}>
                    <TextField
                      fullWidth variant="filled" label="Job Title *" name="title"
                      value={values.title} onChange={handleChange} onBlur={handleBlur}
                      error={!!touched.title && !!errors.title} helperText={touched.title && errors.title}
                      required
                    />
                  </Grid>
                   <Grid item xs={12} md={4}>
                     <FormControl fullWidth variant="filled" error={!!touched.status && !!errors.status}>
                        <InputLabel id="status-label">Status *</InputLabel>
                        <Select
                          labelId="status-label" label="Status *" name="status"
                          value={values.status} onChange={handleChange} onBlur={handleBlur} required
                        >
                          <MenuItem value="draft">Draft</MenuItem>
                          <MenuItem value="open">Open</MenuItem>
                          <MenuItem value="closed">Closed</MenuItem>
                          <MenuItem value="on_hold">On Hold</MenuItem>
                        </Select>
                        {touched.status && errors.status && <FormHelperText>{errors.status}</FormHelperText>}
                     </FormControl>
                   </Grid>

                   {/* Department & Role */}
                   <Grid item xs={12} md={6}>
                     <FormControl fullWidth variant="filled" error={!!touched.department_id && !!errors.department_id}>
                        <InputLabel id="department-label">Department (Optional)</InputLabel>
                        <Select
                          labelId="department-label" label="Department (Optional)" name="department_id"
                          value={values.department_id} onChange={handleChange} onBlur={handleBlur}
                        >
                          <MenuItem value=""><em>None</em></MenuItem>
                          {departments.map((dept) => <MenuItem key={dept.id} value={dept.id}>{dept.name}</MenuItem>)}
                        </Select>
                         {touched.department_id && errors.department_id && <FormHelperText>{errors.department_id}</FormHelperText>}
                     </FormControl>
                   </Grid>
                   <Grid item xs={12} md={6}>
                     <FormControl fullWidth variant="filled" error={!!touched.job_title_id && !!errors.job_title_id}>
                        <InputLabel id="jobtitle-label">Internal Role (Optional)</InputLabel>
                        <Select
                          labelId="jobtitle-label" label="Internal Role (Optional)" name="job_title_id"
                          value={values.job_title_id} onChange={handleChange} onBlur={handleBlur}
                        >
                          <MenuItem value=""><em>None</em></MenuItem>
                          {jobTitles.map((title) => <MenuItem key={title.id} value={title.id}>{title.name}</MenuItem>)}
                        </Select>
                        {touched.job_title_id && errors.job_title_id && <FormHelperText>{errors.job_title_id}</FormHelperText>}
                     </FormControl>
                   </Grid>

                  {/* Description */}
                  <Grid item xs={12} sx={{ mt: 2 }}>
                    <Typography variant="h6" color={colors.grey[100]} sx={{ mb: 1 }}>Job Description</Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth variant="filled" label="Description / Requirements" name="description"
                      value={values.description} onChange={handleChange} onBlur={handleBlur}
                      multiline rows={6}
                      error={!!touched.description && !!errors.description} helperText={touched.description && errors.description}
                    />
                  </Grid>

                  {/* Details & Dates */}
                   <Grid item xs={12} sx={{ mt: 2 }}>
                       <Typography variant="h6" color={colors.grey[100]} sx={{ mb: 1 }}>Details & Dates</Typography>
                   </Grid>
                   <Grid item xs={12} sm={4}>
                      <TextField
                          fullWidth variant="filled" label="Positions to Fill" name="positions_to_fill" type="number"
                          value={values.positions_to_fill} onChange={handleChange} onBlur={handleBlur}
                          error={!!touched.positions_to_fill && !!errors.positions_to_fill} helperText={touched.positions_to_fill && errors.positions_to_fill}
                          inputProps={{ min: 1 }}
                      />
                   </Grid>
                   <Grid item xs={12} sm={4}>
                      <Field name="posted_date">
                        {({ field, form, meta }) => (
                          <DatePicker
                            label="Posted Date"
                            value={field.value ? DateTime.fromJSDate(field.value) : null}
                            onChange={(date) => form.setFieldValue(field.name, date ? date.toJSDate() : null)}
                            format="dd/MM/yyyy"
                            slotProps={{
                                textField: { fullWidth: true, variant: 'filled', onBlur: field.onBlur, error: meta.touched && !!meta.error, helperText: meta.touched && meta.error, }
                            }}
                          />
                        )}
                      </Field>
                   </Grid>
                   <Grid item xs={12} sm={4}>
                       <Field name="closing_date">
                        {({ field, form, meta }) => (
                          <DatePicker
                            label="Closing Date"
                            value={field.value ? DateTime.fromJSDate(field.value) : null}
                            onChange={(date) => form.setFieldValue(field.name, date ? date.toJSDate() : null)}
                            format="dd/MM/yyyy"
                            minDate={values.posted_date ? DateTime.fromJSDate(values.posted_date) : undefined}
                            slotProps={{
                                textField: { fullWidth: true, variant: 'filled', onBlur: field.onBlur, error: meta.touched && !!meta.error, helperText: meta.touched && meta.error, }
                            }}
                          />
                        )}
                      </Field>
                   </Grid>

                </Grid> {/* End Grid Container */}

                {/* Submit Button */}
                <Box display="flex" justifyContent="flex-end" mt={4}>
                  <Button type="submit" color="secondary" variant="contained" disabled={loading || isSubmitting} sx={{ px: 4, py: 1.2, fontWeight: 'bold' }}>
                    {loading ? <CircularProgress size={24} color="inherit" /> : (isEdit ? "Update Opening" : "Create Opening")}
                  </Button>
                </Box>
              </form>
            )}
          </Formik>
        </Paper>

        <Snackbar open={!!success} autoHideDuration={4000} onClose={() => setSuccess("")} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
          <Alert onClose={() => setSuccess("")} severity="success" variant="filled" sx={{ width: '100%' }}>
            {success}
          </Alert>
        </Snackbar>

      </Box>
    </LocalizationProvider>
  );
};

export default EditJobOpeningForm;