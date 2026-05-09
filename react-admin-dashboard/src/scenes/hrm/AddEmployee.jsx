// src/scenes/team/AddEmployee.jsx
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import {
  AccountBalanceWalletOutlined,
  BadgeOutlined,
  BusinessCenterOutlined,
  ContentCopy,
  KeyOutlined,
  PersonOutline,
  ReceiptLongOutlined,
  Refresh,
  Visibility,
  VisibilityOff,
} from "@mui/icons-material";
import { Formik } from "formik";
import * as yup from "yup";
import { useNavigate } from "react-router-dom";

import Header from "../../components/Header";
import { useAuth } from "../../api/AuthProvider";

const getError = (touched, errors, field) =>
  Boolean(touched[field] && errors[field]);

const getHelperText = (touched, errors, field) =>
  touched[field] && errors[field] ? errors[field] : "";

const generateRandomPassword = () => {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$!";
  let password = "";

  for (let i = 0; i < 10; i += 1) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return password;
};

const extractCollection = (response) => {
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.data)) return response.data.data;
  return [];
};

const Section = ({ title, subtitle, icon, color, children }) => {
  const theme = useTheme();
  const styles = theme.addEmployee;

  return (
    <Paper elevation={0} sx={styles.sectionCard}>
      <Box sx={styles.sectionHeader}>
        <Box sx={styles.sectionTitleWrap}>
          <Box sx={styles.sectionIcon(color)}>{icon}</Box>

          <Box minWidth={0}>
            <Typography sx={styles.sectionTitle}>{title}</Typography>
            {subtitle && (
              <Typography sx={styles.sectionSubtitle}>{subtitle}</Typography>
            )}
          </Box>
        </Box>
      </Box>

      <Box sx={styles.formGrid}>{children}</Box>
    </Paper>
  );
};

