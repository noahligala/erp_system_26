import { useState, useEffect, useMemo } from "react";
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
  IconButton,
  InputAdornment,
  Tooltip,
} from "@mui/material";
import { Visibility, VisibilityOff, ContentCopy } from "@mui/icons-material";
import { Formik } from "formik";
import * as yup from "yup";
import { useNavigate, useParams } from "react-router-dom"; // Import useParams
import Header from "../../components/Header";
import { tokens } from "../../theme";
import { useAuth } from "../../api/AuthProvider";

// Re-usable Section component (copied from your AddEmployee)
const Section = ({ title, children }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  return (
    <Paper
      elevation={2}
      sx={{
        p: 3,
        mb: 4,
        borderRadius: "16px",
        backgroundColor: colors.primary[400],
      }}
    >
      <Typography
        variant="h6"
        color={colors.grey[100]}
        sx={{
          mb: 3,
          borderBottom: `2px solid ${colors.greenAccent[500]}`,
          pb: 0.5,
          fontWeight: 600,
        }}
      >
        {title}
      </Typography>
      {children}
    </Paper>
  );
};

const EditEmployee = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const navigate = useNavigate();
  const { id } = useParams(); // Get employee ID from URL
  const { apiClient, isAuthenticated } = useAuth();

  const [loading, setLoading] = useState(false); // For submit
  const [dataLoading, setDataLoading] = useState(true); // For initial fetch
  const [departments, setDepartments] = useState([]);
  const [jobTitles, setJobTitles] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Initial values are now state, populated by useEffect
  const [initialValues, setInitialValues] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone_number: "",
    department_id: "",
    job_title_id: "",
    salary: "",
    status: "active",
    hired_on: "",
    national_id_number: "",
    nssf_number: "",
    kra_pin: "",
    nhif_number: "",
    bank_account_number: "",
    bank_name: "",
    bank_branch: "",
    company_role: "EMPLOYEE",
    password: "", // Password is blank by default
  });

  // Fetch all required data on component mount
  useEffect(() => {
    if (!isAuthenticated || !id) {
      setDataLoading(false);
      setError("Authentication required or Employee ID missing.");
      return;
    }

    const fetchData = async () => {
      setDataLoading(true);
      setError("");
      try {
        const [employeeRes, deptRes, titleRes] = await Promise.all([
          apiClient.get(`/employees/${id}`),
          apiClient.get("/departments"),
          apiClient.get("/job-titles"),
        ]);

        // 1. Process dropdowns
        const extractData = (res) => {
          if (Array.isArray(res.data)) return res.data;
          if (res.data?.data && Array.isArray(res.data.data)) return res.data.data;
          return [];
        };
        const depts = extractData(deptRes);
        const titles = extractData(titleRes);
        setDepartments(depts);
        setJobTitles(titles);

        // 2. Process employee data
        const employeeData = employeeRes.data.data;

        // 3. Find the correct IDs for the dropdowns
        // Your transformEmployee returns names, so we find the ID from the lists
        const deptId = depts.find(d => d.name === employeeData.department)?.id || "";
        const titleId = titles.find(t => t.name === employeeData.job_title)?.id || "";

        // 4. Set the initialValues for the form
        setInitialValues({
          first_name: employeeData.first_name || "",
          last_name: employeeData.last_name || "",
          email: employeeData.email || "",
          phone_number: employeeData.phone_number || "",
          department_id: deptId,
          job_title_id: titleId,
          salary: employeeData.salary || "",
          status: employeeData.status || "active",
          hired_on: employeeData.hired_on || "",
          national_id_number: employeeData.national_id || "", // Field name mismatch fix
          nssf_number: employeeData.nssf_number || "",
          kra_pin: employeeData.kra_pin || "",
          nhif_number: employeeData.nhif_number || "",
          bank_account_number: employeeData.bank_account || "", // Field name mismatch fix
          bank_name: employeeData.bank_name || "",
          bank_branch: employeeData.bank_branch || "",
          company_role: employeeData.accessLevel || "EMPLOYEE", // Field name mismatch fix
          password: "", // Always start with an empty password field
        });
        
      } catch (err) {
        console.error("Failed to fetch employee data:", err);
        setError("Could not load employee data. " + (err.response?.data?.message || err.message));
      } finally {
        setDataLoading(false);
      }
    };
    
    fetchData();
  }, [apiClient, isAuthenticated, id]);

  // Validation schema: password is now optional
  const validationSchema = yup.object({
    first_name: yup.string().trim().required("Required"),
    last_name: yup.string().trim().required("Required"),
    email: yup.string().trim().email("Invalid email").required("Required"),
    phone_number: yup
      .string()
      .nullable()
      .matches(/^(?:\+254|0)\d{9}$/, "Invalid Kenyan phone number"),
    department_id: yup.string().required("Select a department"),
    job_title_id: yup.string().required("Select a job title"),
    salary: yup
      .number()
      .nullable()
      .typeError("Must be a number")
      .min(0, "Salary cannot be negative"),
    password: yup
      .string()
      .nullable() // Allows empty string
      .min(8, "Must be at least 8 characters if provided"),
  });

  const handleCopyPassword = (password) => {
    navigator.clipboard.writeText(password);
    setSuccess("Password copied to clipboard!");
  };

  // Submit handler uses PUT
  const handleFormSubmit = async (values, { setSubmitting }) => {
    setError("");
    setSuccess("");
    setLoading(true);

    // Only send password if user entered a new one
    const payload = { ...values };
    if (!payload.password) {
      delete payload.password;
    }

    try {
      const response = await apiClient.put(`/employees/${id}`, payload);
      if (response.data?.status === "success") {
        setSuccess("Employee updated successfully!");
        setTimeout(() => navigate("/team"), 1500);
      } else {
        throw new Error(response.data?.message || "Failed to update employee.");
      }
    } catch (err) {
      console.error("Form submission error:", err);
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
      setSubmitting(false);
    }
  };

  if (dataLoading)
    return (
      <Box m="20px" display="flex" justifyContent="center" alignItems="center" height="80vh">
        <CircularProgress color="secondary" />
        <Typography ml={2}>Loading employee data...</Typography>
      </Box>
    );

  return (
    <Box m="20px">
      <Header title="EDIT EMPLOYEE" subtitle={`Update ${initialValues.first_name} ${initialValues.last_name}'s Profile`} />

      {error && !success && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Formik
        initialValues={initialValues}
        validationSchema={validationSchema}
        onSubmit={handleFormSubmit}
        enableReinitialize // <-- CRITICAL: Allows form to populate after fetch
      >
        {({ values, errors, touched, handleBlur, handleChange, handleSubmit, setFieldValue }) => (
          <form onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              {/* Personal Info */}
              <Grid item xs={12}>
                <Section title="Personal Information">
                  <Grid container spacing={3}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth variant="filled" label="First Name *"
                        name="first_name" onChange={handleChange}
                        value={values.first_name} onBlur={handleBlur}
                        error={!!touched.first_name && !!errors.first_name}
                        helperText={touched.first_name && errors.first_name}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth variant="filled" label="Last Name *"
                        name="last_name" onChange={handleChange}
                        value={values.last_name} onBlur={handleBlur}
                        error={!!touched.last_name && !!errors.last_name}
                        helperText={touched.last_name && errors.last_name}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth variant="filled" label="Email *"
                        name="email" onChange={handleChange}
                        value={values.email} onBlur={handleBlur}
                        error={!!touched.email && !!errors.email}
                        helperText={touched.email && errors.email}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth variant="filled" label="Phone Number"
                        name="phone_number" onChange={handleChange}
                        value={values.phone_number} onBlur={handleBlur}
                        error={!!touched.phone_number && !!errors.phone_number}
                        helperText={touched.phone_number && errors.phone_number}
                      />
                    </Grid>
                  </Grid>
                </Section>
              </Grid>

              {/* Employment Info */}
              <Grid item xs={12}>
                <Section title="Employment Details">
                  <Grid container spacing={3}>
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth variant="filled">
                        <InputLabel>Department *</InputLabel>
                        <Select
                          label="Department *" // Added for label to work
                          name="department_id"
                          value={values.department_id}
                          onChange={handleChange}
                          onBlur={handleBlur}
                        >
                          <MenuItem value="">
                            <em>Select Department</em>
                          </MenuItem>
                          {departments.map((dept) => (
                            <MenuItem key={dept.id} value={dept.id}>
                              {dept.name}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth variant="filled">
                        <InputLabel>Job Title *</InputLabel>
                        <Select
                          label="Job Title *" // Added for label to work
                          name="job_title_id"
                          value={values.job_title_id}
                          onChange={handleChange}
                          onBlur={handleBlur}
                        >
                          <MenuItem value="">
                            <em>Select Job Title</em>
                          </MenuItem>
                          {jobTitles.map((title) => (
                            <MenuItem key={title.id} value={title.id}>
                              {title.name}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth variant="filled" label="Salary"
                        name="salary" onChange={handleChange}
                        value={values.salary} onBlur={handleBlur}
                        error={!!touched.salary && !!errors.salary}
                        helperText={touched.salary && errors.salary}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth variant="filled" type="date"
                        label="Hired On" name="hired_on"
                        InputLabelProps={{ shrink: true }}
                        onChange={handleChange}
                        value={values.hired_on}
                        onBlur={handleBlur}
                        error={!!touched.hired_on && !!errors.hired_on}
                        helperText={touched.hired_on && errors.hired_on}
                      />
                    </Grid>
                  </Grid>
                </Section>
              </Grid>

              {/* Statutory Info */}
              <Grid item xs={12}>
                <Section title="Statutory Information">
                  <Grid container spacing={3}>
                    <Grid item xs={12} sm={6}>
                      <TextField fullWidth variant="filled" label="National ID Number" name="national_id_number"
                        onChange={handleChange} value={values.national_id_number} />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField fullWidth variant="filled" label="NSSF Number" name="nssf_number"
                        onChange={handleChange} value={values.nssf_number} />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField fullWidth variant="filled" label="NHIF Number" name="nhif_number"
                        onChange={handleChange} value={values.nhif_number} />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField fullWidth variant="filled" label="KRA PIN" name="kra_pin"
                        onChange={handleChange} value={values.kra_pin} />
                    </Grid>
                  </Grid>
                </Section>
              </Grid>

              {/* Banking Info */}
              <Grid item xs={12}>
                <Section title="Banking Information">
                  <Grid container spacing={3}>
                    <Grid item xs={12} sm={6}>
                      <TextField fullWidth variant="filled" label="Bank Account Number" name="bank_account_number"
                        onChange={handleChange} value={values.bank_account_number} />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField fullWidth variant="filled" label="Bank Name" name="bank_name"
                        onChange={handleChange} value={values.bank_name} />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField fullWidth variant="filled" label="Bank Branch" name="bank_branch"
                        onChange={handleChange} value={values.bank_branch} />
                    </Grid>
                  </Grid>
                </Section>
              </Grid>

              {/* Login Info */}
              <Grid item xs={12}>
                <Section title="Update Password (Optional)">
                  <Grid container spacing={3}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth variant="filled"
                        label="New Password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        value={values.password}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={!!touched.password && !!errors.password}
                        helperText={touched.password && errors.password ? errors.password : "Leave blank to keep password unchanged"}
                        InputProps={{
                          endAdornment: (
                            <InputAdornment position="end">
                              <Tooltip title="Show/Hide password">
                                <IconButton onClick={() => setShowPassword(!showPassword)}>
                                  {showPassword ? <VisibilityOff /> : <Visibility />}
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Copy password">
                                <IconButton onClick={() => handleCopyPassword(values.password)}>
                                  <ContentCopy />
                                </IconButton>
                              </Tooltip>
                            </InputAdornment>
                          ),
                        }}
                      />
                    </Grid>
                  </Grid>
                </Section>
              </Grid>

              {/* Submit */}
              <Box display="flex" justifyContent="flex-end" width="100%" mb={3}>
                <Button type="submit" variant="contained" color="secondary" disabled={loading}>
                  {loading ? <CircularProgress size={24} color="inherit" /> : "Update Employee"}
                </Button>
              </Box>
            </Grid>
          </form>
        )}
      </Formik>

      <Snackbar open={!!success} autoHideDuration={4000} onClose={() => setSuccess("")}>
        <Alert severity="success" onClose={() => setSuccess("")}>{success}</Alert>
      </Snackbar>
    </Box>
  );
};

export default EditEmployee;