import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
  Stack,
  Chip,
  InputAdornment,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { AdapterLuxon } from "@mui/x-date-pickers/AdapterLuxon";
import { LocalizationProvider, DatePicker } from "@mui/x-date-pickers";
import { DateTime } from "luxon";
import { Formik, Field, FieldArray } from "formik";
import * as yup from "yup";
import Header from "../../../components/Header";
import { useAuth } from "../../../api/AuthProvider";

// Icons
import ArrowBackOutlinedIcon from "@mui/icons-material/ArrowBackOutlined";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import WorkOutlineOutlinedIcon from "@mui/icons-material/WorkOutlineOutlined";
import BusinessOutlinedIcon from "@mui/icons-material/BusinessOutlined";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import BadgeOutlinedIcon from "@mui/icons-material/BadgeOutlined";
import ChecklistOutlinedIcon from "@mui/icons-material/ChecklistOutlined";
import CardGiftcardOutlinedIcon from "@mui/icons-material/CardGiftcardOutlined";
import EventOutlinedIcon from "@mui/icons-material/EventOutlined";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";

const AddJobOpeningForm = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { apiClient, isAuthenticated } = useAuth();

  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [departments, setDepartments] = useState([]);
  const [jobTitles, setJobTitles] = useState([]);

  useEffect(() => {
    if (!isAuthenticated) {
      setError("Authentication required.");
      setDataLoading(false);
      return;
    }

    const fetchDropdowns = async () => {
      setDataLoading(true);
      setError("");

      try {
        const [deptRes, titleRes] = await Promise.all([
          apiClient.get("/departments"),
          apiClient.get("/job-titles"),
        ]);

        const extractData = (res) =>
          res.data?.data || (Array.isArray(res.data) ? res.data : []);

        setDepartments(extractData(deptRes));
        setJobTitles(extractData(titleRes));
      } catch (err) {
        console.error("Failed to load dropdown data:", err);
        setError(
          "Could not load necessary data. " +
            (err.response?.data?.message || err.message)
        );
      } finally {
        setDataLoading(false);
      }
    };

    fetchDropdowns();
  }, [apiClient, isAuthenticated]);

  const initialValues = {
    title: "",
    department_id: "",
    job_title_id: "",
    status: "draft",
    location: "",
    type: "",
    description: "",
    requirements: [""],
    benefits: [""],
    positions_to_fill: 1,
    posted_date: null,
    closing_date: null,
  };

  const validationSchema = yup.object({
    title: yup.string().trim().required("Job title is required").max(255),
    department_id: yup.string().nullable(),
    job_title_id: yup.string().nullable(),
    status: yup
      .string()
      .required("Status is required")
      .oneOf(["draft", "open", "closed", "on_hold"]),
    location: yup.string().nullable().max(255),
    type: yup.string().nullable().max(100),
    description: yup.string().nullable(),
    requirements: yup.array().of(yup.string().nullable()),
    benefits: yup.array().of(yup.string().nullable()),
    positions_to_fill: yup
      .number()
      .nullable()
      .integer("Must be a whole number")
      .min(1, "Must fill at least 1 position")
      .typeError("Must be a number"),
    posted_date: yup.date().nullable().typeError("Invalid date"),
    closing_date: yup
      .date()
      .nullable()
      .typeError("Invalid date")
      .min(yup.ref("posted_date"), "Closing date cannot be before posted date"),
  });

  const handleFormSubmit = async (values, { setSubmitting, resetForm }) => {
    setError("");
    setSuccess("");
    setLoading(true);

    const cleanRequirements = values.requirements
      .map((req) => (req || "").trim())
      .filter((req) => req !== "");

    const cleanBenefits = values.benefits
      .map((ben) => (ben || "").trim())
      .filter((ben) => ben !== "");

    const formattedRequirements = cleanRequirements
      .map((req, index) => `${index + 1}. ${req}`)
      .join("\n");

    const formattedBenefits = cleanBenefits.map((ben) => `• ${ben}`).join("\n");

    const formattedValues = {
      title: values.title.trim(),
      department_id: values.department_id || null,
      job_title_id: values.job_title_id || null,
      status: values.status,
      location: values.location?.trim() || null,
      type: values.type?.trim() || null,
      description: values.description?.trim() || null,
      requirements: formattedRequirements || null,
      benefits: formattedBenefits || null,
      positions_to_fill:
        values.positions_to_fill === "" || values.positions_to_fill === null
          ? 1
          : Number(values.positions_to_fill),
      posted_date: values.posted_date
        ? DateTime.fromJSDate(values.posted_date).toISODate()
        : null,
      closing_date: values.closing_date
        ? DateTime.fromJSDate(values.closing_date).toISODate()
        : null,
    };

    try {
      const response = await apiClient.post("/job-openings", formattedValues);

      if (response.data?.status === "success") {
        setSuccess("Job opening created successfully!");
        resetForm();
        setTimeout(() => navigate("/recruitment/openings"), 1500);
      } else {
        if (response.data?.errors) {
          const errorMessages = Object.values(response.data.errors).flat().join(". ");
          throw new Error(errorMessages || "Validation failed.");
        }
        throw new Error(response.data?.message || "Failed to create job opening.");
      }
    } catch (err) {
      console.error("Job opening submission error:", err);
      setError(
        err.response?.data?.message ||
          err.message ||
          "An unexpected error occurred."
      );
    } finally {
      setLoading(false);
      setSubmitting(false);
    }
  };

  const sectionPaperSx = {
    p: { xs: 2, md: 3 },
    borderRadius: "18px",
    backgroundColor: theme.palette.background.paper,
    border: `1px solid ${theme.palette.divider}`,
    height: "100%",
  };

  const sectionTitle = (icon, title, subtitle, iconColorMain, iconColorBg) => (
    <Stack spacing={0.5} mb={2.5}>
      <Stack direction="row" spacing={1.2} alignItems="center">
        <Box
          sx={{
            width: 38,
            height: 38,
            borderRadius: "12px",
            display: "grid",
            placeItems: "center",
            backgroundColor: iconColorBg || alpha(theme.palette.primary.main, 0.12),
            color: iconColorMain || theme.palette.primary.main,
          }}
        >
          {icon}
        </Box>
        <Typography
          variant="h5"
          sx={{
            fontWeight: 600,
            color: theme.palette.text.primary,
          }}
        >
          {title}
        </Typography>
      </Stack>
      <Typography
        variant="body2"
        sx={{
          color: theme.palette.text.secondary,
        }}
      >
        {subtitle}
      </Typography>
    </Stack>
  );

  const softFieldSx = {
    "& .MuiOutlinedInput-root": {
      borderRadius: "10px",
    },
    "& .MuiFormHelperText-root": {
      ml: 0,
      mt: 0.75,
    },
  };

  if (dataLoading) {
    return (
      <Box
        m="20px"
        display="flex"
        justifyContent="center"
        alignItems="center"
        height="80vh"
        flexDirection="column"
        gap={2}
      >
        <CircularProgress color="primary" />
        <Typography sx={{ color: theme.palette.text.secondary }}>
          Loading form data...
        </Typography>
      </Box>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterLuxon}>
      <Box m={{ xs: "10px", md: "20px" }} sx={{ pb: 3 }}>
        {/* Header Banner */}
        <Paper
          elevation={0}
          sx={{
            mb: 3,
            p: { xs: 2, md: 3 },
            borderRadius: "20px",
            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${alpha(theme.palette.primary.main, 0.8)} 100%)`,
            color: "#fff",
            overflow: "hidden",
            position: "relative",
          }}
        >
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              opacity: 0.1,
              backgroundImage:
                "radial-gradient(circle at 20% 20%, white 0, transparent 22%), radial-gradient(circle at 80% 30%, white 0, transparent 18%)",
            }}
          />
          <Box sx={{ position: "relative", zIndex: 1, "& .MuiTypography-root": { color: "#fff" } }}>
            <Stack
              direction={{ xs: "column", md: "row" }}
              justifyContent="space-between"
              alignItems={{ xs: "flex-start", md: "center" }}
              spacing={2}
            >
              <Box>
                <Header
                  title="CREATE JOB OPENING"
                  subtitle="Define a complete, structured vacancy and submit all recruitment details properly"
                />
                <Stack
                  direction="row"
                  spacing={1}
                  flexWrap="wrap"
                  useFlexGap
                  sx={{ mt: 1.5 }}
                >
                  <Chip
                    label="Recruitment"
                    sx={{
                      backgroundColor: "rgba(255,255,255,0.14)",
                      color: "#fff",
                      fontWeight: 600,
                    }}
                  />
                  <Chip
                    label="Job Opening Setup"
                    sx={{
                      backgroundColor: "rgba(255,255,255,0.14)",
                      color: "#fff",
                      fontWeight: 600,
                    }}
                  />
                </Stack>
              </Box>

              <Button
                startIcon={<ArrowBackOutlinedIcon />}
                onClick={() => navigate("/recruitment/openings")}
                variant="outlined"
                sx={{
                  color: "#fff",
                  borderColor: "rgba(255,255,255,0.3)",
                  backgroundColor: "rgba(255,255,255,0.08)",
                  borderRadius: "12px",
                  px: 2,
                  py: 1,
                  textTransform: "none",
                  fontWeight: 600,
                  "&:hover": {
                    backgroundColor: "rgba(255,255,255,0.15)",
                    borderColor: "rgba(255,255,255,0.5)",
                  },
                }}
              >
                Back to List
              </Button>
            </Stack>
          </Box>
        </Paper>

        {error && !success && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: "12px" }}>
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
            isSubmitting,
          }) => (
            <form onSubmit={handleSubmit}>
              <Grid container spacing={3}>
                {/* Basic Information */}
                <Grid item xs={12}>
                  <Paper elevation={0} sx={sectionPaperSx}>
                    {sectionTitle(
                      <WorkOutlineOutlinedIcon fontSize="small" />,
                      "Basic Information",
                      "Set the title and publication status for the vacancy",
                      theme.palette.primary.main,
                      alpha(theme.palette.primary.main, 0.12)
                    )}

                    <Grid container spacing={2.5}>
                      <Grid item xs={12} md={8}>
                        <TextField
                          fullWidth
                          variant="outlined"
                          label="Job Title *"
                          name="title"
                          value={values.title}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          error={!!touched.title && !!errors.title}
                          helperText={touched.title && errors.title}
                          required
                          sx={softFieldSx}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <BadgeOutlinedIcon fontSize="small" />
                              </InputAdornment>
                            ),
                          }}
                        />
                      </Grid>

                      <Grid item xs={12} md={4}>
                        <FormControl
                          fullWidth
                          variant="outlined"
                          error={!!touched.status && !!errors.status}
                          sx={softFieldSx}
                        >
                          <InputLabel id="status-label">Status *</InputLabel>
                          <Select
                            labelId="status-label"
                            name="status"
                            value={values.status}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            label="Status *"
                          >
                            <MenuItem value="draft">Draft</MenuItem>
                            <MenuItem value="open">Open</MenuItem>
                            <MenuItem value="closed">Closed</MenuItem>
                            <MenuItem value="on_hold">On Hold</MenuItem>
                          </Select>
                          {touched.status && errors.status && (
                            <FormHelperText>{errors.status}</FormHelperText>
                          )}
                        </FormControl>
                      </Grid>
                    </Grid>
                  </Paper>
                </Grid>

                {/* Organization & Logistics */}
                <Grid item xs={12}>
                  <Paper elevation={0} sx={sectionPaperSx}>
                    {sectionTitle(
                      <BusinessOutlinedIcon fontSize="small" />,
                      "Organization & Role Setup",
                      "Map the opening to the right department, internal role, location, and work type",
                      theme.palette.success.main,
                      alpha(theme.palette.success.main, 0.12)
                    )}

                    <Grid container spacing={2.5}>
                      <Grid item xs={12} md={3}>
                        <FormControl fullWidth variant="outlined" sx={softFieldSx}>
                          <InputLabel>Department</InputLabel>
                          <Select
                            name="department_id"
                            value={values.department_id}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            label="Department"
                          >
                            <MenuItem value="">
                              <em>None</em>
                            </MenuItem>
                            {departments.map((dept) => (
                              <MenuItem key={dept.id} value={dept.id}>
                                {dept.name}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>

                      <Grid item xs={12} md={3}>
                        <FormControl fullWidth variant="outlined" sx={softFieldSx}>
                          <InputLabel>Internal Role</InputLabel>
                          <Select
                            name="job_title_id"
                            value={values.job_title_id}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            label="Internal Role"
                          >
                            <MenuItem value="">
                              <em>None</em>
                            </MenuItem>
                            {jobTitles.map((title) => (
                              <MenuItem key={title.id} value={title.id}>
                                {title.name}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>

                      <Grid item xs={12} md={3}>
                        <TextField
                          fullWidth
                          variant="outlined"
                          label="Location"
                          name="location"
                          placeholder="e.g. Nairobi, Remote, Hybrid"
                          value={values.location}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          sx={softFieldSx}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <LocationOnOutlinedIcon fontSize="small" />
                              </InputAdornment>
                            ),
                          }}
                        />
                      </Grid>

                      <Grid item xs={12} md={3}>
                        <FormControl fullWidth variant="outlined" sx={softFieldSx}>
                          <InputLabel>Employment Type</InputLabel>
                          <Select
                            name="type"
                            value={values.type}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            label="Employment Type"
                          >
                            <MenuItem value="">
                              <em>None</em>
                            </MenuItem>
                            <MenuItem value="Full-time">Full-time</MenuItem>
                            <MenuItem value="Part-time">Part-time</MenuItem>
                            <MenuItem value="Contract">Contract</MenuItem>
                            <MenuItem value="Internship">Internship</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                    </Grid>
                  </Paper>
                </Grid>

                {/* General Description */}
                <Grid item xs={12}>
                  <Paper elevation={0} sx={sectionPaperSx}>
                    {sectionTitle(
                      <ChecklistOutlinedIcon fontSize="small" />,
                      "Job Overview",
                      "Provide the main summary candidates should read first",
                      theme.palette.info.main,
                      alpha(theme.palette.info.main, 0.12)
                    )}

                    <TextField
                      fullWidth
                      variant="outlined"
                      label="General Overview"
                      name="description"
                      value={values.description}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      multiline
                      rows={5}
                      placeholder="Provide a general overview of the role..."
                      sx={softFieldSx}
                    />
                  </Paper>
                </Grid>

                {/* Requirements */}
                <Grid item xs={12} md={6}>
                  <Paper elevation={0} sx={sectionPaperSx}>
                    {sectionTitle(
                      <ChecklistOutlinedIcon fontSize="small" />,
                      "Requirements",
                      "List the key qualifications, skills, and experience",
                      theme.palette.warning.main,
                      alpha(theme.palette.warning.main, 0.12)
                    )}

                    <FieldArray name="requirements">
                      {({ push, remove }) => (
                        <Stack spacing={1.5}>
                          {values.requirements.map((req, index) => (
                            <Box key={index} display="flex" gap={1} alignItems="center">
                              <TextField
                                fullWidth
                                variant="outlined"
                                size="small"
                                placeholder={`Requirement ${index + 1}`}
                                name={`requirements[${index}]`}
                                value={req}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                sx={softFieldSx}
                              />
                              <IconButton
                                color="error"
                                onClick={() => remove(index)}
                                disabled={values.requirements.length === 1}
                                sx={{ backgroundColor: alpha(theme.palette.error.main, 0.1) }}
                              >
                                <RemoveCircleOutlineIcon />
                              </IconButton>
                            </Box>
                          ))}

                          <Button
                            startIcon={<AddCircleOutlineIcon />}
                            onClick={() => push("")}
                            size="small"
                            variant="text"
                            sx={{
                              alignSelf: "flex-start",
                              color: theme.palette.text.primary,
                            }}
                          >
                            Add Requirement
                          </Button>
                        </Stack>
                      )}
                    </FieldArray>
                  </Paper>
                </Grid>

                {/* Benefits */}
                <Grid item xs={12} md={6}>
                  <Paper elevation={0} sx={sectionPaperSx}>
                    {sectionTitle(
                      <CardGiftcardOutlinedIcon fontSize="small" />,
                      "Benefits",
                      "List any optional benefits or role perks",
                      theme.palette.success.main,
                      alpha(theme.palette.success.main, 0.12)
                    )}

                    <FieldArray name="benefits">
                      {({ push, remove }) => (
                        <Stack spacing={1.5}>
                          {values.benefits.map((ben, index) => (
                            <Box key={index} display="flex" gap={1} alignItems="center">
                              <TextField
                                fullWidth
                                variant="outlined"
                                size="small"
                                placeholder={`Benefit ${index + 1}`}
                                name={`benefits[${index}]`}
                                value={ben}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                sx={softFieldSx}
                              />
                              <IconButton
                                color="error"
                                onClick={() => remove(index)}
                                disabled={values.benefits.length === 1}
                                sx={{ backgroundColor: alpha(theme.palette.error.main, 0.1) }}
                              >
                                <RemoveCircleOutlineIcon />
                              </IconButton>
                            </Box>
                          ))}

                          <Button
                            startIcon={<AddCircleOutlineIcon />}
                            onClick={() => push("")}
                            size="small"
                            variant="text"
                            sx={{
                              alignSelf: "flex-start",
                              color: theme.palette.text.primary,
                            }}
                          >
                            Add Benefit
                          </Button>
                        </Stack>
                      )}
                    </FieldArray>
                  </Paper>
                </Grid>

                {/* Hiring Logistics */}
                <Grid item xs={12}>
                  <Paper elevation={0} sx={sectionPaperSx}>
                    {sectionTitle(
                      <EventOutlinedIcon fontSize="small" />,
                      "Hiring Logistics",
                      "Define positions to fill and recruitment dates",
                      theme.palette.primary.main,
                      alpha(theme.palette.primary.main, 0.12)
                    )}

                    <Grid container spacing={2.5}>
                      <Grid item xs={12} sm={4}>
                        <TextField
                          fullWidth
                          variant="outlined"
                          label="Positions to Fill"
                          name="positions_to_fill"
                          type="number"
                          value={values.positions_to_fill}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          error={!!touched.positions_to_fill && !!errors.positions_to_fill}
                          helperText={touched.positions_to_fill && errors.positions_to_fill}
                          inputProps={{ min: 1 }}
                          sx={softFieldSx}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <GroupsOutlinedIcon fontSize="small" />
                              </InputAdornment>
                            ),
                          }}
                        />
                      </Grid>

                      <Grid item xs={12} sm={4}>
                        <Field name="posted_date">
                          {({ field, form, meta }) => (
                            <DatePicker
                              label="Posted Date"
                              value={field.value ? DateTime.fromJSDate(field.value) : null}
                              onChange={(date) =>
                                form.setFieldValue(field.name, date ? date.toJSDate() : null)
                              }
                              format="dd/MM/yyyy"
                              slotProps={{
                                textField: {
                                  fullWidth: true,
                                  variant: "outlined",
                                  onBlur: field.onBlur,
                                  error: meta.touched && !!meta.error,
                                  helperText: meta.touched && meta.error,
                                  sx: softFieldSx,
                                },
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
                              onChange={(date) =>
                                form.setFieldValue(field.name, date ? date.toJSDate() : null)
                              }
                              format="dd/MM/yyyy"
                              minDate={
                                values.posted_date
                                  ? DateTime.fromJSDate(values.posted_date)
                                  : undefined
                              }
                              slotProps={{
                                textField: {
                                  fullWidth: true,
                                  variant: "outlined",
                                  onBlur: field.onBlur,
                                  error: meta.touched && !!meta.error,
                                  helperText: meta.touched && meta.error,
                                  sx: softFieldSx,
                                },
                              }}
                            />
                          )}
                        </Field>
                      </Grid>
                    </Grid>
                  </Paper>
                </Grid>
              </Grid>

              {/* Submission Footer */}
              <Paper
                elevation={0}
                sx={{
                  mt: 3,
                  p: 2.5,
                  borderRadius: "18px",
                  backgroundColor: theme.palette.background.paper,
                  border: `1px solid ${theme.palette.divider}`,
                }}
              >
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  justifyContent="space-between"
                  alignItems={{ xs: "stretch", sm: "center" }}
                  spacing={2}
                >
                  <Box>
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 600,
                        color: theme.palette.text.primary,
                      }}
                    >
                      Ready to create this opening?
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        color: theme.palette.text.secondary,
                      }}
                    >
                      All vacancy details will be submitted in a clean, structured format.
                    </Typography>
                  </Box>

                  <Stack direction="row" spacing={1.5}>
                    <Button
                      variant="outlined"
                      onClick={() => navigate("/recruitment/openings")}
                      sx={{
                        borderRadius: "10px",
                        px: 2.5,
                        borderColor: theme.palette.divider,
                        color: theme.palette.text.primary,
                      }}
                    >
                      Cancel
                    </Button>

                    <Button
                      type="submit"
                      variant="contained"
                      disabled={loading || isSubmitting || dataLoading}
                      sx={{
                        px: 3.5,
                        borderRadius: "10px",
                        backgroundColor: theme.palette.primary.main,
                        color: "#fff",
                      }}
                    >
                      {loading ? (
                        <CircularProgress size={22} color="inherit" />
                      ) : (
                        "Create Opening"
                      )}
                    </Button>
                  </Stack>
                </Stack>
              </Paper>
            </form>
          )}
        </Formik>

        <Snackbar
          open={!!success}
          autoHideDuration={4000}
          onClose={() => setSuccess("")}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        >
          <Alert
            onClose={() => setSuccess("")}
            severity="success"
            variant="filled"
            sx={{ width: "100%", borderRadius: "10px" }}
          >
            {success}
          </Alert>
        </Snackbar>
      </Box>
    </LocalizationProvider>
  );
};

export default AddJobOpeningForm;