const AddEmployee = () => {
  const theme = useTheme();
  const styles = theme.addEmployee;
  const navigate = useNavigate();
  const { apiClient, isAuthenticated } = useAuth();

  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [departments, setDepartments] = useState([]);
  const [jobTitles, setJobTitles] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const fetchDropdowns = useCallback(async () => {
    try {
      setDataLoading(true);
      setError("");

      const [departmentResponse, jobTitleResponse] = await Promise.all([
        apiClient.get("/departments"),
        apiClient.get("/job-titles"),
      ]);

      setDepartments(extractCollection(departmentResponse));
      setJobTitles(extractCollection(jobTitleResponse));
    } catch (err) {
      console.error("Dropdown fetch error:", err);
      setError("Could not load departments and job titles.");
    } finally {
      setDataLoading(false);
    }
  }, [apiClient]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchDropdowns();
    } else {
      setDataLoading(false);
    }
  }, [fetchDropdowns, isAuthenticated]);

  const initialValues = useMemo(
    () => ({
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
      password: "",
    }),
    []
  );

  const validationSchema = useMemo(
    () =>
      yup.object({
        first_name: yup.string().trim().required("Required"),
        last_name: yup.string().trim().required("Required"),
        email: yup.string().trim().email("Invalid email").required("Required"),
        phone_number: yup
          .string()
          .nullable()
          .matches(/^(?:\+254|0)\d{9}$/, {
            message: "Invalid Kenyan phone number",
            excludeEmptyString: true,
          }),
        department_id: yup.string().required("Select a department"),
        job_title_id: yup.string().required("Select a job title"),
        salary: yup
          .number()
          .nullable()
          .typeError("Must be a number")
          .min(0, "Salary cannot be negative"),
        password: yup.string().required("Password required").min(8, "Min 8 chars"),
      }),
    []
  );

  const handleCopyPassword = async (password) => {
    if (!password) {
      setError("Generate or enter a password first.");
      return;
    }

    try {
      await navigator.clipboard.writeText(password);
      setSuccess("Password copied to clipboard.");
    } catch {
      setError("Could not copy password.");
    }
  };

  const handleFormSubmit = async (values, { setSubmitting, resetForm }) => {
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const response = await apiClient.post("/employees", values);

      if (response.data?.status === "success") {
        setSuccess("Employee created successfully.");
        resetForm();

        setTimeout(() => navigate("/team"), 1200);
      } else {
        throw new Error(response.data?.message || "Failed to create employee.");
      }
    } catch (err) {
      console.error("Form submission error:", err);
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
      setSubmitting(false);
    }
  };

  if (dataLoading) {
    return (
      <Box sx={styles.shell}>
        <Paper elevation={0} sx={styles.loadingCard}>
          <Stack alignItems="center" spacing={1.5}>
            <CircularProgress size={26} />
            <Typography sx={{ color: "text.secondary", fontSize: "0.78rem" }}>
              Loading departments and job titles...
            </Typography>
          </Stack>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={styles.shell}>
      <Paper elevation={0} sx={styles.headerCard}>
        <Header
          title="ADD EMPLOYEE"
          subtitle="Create a new employee profile and login credentials"
        />
      </Paper>

      {error && !success && (
        <Alert severity="error" sx={styles.alert}>
          {error}
        </Alert>
      )}

      <Formik
        initialValues={initialValues}
        validationSchema={validationSchema}
        onSubmit={handleFormSubmit}
      >
        {({
          values,
          errors,
          touched,
          handleBlur,
          handleChange,
          handleSubmit,
          setFieldValue,
          isSubmitting,
        }) => (
          <form onSubmit={handleSubmit}>
            <Section
              title="Personal Information"
              subtitle="Basic identity and contact details"
              icon={<PersonOutline />}
              color={theme.palette.success.main}
            >
              <TextField
                fullWidth
                label="First Name *"
                name="first_name"
                value={values.first_name}
                onChange={handleChange}
                onBlur={handleBlur}
                error={getError(touched, errors, "first_name")}
                helperText={getHelperText(touched, errors, "first_name")}
                sx={styles.textField}
              />

              <TextField
                fullWidth
                label="Last Name *"
                name="last_name"
                value={values.last_name}
                onChange={handleChange}
                onBlur={handleBlur}
                error={getError(touched, errors, "last_name")}
                helperText={getHelperText(touched, errors, "last_name")}
                sx={styles.textField}
              />

              <TextField
                fullWidth
                label="Email *"
                name="email"
                value={values.email}
                onChange={handleChange}
                onBlur={handleBlur}
                error={getError(touched, errors, "email")}
                helperText={getHelperText(touched, errors, "email")}
                sx={styles.textField}
              />

              <TextField
                fullWidth
                label="Phone Number"
                name="phone_number"
                value={values.phone_number}
                onChange={handleChange}
                onBlur={handleBlur}
                error={getError(touched, errors, "phone_number")}
                helperText={
                  getHelperText(touched, errors, "phone_number") ||
                  "Format: 0712345678 or +254712345678"
                }
                sx={styles.textField}
              />
            </Section>

            <Section
              title="Employment Details"
              subtitle="Department, job assignment, salary, and hire date"
              icon={<BusinessCenterOutlined />}
              color={theme.palette.info.main}
            >
              <FormControl
                fullWidth
                error={getError(touched, errors, "department_id")}
              >
                <InputLabel>Department *</InputLabel>
                <Select
                  name="department_id"
                  label="Department *"
                  value={values.department_id}
                  onChange={handleChange}
                  onBlur={handleBlur}
                >
                  <MenuItem value="">
                    <em>Select Department</em>
                  </MenuItem>

                  {departments.map((department) => (
                    <MenuItem key={department.id} value={department.id}>
                      {department.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl
                fullWidth
                error={getError(touched, errors, "job_title_id")}
              >
                <InputLabel>Job Title *</InputLabel>
                <Select
                  name="job_title_id"
                  label="Job Title *"
                  value={values.job_title_id}
                  onChange={handleChange}
                  onBlur={handleBlur}
                >
                  <MenuItem value="">
                    <em>Select Job Title</em>
                  </MenuItem>

                  {jobTitles.map((jobTitle) => (
                    <MenuItem key={jobTitle.id} value={jobTitle.id}>
                      {jobTitle.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                fullWidth
                label="Salary"
                name="salary"
                value={values.salary}
                onChange={handleChange}
                onBlur={handleBlur}
                error={getError(touched, errors, "salary")}
                helperText={getHelperText(touched, errors, "salary")}
                sx={styles.textField}
              />

              <TextField
                fullWidth
                type="date"
                label="Hired On"
                name="hired_on"
                InputLabelProps={{ shrink: true }}
                value={values.hired_on}
                onChange={handleChange}
                onBlur={handleBlur}
                error={getError(touched, errors, "hired_on")}
                helperText={getHelperText(touched, errors, "hired_on")}
                sx={styles.textField}
              />
            </Section>

            <Section
              title="Statutory Information"
              subtitle="National and statutory registration details"
              icon={<ReceiptLongOutlined />}
              color={theme.palette.error.main}
            >
              <TextField
                fullWidth
                label="National ID Number"
                name="national_id_number"
                value={values.national_id_number}
                onChange={handleChange}
                sx={styles.textField}
              />

              <TextField
                fullWidth
                label="NSSF Number"
                name="nssf_number"
                value={values.nssf_number}
                onChange={handleChange}
                sx={styles.textField}
              />

              <TextField
                fullWidth
                label="NHIF Number"
                name="nhif_number"
                value={values.nhif_number}
                onChange={handleChange}
                sx={styles.textField}
              />

              <TextField
                fullWidth
                label="KRA PIN"
                name="kra_pin"
                value={values.kra_pin}
                onChange={handleChange}
                sx={styles.textField}
              />
            </Section>

            <Section
              title="Banking Information"
              subtitle="Bank account details for payroll processing"
              icon={<AccountBalanceWalletOutlined />}
              color={theme.palette.primary.main}
            >
              <TextField
                fullWidth
                label="Bank Account Number"
                name="bank_account_number"
                value={values.bank_account_number}
                onChange={handleChange}
                sx={styles.textField}
              />

              <TextField
                fullWidth
                label="Bank Name"
                name="bank_name"
                value={values.bank_name}
                onChange={handleChange}
                sx={styles.textField}
              />

              <TextField
                fullWidth
                label="Bank Branch"
                name="bank_branch"
                value={values.bank_branch}
                onChange={handleChange}
                sx={styles.textField}
              />
            </Section>

            <Section
              title="Login Credentials"
              subtitle="Generate first-time access credentials for the employee"
              icon={<KeyOutlined />}
              color={theme.palette.warning.main}
            >
              <TextField
                fullWidth
                label="Password *"
                name="password"
                type={showPassword ? "text" : "password"}
                value={values.password}
                onChange={handleChange}
                onBlur={handleBlur}
                error={getError(touched, errors, "password")}
                helperText={getHelperText(touched, errors, "password")}
                sx={styles.textField}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <Tooltip title={showPassword ? "Hide password" : "Show password"}>
                        <IconButton
                          onClick={() => setShowPassword((prev) => !prev)}
                          sx={styles.iconButton}
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </Tooltip>

                      <Tooltip title="Copy password">
                        <IconButton
                          onClick={() => handleCopyPassword(values.password)}
                          sx={styles.iconButton}
                        >
                          <ContentCopy />
                        </IconButton>
                      </Tooltip>
                    </InputAdornment>
                  ),
                }}
              />

              <Stack direction="row" alignItems="center" spacing={1}>
                <Button
                  variant="outlined"
                  startIcon={<BadgeOutlined />}
                  onClick={() =>
                    setFieldValue("password", generateRandomPassword())
                  }
                  sx={styles.secondaryButton}
                >
                  Generate Password
                </Button>
              </Stack>
            </Section>

            <Paper elevation={0} sx={styles.actionFooter}>
              <Typography sx={styles.footerHint}>
                Review the details carefully before creating the employee account.
              </Typography>

              <Box sx={styles.actionStack}>
                <Button
                  variant="outlined"
                  startIcon={<Refresh />}
                  onClick={fetchDropdowns}
                  sx={styles.secondaryButton}
                >
                  Reload Lists
                </Button>

                <Button
                  type="submit"
                  variant="contained"
                  disabled={loading || isSubmitting}
                  sx={styles.primaryButton}
                >
                  {loading || isSubmitting ? (
                    <CircularProgress size={20} color="inherit" />
                  ) : (
                    "Create Employee"
                  )}
                </Button>
              </Box>
            </Paper>
          </form>
        )}
      </Formik>

      <Snackbar
        open={Boolean(success)}
        autoHideDuration={4000}
        onClose={() => setSuccess("")}
      >
        <Alert severity="success" onClose={() => setSuccess("")}>
          {success}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AddEmployee;