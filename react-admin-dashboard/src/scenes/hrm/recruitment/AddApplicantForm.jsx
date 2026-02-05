import { useState, useEffect, useRef } from "react";
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
import { Formik } from "formik";
import * as yup from "yup";
import Header from "../../../components/Header";
import { tokens } from "../../../theme";
import { useAuth } from "../../../api/AuthProvider";
import ArrowBackOutlinedIcon from "@mui/icons-material/ArrowBackOutlined";
import CloudUploadIcon from '@mui/icons-material/CloudUpload'; // For file input

const AddApplicantForm = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const navigate = useNavigate();
  const { jobId: preselectedJobId } = useParams(); // Optional pre-selected job from URL
  const { apiClient, isAuthenticated } = useAuth();
  const fileInputRef = useRef(null); // Ref for file input

  const [loading, setLoading] = useState(false); // Form submission loading
  const [dataLoading, setDataLoading] = useState(true); // Dropdown loading
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [jobOpenings, setJobOpenings] = useState([]);
  const [selectedFileName, setSelectedFileName] = useState(""); // Display selected file name

  // Fetch job openings for dropdown
  useEffect(() => {
    if (!isAuthenticated) {
      setError("Authentication required.");
      setDataLoading(false);
      return;
    }
    const fetchJobs = async () => {
      setDataLoading(true); setError("");
      try {
        const response = await apiClient.get("/job-openings", { params: { status: 'open', per_page: 500 } }); // Fetch open jobs
        if (response.data?.status === "success" && response.data.data) {
          setJobOpenings(response.data.data.data || []);
        }
      } catch (err) {
        console.error("Failed to load job openings:", err);
        setError("Could not load job openings.");
      } finally {
        setDataLoading(false);
      }
    };
    fetchJobs();
  }, [apiClient, isAuthenticated]);

  // Initial values
  const initialValues = {
    job_opening_id: preselectedJobId || "", // Pre-fill if available
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    source: "Manual Entry", // Default source
    status: "new",
    notes: "",
    resume: null, // For file object
  };

  // Validation Schema
  const validationSchema = yup.object({
    job_opening_id: yup.string().required("Job Opening is required"),
    first_name: yup.string().required("First name is required").max(255),
    last_name: yup.string().required("Last name is required").max(255),
    email: yup.string().email("Invalid email format").required("Email is required").max(255),
    phone: yup.string().nullable().max(20),
    source: yup.string().nullable().max(100),
    status: yup.string().required("Status is required").oneOf(['new', 'screening', 'interviewing', 'offer_extended', 'offer_accepted', 'hired', 'rejected', 'withdrawn']),
    notes: yup.string().nullable(),
    resume: yup.mixed().nullable() // Basic file validation (can add size/type checks)
        .test('fileSize', 'File too large (Max 5MB)', value => !value || (value && value.size <= 5 * 1024 * 1024))
        .test('fileType', 'Unsupported file type (PDF, DOC, DOCX only)', value => !value || (value && ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(value.type))),
  });

  // Form Submission (uses FormData for file upload)
  const handleFormSubmit = async (values, { setSubmitting, resetForm }) => {
    setError(""); setSuccess(""); setLoading(true);

    // --- Create FormData ---
    const formData = new FormData();
    Object.keys(values).forEach(key => {
        if (key === 'resume' && values.resume) {
            formData.append('resume', values.resume, values.resume.name); // Append file
        } else if (values[key] !== null && values[key] !== undefined) {
             formData.append(key, values[key]); // Append other fields
        }
    });
    // Log FormData entries for debugging if needed
    // for (let [key, value] of formData.entries()) { console.log(`${key}:`, value); }

    try {
      const response = await apiClient.post("/applicants", formData, {
        headers: {
          'Content-Type': 'multipart/form-data', // Important for file uploads
        },
      });

      if (response.data?.status === "success") {
        setSuccess(`Applicant ${values.first_name} ${values.last_name} added successfully!`);
        resetForm();
        setSelectedFileName(""); // Clear file name display
        if(fileInputRef.current) fileInputRef.current.value = ""; // Reset file input visually
        setTimeout(() => navigate(`/recruitment/applicants/${values.job_opening_id}`), 1500); // Redirect to applicants list for that job
      } else {
         if (response.data?.errors) {
            const errorMessages = Object.values(response.data.errors).flat().join('. ');
            throw new Error(errorMessages || 'Validation failed.');
        }
        throw new Error(response.data?.message || `Failed to add applicant.`);
      }
    } catch (err) {
      console.error("Applicant submission error:", err);
      setError(err.response?.data?.message || err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
      setSubmitting(false);
    }
  };

  if (dataLoading) { /* ... Loading indicator ... */ }

  return (
    <Box m={{ xs: "10px", md: "20px" }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Header title="ADD APPLICANT" subtitle="Manually enter a new candidate" />
            <Button
                startIcon={<ArrowBackOutlinedIcon />}
                onClick={() => navigate(preselectedJobId ? `/recruitment/applicants/${preselectedJobId}` : '/recruitment/openings')}
                sx={{ height: 'fit-content' }}
            >
                Back
            </Button>
        </Box>

        {error && !success && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

        <Paper elevation={2} sx={{ p: { xs: 2, md: 3 }, backgroundColor: colors.primary[400], borderRadius: "12px" }}>
          <Formik
            initialValues={initialValues}
            validationSchema={validationSchema}
            onSubmit={handleFormSubmit}
          >
            {({ values, errors, touched, handleBlur, handleChange, handleSubmit, setFieldValue, isSubmitting }) => (
              <form onSubmit={handleSubmit}>
                <Grid container spacing={3}>

                  {/* Job Opening */}
                  <Grid item xs={12}>
                    <Typography variant="h6" color={colors.grey[100]} sx={{ mb: 1 }}>Job Application</Typography>
                  </Grid>
                   <Grid item xs={12} md={6}>
                     <FormControl fullWidth variant="filled" error={!!touched.job_opening_id && !!errors.job_opening_id}>
                        <InputLabel id="job-opening-label">Applying For *</InputLabel>
                        <Select
                          labelId="job-opening-label" label="Applying For *" name="job_opening_id"
                          value={values.job_opening_id} onChange={handleChange} onBlur={handleBlur} required
                        >
                          <MenuItem value=""><em>Select Job Opening</em></MenuItem>
                          {jobOpenings.map((job) => <MenuItem key={job.id} value={job.id}>{job.title} (ID: {job.id})</MenuItem>)}
                        </Select>
                        {touched.job_opening_id && errors.job_opening_id && <FormHelperText>{errors.job_opening_id}</FormHelperText>}
                     </FormControl>
                   </Grid>
                   <Grid item xs={12} md={6}>
                       <FormControl fullWidth variant="filled" error={!!touched.status && !!errors.status}>
                           <InputLabel id="status-label">Initial Status *</InputLabel>
                           <Select
                               labelId="status-label" label="Initial Status *" name="status"
                               value={values.status} onChange={handleChange} onBlur={handleBlur} required
                           >
                               <MenuItem value="new">New</MenuItem>
                               <MenuItem value="screening">Screening</MenuItem>
                               {/* Add other relevant initial statuses */}
                           </Select>
                           {touched.status && errors.status && <FormHelperText>{errors.status}</FormHelperText>}
                       </FormControl>
                   </Grid>


                  {/* Applicant Details */}
                  <Grid item xs={12} sx={{ mt: 2 }}>
                    <Typography variant="h6" color={colors.grey[100]} sx={{ mb: 1 }}>Applicant Information</Typography>
                  </Grid>
                   <Grid item xs={12} sm={6}>
                     <TextField fullWidth variant="filled" label="First Name *" name="first_name"
                       value={values.first_name} onChange={handleChange} onBlur={handleBlur}
                       error={!!touched.first_name && !!errors.first_name} helperText={touched.first_name && errors.first_name} required
                     />
                   </Grid>
                   <Grid item xs={12} sm={6}>
                     <TextField fullWidth variant="filled" label="Last Name *" name="last_name"
                       value={values.last_name} onChange={handleChange} onBlur={handleBlur}
                       error={!!touched.last_name && !!errors.last_name} helperText={touched.last_name && errors.last_name} required
                     />
                   </Grid>
                    <Grid item xs={12} sm={6}>
                     <TextField fullWidth variant="filled" label="Email *" name="email" type="email"
                       value={values.email} onChange={handleChange} onBlur={handleBlur}
                       error={!!touched.email && !!errors.email} helperText={touched.email && errors.email} required
                     />
                   </Grid>
                   <Grid item xs={12} sm={6}>
                     <TextField fullWidth variant="filled" label="Phone" name="phone"
                       value={values.phone} onChange={handleChange} onBlur={handleBlur}
                       error={!!touched.phone && !!errors.phone} helperText={touched.phone && errors.phone}
                     />
                   </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField fullWidth variant="filled" label="Source" name="source"
                           value={values.source} onChange={handleChange} onBlur={handleBlur}
                           error={!!touched.source && !!errors.source} helperText={touched.source && errors.source}
                        />
                    </Grid>

                    {/* Resume Upload */}
                    <Grid item xs={12} sm={6} display="flex" alignItems="center">
                        <Button
                            variant="outlined"
                            component="label" // Makes the button act like a label for the hidden input
                            startIcon={<CloudUploadIcon />}
                            sx={{ mr: 2 }}
                        >
                            Upload Resume
                            <input
                                type="file"
                                hidden
                                ref={fileInputRef}
                                name="resume"
                                accept=".pdf,.doc,.docx" // Specify accepted types
                                onBlur={handleBlur} // Track touched state
                                onChange={(event) => {
                                    const file = event.currentTarget.files[0];
                                    setFieldValue("resume", file || null); // Set the file object in Formik state
                                    setSelectedFileName(file ? file.name : ""); // Update display name
                                }}
                            />
                        </Button>
                         <Typography variant="body2" color={colors.grey[300]} noWrap>
                           {selectedFileName || "No file selected"}
                         </Typography>
                         {/* Display file validation errors */}
                         {touched.resume && errors.resume && (
                           <FormHelperText error sx={{ ml: 2 }}>{errors.resume}</FormHelperText>
                         )}
                    </Grid>


                  {/* Notes */}
                  <Grid item xs={12} sx={{ mt: 2 }}>
                    <Typography variant="h6" color={colors.grey[100]} sx={{ mb: 1 }}>Notes</Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth variant="filled" label="Recruiter Notes" name="notes"
                      value={values.notes} onChange={handleChange} onBlur={handleBlur}
                      multiline rows={4}
                      error={!!touched.notes && !!errors.notes} helperText={touched.notes && errors.notes}
                      placeholder="Add any relevant notes about the candidate..."
                    />
                  </Grid>

                </Grid> {/* End Grid Container */}

                {/* Submit Button */}
                <Box display="flex" justifyContent="flex-end" mt={4}>
                  <Button type="submit" color="secondary" variant="contained" disabled={loading || isSubmitting || dataLoading} sx={{ px: 4, py: 1.2, fontWeight: 'bold' }}>
                    {loading ? <CircularProgress size={24} color="inherit" /> : "Add Applicant"}
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
    //</LocalizationProvider> // Removed - Not needed as no DatePicker here
  );
};

export default AddApplicantForm;