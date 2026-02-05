import { useState, useEffect } from "react";
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
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  PersonOutline,
  WorkOutline, // Using for Job Applied
  NotesOutlined, // Notes
  EditOutlined,
  ArrowBackOutlined,
  DownloadOutlined, // Resume download
  BadgeOutlined, // Applicant Icon
  FiberNewOutlined,
  PersonSearchOutlined,
  EventNoteOutlined,
  DoDisturbAltOutlined,
  HighlightOff,
} from "@mui/icons-material";
import Header from "../../../components/Header";
import { tokens } from "../../../theme";
import { useAuth } from "../../../api/AuthProvider";
import { DateTime } from "luxon";

// Reusable Section Component (copied from previous)
const ProfileSection = ({ title, icon, children }) => { /* ... Keep as is ... */ };
const DetailItem = ({ label, value }) => { /* ... Keep as is ... */ };

const ApplicantProfileView = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const { applicantId } = useParams(); // Get applicant ID from URL
  const { apiClient, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  const [applicant, setApplicant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false); // State for download button

  // Check user permissions
  const canManageRecruitment = user && ['MANAGER', 'ADMIN', 'OWNER'].includes(user.company_role);

  // Fetch Applicant Data
  useEffect(() => {
    if (!isAuthenticated || !applicantId) {
      setError("Authentication or Applicant ID missing.");
      setLoading(false); return;
    }
    const fetchApplicant = async () => {
      setLoading(true); setError("");
      try {
        const response = await apiClient.get(`/applicants/${applicantId}`);
        if (response.data?.status === "success") {
          setApplicant(response.data.data);
        } else {
          throw new Error(response.data?.message || "Failed to fetch applicant data");
        }
      } catch (err) {
        console.error("Error fetching applicant:", err);
        setError(err.response?.status === 404 ? "Applicant not found." : (err.response?.data?.message || err.message || "Could not load applicant details."));
      } finally {
        setLoading(false);
      }
    };
    fetchApplicant();
  }, [apiClient, isAuthenticated, applicantId]);

  // --- Formatting Helpers ---
   const formatDateTime = (dateTimeString) => { /* ... Keep as is ... */ };
   const getStatusChip = (status) => { /* ... Keep as is, copy from ApplicantTracking ... */ };


  // --- Resume Download Handler ---
  const handleDownloadResume = async () => {
    if (!applicant?.resume_path) {
        setError("No resume file available for download.");
        return;
    }
    setDownloading(true); setError("");
    try {
        // Make request expecting a blob (file) response
        const response = await apiClient.get(`/applicants/${applicant.id}/resume`, {
            responseType: 'blob', // Important!
        });

        // Create a URL for the blob
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        // Use the original filename stored in DB, or generate one
        const filename = applicant.resume_filename || `resume_${applicant.first_name}_${applicant.last_name}_${applicant.id}.pdf`; // Default to pdf extension maybe
        link.setAttribute('download', filename);

        // Append to html link element page
        document.body.appendChild(link);
        // Start download
        link.click();
        // Clean up and remove the link
        link.parentNode.removeChild(link);
        window.URL.revokeObjectURL(url);

    } catch (err) {
        console.error("Resume download error:", err);
        // Handle specific errors like 404 if file not found on server
        if (err.response?.status === 404) {
            setError("Resume file not found on server.");
        } else {
            setError("Could not download resume. " + (err.response?.data?.message || err.message));
        }
    } finally {
        setDownloading(false);
    }
  };


  if (loading) { /* ... Loading UI ... */ }
  if (error && !applicant) { /* ... Error UI (if applicant fetch failed critically) ... */ }
  if (!applicant && !loading) { /* ... Not Found UI ... */ }

  // Main Profile Display
  return (
    <Box m={{ xs: "10px", md: "20px" }}>
        {/* Show non-critical errors (e.g., failed download attempt) */}
       {error && applicant && (
            <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
       )}

      <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1} mb={3}>
        <Header title="APPLICANT PROFILE" subtitle={`Details for ${applicant?.first_name} ${applicant?.last_name}`} />
        <Box display="flex" gap={1}>
           <Button
            startIcon={<ArrowBackOutlined />}
            onClick={() => navigate(applicant?.job_opening_id ? `/recruitment/applicants/${applicant.job_opening_id}` : '/recruitment/openings')}
            color="secondary"
            variant="outlined"
          >
           Back to List
          </Button>
           {/* Add Edit Applicant Button later if needed */}
           {/* {canManageRecruitment && (
              <Button component={RouterLink} to={`/recruitment/edit-applicant/${applicantId}`} startIcon={<EditOutlined />} color="secondary" variant="contained"> Edit Applicant </Button>
           )} */}
        </Box>
      </Box>

      {/* Profile Sections */}
      {applicant && (
         <>
            <ProfileSection title="Applicant Information" icon={<BadgeOutlined sx={{ color: colors.greenAccent[400] }} />}>
                <DetailItem label="Full Name" value={`${applicant.first_name} ${applicant.last_name}`} />
                <DetailItem label="Email Address" value={applicant.email} />
                <DetailItem label="Phone Number" value={applicant.phone} />
                <DetailItem label="Source" value={applicant.source} />
                <DetailItem label="Date Applied" value={formatDateTime(applicant.created_at)} />
                 <DetailItem label="Current Status" value={getStatusChip(applicant.status)} />
            </ProfileSection>

             <ProfileSection title="Application Details" icon={<WorkOutline sx={{ color: colors.blueAccent[400] }} />}>
                 <DetailItem label="Applying For" value={applicant.job_opening?.title || 'N/A'} />
                 <Grid item xs={12} sm={6} md={4} display="flex" flexDirection="column">
                     <Typography variant="body2" color={colors.grey[300]} sx={{ mb: 0.5 }}>Resume</Typography>
                     {applicant.resume_path ? (
                        <Button
                            startIcon={downloading ? <CircularProgress size={20} color="inherit"/> : <DownloadOutlined />}
                            onClick={handleDownloadResume}
                            disabled={downloading}
                            variant="outlined"
                            size="small"
                            sx={{ mt: 0.5, width: 'fit-content' }}
                        >
                            {applicant.resume_filename || 'Download Resume'}
                        </Button>
                     ) : (
                         <Typography variant="body1" color={colors.grey[100]} component="span">No Resume Uploaded</Typography>
                     )}
                 </Grid>
            </ProfileSection>

            {/* Notes Section - Render conditionally if notes exist */}
            {(applicant.notes || canManageRecruitment) && ( // Show if notes exist OR if user can potentially add/edit notes
               <ProfileSection title="Recruiter Notes" icon={<NotesOutlined sx={{ color: colors.redAccent[400] }} />}>
                 <Grid item xs={12}>
                    <Typography variant="body1" color={colors.grey[100]} sx={{ whiteSpace: 'pre-wrap' }}>
                        {applicant.notes || (canManageRecruitment ? <i>No notes added yet.</i> : 'N/A')}
                    </Typography>
                    {/* Add Edit Notes functionality here later if needed */}
                 </Grid>
               </ProfileSection>
            )}
         </>
        )}
    </Box>
  );
};

export default ApplicantProfileView;