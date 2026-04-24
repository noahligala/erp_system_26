import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  TextField,
  CircularProgress,
  Alert,
  Divider,
  useTheme,
  Chip,
  Stack,
  Avatar,
  InputAdornment,
  Grid,
} from "@mui/material";
import {
  ArrowBackOutlined,
  CloudUploadOutlined,
  CheckCircleOutline,
  WorkOutline,
  LocationOnOutlined,
  AccessTimeOutlined,
  EmailOutlined,
  PhoneOutlined,
  PersonOutline,
  DescriptionOutlined,
  BusinessCenterOutlined,
  CalendarTodayOutlined,
  ApartmentOutlined,
  AssignmentOutlined,
} from "@mui/icons-material";
import { Formik } from "formik";
import * as yup from "yup";
import { DateTime } from "luxon";
import { apiClient } from "../../../api/apiClient";
import { tokens } from "../../../theme";

const JobApply = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const { companyId, jobId } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");

  useEffect(() => {
    if (!companyId || !jobId) {
      setLoading(false);
      return;
    }

    const fetchJobDetails = async () => {
      try {
        const response = await apiClient.get(`/public/companies/${companyId}/jobs/${jobId}`);
        if (response.data?.status === "success") {
          setJob(response.data.data);
        } else {
          setJob(null);
        }
      } catch (err) {
        setError("Could not load job details. It may have been closed.");
        setJob(null);
      } finally {
        setLoading(false);
      }
    };

    fetchJobDetails();
  }, [companyId, jobId]);

  const validationSchema = yup.object({
    first_name: yup.string().required("First name is required"),
    last_name: yup.string().required("Last name is required"),
    email: yup.string().email("Invalid email format").required("Email is required"),
    phone: yup.string().required("Phone number is required"),
    resume: yup
      .mixed()
      .required("A resume is required")
      .test("fileSize", "File too large (Max 5MB)", (value) => value && value.size <= 5 * 1024 * 1024)
      .test(
        "fileType",
        "Unsupported format",
        (value) =>
          value &&
          [
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          ].includes(value.type)
      ),
  });

  const handleApply = async (values) => {
    setSubmitting(true);
    setError("");

    const formData = new FormData();
    formData.append("company_id", companyId);
    formData.append("job_opening_id", jobId);
    formData.append("first_name", values.first_name);
    formData.append("last_name", values.last_name);
    formData.append("email", values.email);
    formData.append("phone", values.phone);
    formData.append("source", "Careers Website");
    formData.append("resume", values.resume);

    try {
      const response = await apiClient.post(`/public/apply`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (response.data?.status === "success") {
        setSuccess(true);
      } else {
        setError("Something went wrong submitting your application.");
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Something went wrong submitting your application."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const getRelativeTime = (dateString) => {
    if (!dateString) return "Recently posted";
    const dt = DateTime.fromISO(dateString);
    return dt.isValid ? dt.toRelative() || "Recently posted" : "Recently posted";
  };

  const getJobImage = (job) =>
    job?.image ||
    job?.image_url ||
    job?.cover_image ||
    job?.banner_image ||
    job?.background_image ||
    null;

  const sectionPaper = {
    borderRadius: "24px",
    backgroundColor:
      theme.palette.mode === "dark" ? colors.primary[400] : colors.primary[100],
    border: `1px solid ${
      theme.palette.mode === "dark" ? colors.grey[700] : colors.grey[800]
    }`,
    boxShadow:
      theme.palette.mode === "dark"
        ? "0 16px 34px rgba(0,0,0,0.26)"
        : "0 16px 34px rgba(15,23,42,0.08)",
  };

  const fieldSx = {
    "& .MuiOutlinedInput-root": {
      borderRadius: "14px",
      backgroundColor:
        theme.palette.mode === "dark" ? colors.primary[500] : colors.primary[200],
      "& fieldset": {
        borderColor: theme.palette.mode === "dark" ? colors.grey[700] : colors.grey[700],
      },
      "&:hover fieldset": {
        borderColor: colors.greenAccent[500],
      },
      "&.Mui-focused fieldset": {
        borderColor: colors.greenAccent[500],
      },
    },
  };

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          backgroundColor:
            theme.palette.mode === "dark" ? colors.primary[500] : "#f9f9f9",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 2,
        }}
      >
        <CircularProgress sx={{ color: colors.greenAccent[500] }} />
        <Typography
          variant="h5"
          sx={{
            color:
              theme.palette.mode === "dark" ? colors.grey[200] : colors.grey[400],
          }}
        >
          Loading application page...
        </Typography>
      </Box>
    );
  }

  if (!job) {
    return (
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Alert severity="error" sx={{ borderRadius: 3 }}>
          {error || "Job not found."}
        </Alert>
      </Container>
    );
  }

  if (success) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          backgroundColor:
            theme.palette.mode === "dark" ? colors.primary[500] : "#f9f9f9",
          py: 8,
          display: "flex",
          alignItems: "center",
        }}
      >
        <Container maxWidth="sm">
          <Paper elevation={0} sx={{ ...sectionPaper, p: { xs: 4, md: 5 }, textAlign: "center" }}>
            <Avatar
              sx={{
                width: 84,
                height: 84,
                mx: "auto",
                mb: 3,
                backgroundColor: colors.greenAccent[500],
                color: theme.palette.mode === "dark" ? colors.primary[900] : "#fff",
              }}
            >
              <CheckCircleOutline sx={{ fontSize: 44 }} />
            </Avatar>

            <Typography
              variant="h3"
              sx={{
                fontWeight: 800,
                mb: 1.5,
                color: colors.grey[100],
              }}
            >
              Application Submitted
            </Typography>

            <Typography
              variant="body1"
              sx={{
                color:
                  theme.palette.mode === "dark" ? colors.grey[300] : colors.grey[500],
                lineHeight: 1.8,
                mb: 4,
              }}
            >
              Thank you for applying to the <strong>{job.title}</strong> position.
              Your application has been received and will be reviewed by the hiring team.
            </Typography>

            <Button
              variant="contained"
              onClick={() => navigate(`/careers/${companyId}`)}
              sx={{
                borderRadius: "12px",
                px: 3,
                py: 1.2,
                textTransform: "none",
                fontWeight: 800,
                backgroundColor: colors.greenAccent[500],
                color: theme.palette.mode === "dark" ? colors.primary[900] : "#fff",
                "&:hover": {
                  backgroundColor: colors.greenAccent[600],
                },
              }}
            >
              Back to Careers
            </Button>
          </Paper>
        </Container>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        backgroundColor:
          theme.palette.mode === "dark" ? colors.primary[500] : "#f9f9f9",
        pb: 8,
      }}
    >
      {/* HERO */}
      <Box
        sx={{
          position: "relative",
          overflow: "hidden",
          pt: { xs: 7, md: 9 },
          pb: { xs: 10, md: 12 },
          background: getJobImage(job)
            ? `linear-gradient(to bottom, rgba(0,0,0,0.34), rgba(0,0,0,0.56)), url(${getJobImage(job)})`
            : theme.palette.mode === "dark"
            ? `linear-gradient(135deg, ${colors.primary[400]} 0%, ${colors.primary[600]} 100%)`
            : `linear-gradient(135deg, ${colors.blueAccent[700]} 0%, ${colors.blueAccent[500]} 100%)`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            opacity: getJobImage(job) ? 0 : 0.08,
            backgroundImage:
              "radial-gradient(circle at 20% 20%, white 0, transparent 22%), radial-gradient(circle at 80% 30%, white 0, transparent 18%), radial-gradient(circle at 50% 80%, white 0, transparent 20%)",
          }}
        />

        <Container maxWidth="lg" sx={{ position: "relative", zIndex: 1 }}>
          <Button
            startIcon={<ArrowBackOutlined />}
            onClick={() => navigate(`/careers/${companyId}`)}
            sx={{
              mb: 3,
              color: "#fff",
              textTransform: "none",
              fontWeight: 700,
              borderRadius: "10px",
              backgroundColor: "rgba(255,255,255,0.10)",
              px: 1.5,
              "&:hover": {
                backgroundColor: "rgba(255,255,255,0.16)",
              },
            }}
          >
            Back to all jobs
          </Button>

          <Stack spacing={2}>
            <Chip
              label="Application"
              sx={{
                width: "fit-content",
                backgroundColor: "rgba(255,255,255,0.12)",
                color: "#fff",
                fontWeight: 800,
                borderRadius: "999px",
              }}
            />

            <Typography
              variant="h2"
              sx={{
                color: "#fff",
                fontWeight: 800,
                lineHeight: 1.05,
                letterSpacing: "-0.03em",
                maxWidth: "900px",
              }}
            >
              Apply for {job.title}
            </Typography>

            <Typography
              variant="body1"
              sx={{
                color: "rgba(255,255,255,0.9)",
                maxWidth: "760px",
                lineHeight: 1.8,
              }}
            >
              Review the role details below, then complete the application form to submit your profile.
            </Typography>

            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {job.department && (
                <Chip
                  icon={<WorkOutline sx={{ color: "#fff !important" }} />}
                  label={job.department}
                  sx={{
                    backgroundColor: "rgba(255,255,255,0.12)",
                    color: "#fff",
                    fontWeight: 700,
                  }}
                />
              )}
              {job.location && (
                <Chip
                  icon={<LocationOnOutlined sx={{ color: "#fff !important" }} />}
                  label={job.location}
                  sx={{
                    backgroundColor: "rgba(255,255,255,0.12)",
                    color: "#fff",
                    fontWeight: 700,
                  }}
                />
              )}
              {job.type && (
                <Chip
                  icon={<BusinessCenterOutlined sx={{ color: "#fff !important" }} />}
                  label={job.type}
                  sx={{
                    backgroundColor: "rgba(255,255,255,0.12)",
                    color: "#fff",
                    fontWeight: 700,
                  }}
                />
              )}
              <Chip
                icon={<AccessTimeOutlined sx={{ color: "#fff !important" }} />}
                label={getRelativeTime(job.created_at)}
                sx={{
                  backgroundColor: "rgba(255,255,255,0.12)",
                  color: "#fff",
                  fontWeight: 700,
                }}
              />
            </Stack>
          </Stack>
        </Container>
      </Box>

      <Container
        maxWidth="lg"
        sx={{
          mt: { xs: -4, md: -6 },
          position: "relative",
          zIndex: 2,
        }}
      >
        <Stack spacing={4}>
          {/* JOB DETAILS */}
          <Paper
            elevation={0}
            sx={{
              ...sectionPaper,
              p: { xs: 3, md: 4 },
            }}
          >
            <Stack spacing={3}>
              <Box>
                <Typography
                  variant="h4"
                  sx={{
                    fontWeight: 800,
                    mb: 1,
                    color: colors.grey[100],
                  }}
                >
                  Job Details
                </Typography>
                <Typography
                  variant="body1"
                  sx={{
                    color:
                      theme.palette.mode === "dark" ? colors.grey[300] : colors.grey[500],
                    lineHeight: 1.8,
                  }}
                >
                  Full role overview and application information.
                </Typography>
              </Box>

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      borderRadius: "18px",
                      backgroundColor:
                        theme.palette.mode === "dark" ? colors.primary[500] : colors.primary[200],
                      border: `1px solid ${
                        theme.palette.mode === "dark" ? colors.grey[700] : colors.grey[800]
                      }`,
                      height: "100%",
                    }}
                  >
                    <Stack spacing={1}>
                      <ApartmentOutlined sx={{ color: colors.greenAccent[500] }} />
                      <Typography variant="caption" sx={{ color: colors.grey[400], fontWeight: 700 }}>
                        Department
                      </Typography>
                      <Typography variant="body1" sx={{ color: colors.grey[100], fontWeight: 700 }}>
                        {job.department || "General"}
                      </Typography>
                    </Stack>
                  </Paper>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      borderRadius: "18px",
                      backgroundColor:
                        theme.palette.mode === "dark" ? colors.primary[500] : colors.primary[200],
                      border: `1px solid ${
                        theme.palette.mode === "dark" ? colors.grey[700] : colors.grey[800]
                      }`,
                      height: "100%",
                    }}
                  >
                    <Stack spacing={1}>
                      <LocationOnOutlined sx={{ color: colors.greenAccent[500] }} />
                      <Typography variant="caption" sx={{ color: colors.grey[400], fontWeight: 700 }}>
                        Location
                      </Typography>
                      <Typography variant="body1" sx={{ color: colors.grey[100], fontWeight: 700 }}>
                        {job.location || "Not specified"}
                      </Typography>
                    </Stack>
                  </Paper>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      borderRadius: "18px",
                      backgroundColor:
                        theme.palette.mode === "dark" ? colors.primary[500] : colors.primary[200],
                      border: `1px solid ${
                        theme.palette.mode === "dark" ? colors.grey[700] : colors.grey[800]
                      }`,
                      height: "100%",
                    }}
                  >
                    <Stack spacing={1}>
                      <BusinessCenterOutlined sx={{ color: colors.greenAccent[500] }} />
                      <Typography variant="caption" sx={{ color: colors.grey[400], fontWeight: 700 }}>
                        Employment Type
                      </Typography>
                      <Typography variant="body1" sx={{ color: colors.grey[100], fontWeight: 700 }}>
                        {job.type || "Not specified"}
                      </Typography>
                    </Stack>
                  </Paper>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      borderRadius: "18px",
                      backgroundColor:
                        theme.palette.mode === "dark" ? colors.primary[500] : colors.primary[200],
                      border: `1px solid ${
                        theme.palette.mode === "dark" ? colors.grey[700] : colors.grey[800]
                      }`,
                      height: "100%",
                    }}
                  >
                    <Stack spacing={1}>
                      <CalendarTodayOutlined sx={{ color: colors.greenAccent[500] }} />
                      <Typography variant="caption" sx={{ color: colors.grey[400], fontWeight: 700 }}>
                        Posted
                      </Typography>
                      <Typography variant="body1" sx={{ color: colors.grey[100], fontWeight: 700 }}>
                        {getRelativeTime(job.created_at)}
                      </Typography>
                    </Stack>
                  </Paper>
                </Grid>
              </Grid>

              <Divider
                sx={{
                  borderColor:
                    theme.palette.mode === "dark" ? colors.grey[700] : colors.grey[800],
                }}
              />

              <Box>
                <Stack direction="row" spacing={1.2} alignItems="center" mb={1.5}>
                  <AssignmentOutlined sx={{ color: colors.greenAccent[500] }} />
                  <Typography
                    variant="h5"
                    sx={{
                      fontWeight: 800,
                      color: colors.grey[100],
                    }}
                  >
                    Job Description
                  </Typography>
                </Stack>

                <Typography
                  variant="body1"
                  sx={{
                    color:
                      theme.palette.mode === "dark" ? colors.grey[300] : colors.grey[500],
                    lineHeight: 1.95,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {job.description || "No job description provided."}
                </Typography>
              </Box>
            </Stack>
          </Paper>

          {/* APPLICATION FORM */}
          <Paper
            elevation={0}
            sx={{
              ...sectionPaper,
              p: { xs: 3, md: 4 },
            }}
          >
            <Stack spacing={3}>
              <Box>
                <Typography
                  variant="h4"
                  sx={{
                    fontWeight: 800,
                    mb: 0.75,
                    color: colors.grey[100],
                  }}
                >
                  Submit Your Application
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color:
                      theme.palette.mode === "dark" ? colors.grey[300] : colors.grey[500],
                  }}
                >
                  Fill in your details below and upload your resume.
                </Typography>
              </Box>

              {error && (
                <Alert severity="error" sx={{ borderRadius: 2.5 }}>
                  {error}
                </Alert>
              )}

              <Formik
                initialValues={{
                  first_name: "",
                  last_name: "",
                  email: "",
                  phone: "",
                  resume: null,
                }}
                validationSchema={validationSchema}
                onSubmit={handleApply}
              >
                {({
                  values,
                  errors,
                  touched,
                  handleChange,
                  handleBlur,
                  handleSubmit,
                  setFieldValue,
                }) => (
                  <form onSubmit={handleSubmit}>
                    <Grid container spacing={2.2}>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="First Name"
                          name="first_name"
                          value={values.first_name}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          error={!!touched.first_name && !!errors.first_name}
                          helperText={touched.first_name && errors.first_name}
                          sx={fieldSx}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <PersonOutline
                                  sx={{
                                    color:
                                      theme.palette.mode === "dark"
                                        ? colors.grey[300]
                                        : colors.grey[500],
                                  }}
                                />
                              </InputAdornment>
                            ),
                          }}
                        />
                      </Grid>

                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="Last Name"
                          name="last_name"
                          value={values.last_name}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          error={!!touched.last_name && !!errors.last_name}
                          helperText={touched.last_name && errors.last_name}
                          sx={fieldSx}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <PersonOutline
                                  sx={{
                                    color:
                                      theme.palette.mode === "dark"
                                        ? colors.grey[300]
                                        : colors.grey[500],
                                  }}
                                />
                              </InputAdornment>
                            ),
                          }}
                        />
                      </Grid>

                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="Email Address"
                          name="email"
                          type="email"
                          value={values.email}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          error={!!touched.email && !!errors.email}
                          helperText={touched.email && errors.email}
                          sx={fieldSx}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <EmailOutlined
                                  sx={{
                                    color:
                                      theme.palette.mode === "dark"
                                        ? colors.grey[300]
                                        : colors.grey[500],
                                  }}
                                />
                              </InputAdornment>
                            ),
                          }}
                        />
                      </Grid>

                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="Phone Number"
                          name="phone"
                          value={values.phone}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          error={!!touched.phone && !!errors.phone}
                          helperText={touched.phone && errors.phone}
                          sx={fieldSx}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <PhoneOutlined
                                  sx={{
                                    color:
                                      theme.palette.mode === "dark"
                                        ? colors.grey[300]
                                        : colors.grey[500],
                                  }}
                                />
                              </InputAdornment>
                            ),
                          }}
                        />
                      </Grid>

                      <Grid item xs={12}>
                        <Box
                          sx={{
                            border: `1.5px dashed ${
                              touched.resume && errors.resume
                                ? theme.palette.error.main
                                : colors.greenAccent[500]
                            }`,
                            borderRadius: "18px",
                            p: { xs: 2.2, md: 3 },
                            backgroundColor:
                              theme.palette.mode === "dark"
                                ? "rgba(76, 206, 172, 0.04)"
                                : "rgba(35, 168, 37, 0.05)",
                          }}
                        >
                          <Stack spacing={1.5} alignItems="center" textAlign="center">
                            <Avatar
                              sx={{
                                width: 56,
                                height: 56,
                                backgroundColor: colors.greenAccent[500],
                                color:
                                  theme.palette.mode === "dark"
                                    ? colors.primary[900]
                                    : "#fff",
                              }}
                            >
                              <DescriptionOutlined />
                            </Avatar>

                            <Box>
                              <Typography
                                variant="body1"
                                sx={{
                                  fontWeight: 700,
                                  color: colors.grey[100],
                                }}
                              >
                                {fileName ? fileName : "Upload Resume"}
                              </Typography>
                              <Typography
                                variant="caption"
                                sx={{
                                  color:
                                    theme.palette.mode === "dark"
                                      ? colors.grey[300]
                                      : colors.grey[500],
                                }}
                              >
                                PDF, DOC, or DOCX up to 5MB
                              </Typography>
                            </Box>

                            <Button
                              variant="outlined"
                              component="label"
                              startIcon={<CloudUploadOutlined />}
                              sx={{
                                borderRadius: "12px",
                                textTransform: "none",
                                fontWeight: 700,
                                borderColor: colors.greenAccent[500],
                                color: colors.greenAccent[500],
                                "&:hover": {
                                  borderColor: colors.greenAccent[600],
                                  backgroundColor:
                                    theme.palette.mode === "dark"
                                      ? "rgba(76, 206, 172, 0.08)"
                                      : "rgba(35, 168, 37, 0.08)",
                                },
                              }}
                            >
                              Choose File
                              <input
                                type="file"
                                hidden
                                ref={fileInputRef}
                                accept=".pdf,.doc,.docx"
                                onChange={(e) => {
                                  const file = e.currentTarget.files[0];
                                  setFieldValue("resume", file || null);
                                  setFileName(file ? file.name : "");
                                }}
                              />
                            </Button>

                            {touched.resume && errors.resume && (
                              <Typography variant="caption" color="error">
                                {errors.resume}
                              </Typography>
                            )}
                          </Stack>
                        </Box>
                      </Grid>

                      <Grid item xs={12}>
                        <Paper
                          elevation={0}
                          sx={{
                            p: 2,
                            borderRadius: "16px",
                            backgroundColor:
                              theme.palette.mode === "dark"
                                ? colors.primary[500]
                                : colors.primary[200],
                            border: `1px solid ${
                              theme.palette.mode === "dark"
                                ? colors.grey[700]
                                : colors.grey[800]
                            }`,
                          }}
                        >
                          <Stack spacing={0.8}>
                            <Typography variant="body2" sx={{ color: colors.grey[100], fontWeight: 700 }}>
                              Before you submit
                            </Typography>
                            <Typography variant="caption" sx={{ color: colors.grey[400] }}>
                              • Ensure your contact details are correct.
                            </Typography>
                            <Typography variant="caption" sx={{ color: colors.grey[400] }}>
                              • Use a clear and up-to-date resume.
                            </Typography>
                            <Typography variant="caption" sx={{ color: colors.grey[400] }}>
                              • Only supported formats: PDF, DOC, DOCX.
                            </Typography>
                          </Stack>
                        </Paper>
                      </Grid>

                      <Grid item xs={12} sx={{ mt: 0.5 }}>
                        <Button
                          type="submit"
                          variant="contained"
                          fullWidth
                          disabled={submitting}
                          sx={{
                            borderRadius: "14px",
                            py: 1.35,
                            fontWeight: 800,
                            textTransform: "none",
                            fontSize: "0.98rem",
                            backgroundColor: colors.greenAccent[500],
                            color:
                              theme.palette.mode === "dark" ? colors.primary[900] : "#fff",
                            "&:hover": {
                              backgroundColor: colors.greenAccent[600],
                            },
                            "&.Mui-disabled": {
                              backgroundColor:
                                theme.palette.mode === "dark"
                                  ? colors.primary[300]
                                  : colors.grey[700],
                              color:
                                theme.palette.mode === "dark"
                                  ? colors.grey[500]
                                  : colors.grey[900],
                            },
                          }}
                        >
                          {submitting ? (
                            <CircularProgress size={22} color="inherit" />
                          ) : (
                            "Submit Application"
                          )}
                        </Button>
                      </Grid>
                    </Grid>
                  </form>
                )}
              </Formik>
            </Stack>
          </Paper>
        </Stack>
      </Container>
    </Box>
  );
};

export default JobApply;