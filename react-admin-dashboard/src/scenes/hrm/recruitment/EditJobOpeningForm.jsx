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
  Stack,
  Chip,
  Divider,
  InputAdornment,
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
import WorkOutlineOutlinedIcon from "@mui/icons-material/WorkOutlineOutlined";
import BusinessCenterOutlinedIcon from "@mui/icons-material/BusinessCenterOutlined";
import ApartmentOutlinedIcon from "@mui/icons-material/ApartmentOutlined";
import BadgeOutlinedIcon from "@mui/icons-material/BadgeOutlined";
import EventOutlinedIcon from "@mui/icons-material/EventOutlined";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";

const emptyInitialValues = {
  title: "",
  description: "",
  department_id: "",
  job_title_id: "",
  status: "draft",
  positions_to_fill: 1,
  posted_date: null,
  closing_date: null,
};

const EditJobOpeningForm = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const navigate = useNavigate();
  const { id } = useParams();
  const { apiClient, isAuthenticated } = useAuth();

  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [departments, setDepartments] = useState([]);
  const [jobTitles, setJobTitles] = useState([]);
  const [initialValues, setInitialValues] = useState(emptyInitialValues);

  const extractCollection = (res) => {
    if (Array.isArray(res?.data?.data)) return res.data.data;
    if (Array.isArray(res?.data)) return res.data;
    return [];
  };

  const extractSingleOpening = (res) => {
    if (res?.data?.data && !Array.isArray(res.data.data)) return res.data.data;
    if (res?.data && !Array.isArray(res.data)) return res.data;
    return null;
  };

  useEffect(() => {
    if (!isAuthenticated) {
      setError("Authentication required.");
      setDataLoading(false);
      return;
    }

    let isMounted = true;

    const fetchData = async () => {
      setDataLoading(true);
      setError("");

      try {
        const requests = [
          apiClient.get("/departments"),
          apiClient.get("/job-titles"),
        ];

        if (isEdit) {
          requests.push(apiClient.get(`/job-openings/${id}`));
        }

        const responses = await Promise.all(requests);
        const [deptRes, titleRes, openingRes] = responses;

        if (!isMounted) return;

        setDepartments(extractCollection(deptRes));
        setJobTitles(extractCollection(titleRes));

        if (isEdit) {
          const data = extractSingleOpening(openingRes);

          if (!data) {
            throw new Error("Failed to fetch job opening details.");
          }

          setInitialValues({
            title: data.title || "",
            description: data.description || "",
            department_id: data.department_id ? String(data.department_id) : "",
            job_title_id: data.job_title_id ? String(data.job_title_id) : "",
            status: data.status || "draft",
            positions_to_fill: data.positions_to_fill ?? 1,
            posted_date: data.posted_date
              ? DateTime.fromISO(data.posted_date).isValid
                ? DateTime.fromISO(data.posted_date).toJSDate()
                : null
              : null,
            closing_date: data.closing_date
              ? DateTime.fromISO(data.closing_date).isValid
                ? DateTime.fromISO(data.closing_date).toJSDate()
                : null
              : null,
          });
        } else {
          setInitialValues(emptyInitialValues);
        }
      } catch (err) {
        console.error("Failed to load form data:", err);
        const message =
          err.response?.data?.message ||
          err.message ||
          "Could not load necessary data.";
        setError(message);
      } finally {
        if (isMounted) setDataLoading(false);
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [apiClient, isAuthenticated, id, isEdit]);

  const validationSchema = yup.object({
    title: yup.string().required("Job title is required").max(255),
    description: yup.string().nullable(),
    department_id: yup.string().nullable(),
    job_title_id: yup.string().nullable(),
    status: yup
      .string()
      .required("Status is required")
      .oneOf(["draft", "open", "closed", "on_hold"]),
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

    const formattedValues = {
      ...values,
      posted_date: values.posted_date
        ? DateTime.fromJSDate(values.posted_date).toISODate()
        : null,
      closing_date: values.closing_date
        ? DateTime.fromJSDate(values.closing_date).toISODate()
        : null,
      positions_to_fill:
        values.positions_to_fill === "" || values.positions_to_fill === null
          ? null
          : Number(values.positions_to_fill),
      department_id: values.department_id || null,
      job_title_id: values.job_title_id || null,
    };

    try {
      const response = isEdit
        ? await apiClient.put(`/job-openings/${id}`, formattedValues)
        : await apiClient.post("/job-openings", formattedValues);

      if (response.data?.status === "success") {
        setSuccess(`Job opening ${isEdit ? "updated" : "created"} successfully!`);

        if (!isEdit) {
          resetForm();
          setInitialValues(emptyInitialValues);
        }

        setTimeout(() => navigate("/recruitment/openings"), 1200);
      } else {
        if (response.data?.errors) {
          const errorMessages = Object.values(response.data.errors).flat().join(". ");
          throw new Error(errorMessages || "Validation failed.");
        }
        throw new Error(
          response.data?.message ||
            `Failed to ${isEdit ? "update" : "create"} job opening.`
        );
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
    borderRadius: "20px",
    backgroundColor:
      theme.palette.mode === "dark" ? colors.primary[400] : colors.primary[100],
    border: `1px solid ${
      theme.palette.mode === "dark" ? colors.grey[700] : colors.grey[800]
    }`,
    boxShadow:
      theme.palette.mode === "dark"
        ? "0 10px 22px rgba(0,0,0,0.18)"
        : "0 10px 22px rgba(15,23,42,0.06)",
  };

  const sectionTitle = (icon, title, subtitle) => (
    <Stack spacing={0.5} mb={2.5}>
      <Stack direction="row" spacing={1.2} alignItems="center">
        <Box
          sx={{
            width: 38,
            height: 38,
            borderRadius: "12px",
            display: "grid",
            placeItems: "center",
            backgroundColor:
              theme.palette.mode === "dark"
                ? "rgba(76, 206, 172, 0.12)"
                : "rgba(35, 168, 37, 0.12)",
            color: colors.greenAccent[500],
          }}
        >
          {icon}
        </Box>
        <Typography
          variant="h5"
          sx={{
            fontWeight: 800,
            color: colors.grey[100],
          }}
        >
          {title}
        </Typography>
      </Stack>
      <Typography
        variant="body2"
        sx={{
          color:
            theme.palette.mode === "dark" ? colors.grey[300] : colors.grey[500],
        }}
      >
        {subtitle}
      </Typography>
    </Stack>
  );

  const fieldSx = {
    "& .MuiFilledInput-root": {
      borderRadius: "12px",
    },
    "& .MuiFormHelperText-root": {
      ml: 0,
      mt: 0.75,
    },
  };

  const pageTitle = isEdit ? "EDIT JOB OPENING" : "CREATE JOB OPENING";
  const pageSubtitle = isEdit
    ? `Update the selected opening and keep the recruitment details accurate`
    : "Define a new job vacancy";

  if (dataLoading) {
    return (
      <Box
        m="20px"
        display="flex"
        justifyContent="center"
        alignItems="center"
        flexDirection="column"
        gap={2}
        height="80vh"
      >
        <CircularProgress color="secondary" />
        <Typography
          sx={{
            color:
              theme.palette.mode === "dark" ? colors.grey[200] : colors.grey[400],
          }}
        >
          Loading form data...
        </Typography>
      </Box>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterLuxon}>
      <Box m={{ xs: "10px", md: "20px" }} sx={{ pb: 3 }}>
        <Paper
          elevation={0}
          sx={{
            mb: 3,
            p: { xs: 2, md: 3 },
            borderRadius: "20px",
            background:
              theme.palette.mode === "dark"
                ? `linear-gradient(135deg, ${colors.primary[400]} 0%, ${colors.primary[500]} 100%)`
                : `linear-gradient(135deg, ${colors.blueAccent[800]} 0%, ${colors.blueAccent[700]} 100%)`,
            color: "#fff",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              opacity: 0.08,
              backgroundImage:
                "radial-gradient(circle at 20% 20%, white 0, transparent 22%), radial-gradient(circle at 80% 30%, white 0, transparent 18%)",
            }}
          />
          <Box sx={{ position: "relative", zIndex: 1 }}>
            <Stack
              direction={{ xs: "column", md: "row" }}
              justifyContent="space-between"
              alignItems={{ xs: "flex-start", md: "center" }}
              spacing={2}
            >
              <Box>
                <Header title={pageTitle} subtitle={pageSubtitle} />
                <Stack
                  direction="row"
                  spacing={1}
                  flexWrap="wrap"
                  useFlexGap
                  sx={{ mt: 1.5 }}
                >
                  <Chip
                    label={isEdit ? `Opening ID: ${id}` : "New Opening"}
                    sx={{
                      backgroundColor: "rgba(255,255,255,0.14)",
                      color: "#fff",
                      fontWeight: 700,
                    }}
                  />
                  <Chip
                    label={isEdit ? "Edit Mode" : "Create Mode"}
                    sx={{
                      backgroundColor: "rgba(255,255,255,0.14)",
                      color: "#fff",
                      fontWeight: 700,
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
                  borderColor: "rgba(255,255,255,0.25)",
                  backgroundColor: "rgba(255,255,255,0.08)",
                  borderRadius: "12px",
                  px: 2,
                  py: 1,
                  textTransform: "none",
                  fontWeight: 700,
                  "&:hover": {
                    backgroundColor: "rgba(255,255,255,0.14)",
                  },
                }}
              >
                Back to List
              </Button>
            </Stack>
          </Box>
        </Paper>

        {error && !success && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: 3 }}>
            {error}
          </Alert>
        )}

        <Formik
          initialValues={initialValues}
          validationSchema={validationSchema}
          onSubmit={handleFormSubmit}
          enableReinitialize
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
                      "Define the opening title and current workflow status"
                    )}

                    <Grid container spacing={2.5}>
                      <Grid item xs={12} md={8}>
                        <TextField
                          fullWidth
                          variant="filled"
                          label="Job Title *"
                          name="title"
                          value={values.title}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          error={!!touched.title && !!errors.title}
                          helperText={touched.title && errors.title}
                          required
                          sx={fieldSx}
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
                          variant="filled"
                          error={!!touched.status && !!errors.status}
                          sx={fieldSx}
                        >
                          <InputLabel id="status-label">Status *</InputLabel>
                          <Select
                            labelId="status-label"
                            name="status"
                            value={values.status}
                            onChange={handleChange}
                            onBlur={handleBlur}
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

                {/* Department & Role */}
                <Grid item xs={12}>
                  <Paper elevation={0} sx={sectionPaperSx}>
                    {sectionTitle(
                      <ApartmentOutlinedIcon fontSize="small" />,
                      "Organization Mapping",
                      "Link the opening to its department and internal role"
                    )}

                    <Grid container spacing={2.5}>
                      <Grid item xs={12} md={6}>
                        <FormControl
                          fullWidth
                          variant="filled"
                          error={!!touched.department_id && !!errors.department_id}
                          sx={fieldSx}
                        >
                          <InputLabel id="department-label">Department</InputLabel>
                          <Select
                            labelId="department-label"
                            name="department_id"
                            value={values.department_id}
                            onChange={handleChange}
                            onBlur={handleBlur}
                          >
                            <MenuItem value="">
                              <em>None</em>
                            </MenuItem>
                            {departments.map((dept) => (
                              <MenuItem key={dept.id} value={String(dept.id)}>
                                {dept.name}
                              </MenuItem>
                            ))}
                          </Select>
                          {touched.department_id && errors.department_id && (
                            <FormHelperText>{errors.department_id}</FormHelperText>
                          )}
                        </FormControl>
                      </Grid>

                      <Grid item xs={12} md={6}>
                        <FormControl
                          fullWidth
                          variant="filled"
                          error={!!touched.job_title_id && !!errors.job_title_id}
                          sx={fieldSx}
                        >
                          <InputLabel id="jobtitle-label">Internal Role</InputLabel>
                          <Select
                            labelId="jobtitle-label"
                            name="job_title_id"
                            value={values.job_title_id}
                            onChange={handleChange}
                            onBlur={handleBlur}
                          >
                            <MenuItem value="">
                              <em>None</em>
                            </MenuItem>
                            {jobTitles.map((title) => (
                              <MenuItem key={title.id} value={String(title.id)}>
                                {title.name}
                              </MenuItem>
                            ))}
                          </Select>
                          {touched.job_title_id && errors.job_title_id && (
                            <FormHelperText>{errors.job_title_id}</FormHelperText>
                          )}
                        </FormControl>
                      </Grid>
                    </Grid>
                  </Paper>
                </Grid>

                {/* Description */}
                <Grid item xs={12}>
                  <Paper elevation={0} sx={sectionPaperSx}>
                    {sectionTitle(
                      <DescriptionOutlinedIcon fontSize="small" />,
                      "Job Description",
                      "Define the responsibilities, expectations, and requirements"
                    )}

                    <TextField
                      fullWidth
                      variant="filled"
                      label="Description / Requirements"
                      name="description"
                      value={values.description}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      multiline
                      rows={7}
                      error={!!touched.description && !!errors.description}
                      helperText={touched.description && errors.description}
                      sx={fieldSx}
                    />
                  </Paper>
                </Grid>

                {/* Dates & Capacity */}
                <Grid item xs={12}>
                  <Paper elevation={0} sx={sectionPaperSx}>
                    {sectionTitle(
                      <EventOutlinedIcon fontSize="small" />,
                      "Hiring Details & Dates",
                      "Set capacity and the recruitment timeline"
                    )}

                    <Grid container spacing={2.5}>
                      <Grid item xs={12} md={4}>
                        <TextField
                          fullWidth
                          variant="filled"
                          label="Positions to Fill"
                          name="positions_to_fill"
                          type="number"
                          value={values.positions_to_fill}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          error={
                            !!touched.positions_to_fill &&
                            !!errors.positions_to_fill
                          }
                          helperText={
                            touched.positions_to_fill && errors.positions_to_fill
                          }
                          inputProps={{ min: 1 }}
                          sx={fieldSx}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <GroupsOutlinedIcon fontSize="small" />
                              </InputAdornment>
                            ),
                          }}
                        />
                      </Grid>

                      <Grid item xs={12} md={4}>
                        <Field name="posted_date">
                          {({ field, form, meta }) => (
                            <DatePicker
                              label="Posted Date"
                              value={field.value ? DateTime.fromJSDate(field.value) : null}
                              onChange={(date) =>
                                form.setFieldValue(
                                  field.name,
                                  date ? date.toJSDate() : null
                                )
                              }
                              format="dd/MM/yyyy"
                              slotProps={{
                                textField: {
                                  fullWidth: true,
                                  variant: "filled",
                                  onBlur: field.onBlur,
                                  error: meta.touched && !!meta.error,
                                  helperText: meta.touched && meta.error,
                                  sx: fieldSx,
                                },
                              }}
                            />
                          )}
                        </Field>
                      </Grid>

                      <Grid item xs={12} md={4}>
                        <Field name="closing_date">
                          {({ field, form, meta }) => (
                            <DatePicker
                              label="Closing Date"
                              value={field.value ? DateTime.fromJSDate(field.value) : null}
                              onChange={(date) =>
                                form.setFieldValue(
                                  field.name,
                                  date ? date.toJSDate() : null
                                )
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
                                  variant: "filled",
                                  onBlur: field.onBlur,
                                  error: meta.touched && !!meta.error,
                                  helperText: meta.touched && meta.error,
                                  sx: fieldSx,
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

              <Paper
                elevation={0}
                sx={{
                  mt: 3,
                  p: 2,
                  borderRadius: "18px",
                  backgroundColor:
                    theme.palette.mode === "dark"
                      ? colors.primary[400]
                      : colors.primary[100],
                  border: `1px solid ${
                    theme.palette.mode === "dark"
                      ? colors.grey[700]
                      : colors.grey[800]
                  }`,
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
                        fontWeight: 800,
                        color: colors.grey[100],
                      }}
                    >
                      {isEdit ? "Ready to update this opening?" : "Ready to create this opening?"}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        color:
                          theme.palette.mode === "dark"
                            ? colors.grey[300]
                            : colors.grey[500],
                      }}
                    >
                      Review the details and save the recruitment record.
                    </Typography>
                  </Box>

                  <Stack direction="row" spacing={1.5}>
                    <Button
                      variant="outlined"
                      onClick={() => navigate("/recruitment/openings")}
                      sx={{
                        borderRadius: "12px",
                        px: 2.5,
                        py: 1.1,
                        textTransform: "none",
                        fontWeight: 700,
                      }}
                    >
                      Cancel
                    </Button>

                    <Button
                      type="submit"
                      color="secondary"
                      variant="contained"
                      disabled={loading || isSubmitting}
                      sx={{
                        px: 3.5,
                        py: 1.15,
                        borderRadius: "12px",
                        fontWeight: 800,
                        textTransform: "none",
                        boxShadow: "none",
                      }}
                    >
                      {loading ? (
                        <CircularProgress size={22} color="inherit" />
                      ) : isEdit ? (
                        "Update Opening"
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
            sx={{ width: "100%" }}
          >
            {success}
          </Alert>
        </Snackbar>
      </Box>
    </LocalizationProvider>
  );
};

export default EditJobOpeningForm;