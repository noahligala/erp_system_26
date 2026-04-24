import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Snackbar,
  Rating,
  Stepper,
  Step,
  StepLabel,
  Avatar,
} from "@mui/material";
import {
  WorkOutline,
  NotesOutlined,
  ArrowBackOutlined,
  DownloadOutlined,
  BadgeOutlined,
  PersonSearchOutlined,
  EventNoteOutlined,
  DoDisturbAltOutlined,
  HighlightOff,
  SendOutlined,
  PersonAddOutlined,
  BlockOutlined,
  AddCommentOutlined,
} from "@mui/icons-material";
import Header from "../../../components/Header";
import { tokens } from "../../../theme";
import { useAuth } from "../../../api/AuthProvider";
import { DateTime } from "luxon";

// --- Reusable Layout Components ---
const ProfileSection = ({ title, icon, children, action }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  return (
    <Paper elevation={2} sx={{ p: { xs: 2, md: 3 }, mb: 3, backgroundColor: colors.primary[400], borderRadius: "12px" }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Box display="flex" alignItems="center" gap={1.5}>
          {icon}
          <Typography variant="h5" fontWeight="600" color={colors.grey[100]}>
            {title}
          </Typography>
        </Box>
        {action && <Box>{action}</Box>}
      </Box>
      <Divider sx={{ mb: 3, borderColor: colors.primary[500] }} />
      <Grid container spacing={3}>
        {children}
      </Grid>
    </Paper>
  );
};

const DetailItem = ({ label, value, link }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  return (
    <Grid item xs={12} sm={6} md={4} display="flex" flexDirection="column">
      <Typography variant="body2" color={colors.grey[300]} sx={{ mb: 0.5 }}>
        {label}
      </Typography>
      {link ? (
        <Typography 
          component="a" 
          href={link} 
          variant="body1" 
          color={colors.blueAccent[300]} 
          sx={{ wordBreak: 'break-word', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
        >
          {value}
        </Typography>
      ) : (
        <Typography variant="body1" color={colors.grey[100]} sx={{ wordBreak: 'break-word' }}>
          {value}
        </Typography>
      )}
    </Grid>
  );
};

const ApplicantProfileView = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const { applicantId } = useParams();
  const { apiClient, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  const [applicant, setApplicant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [downloading, setDownloading] = useState(false);

  // Notes State & Ref for Auto-scrolling
  const [newNoteContent, setNewNoteContent] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const notesEndRef = useRef(null);

  // Rating State
  const [savingRating, setSavingRating] = useState(false);

  // Action Modals State
  const [actionModal, setActionModal] = useState({ open: false, type: "", title: "", text: "", targetStatus: "" });
  const [actionLoading, setActionLoading] = useState(false);

  const canManageRecruitment = user && ['MANAGER', 'ADMIN', 'OWNER'].includes(user.company_role);

  // Pipeline Steps
  const steps = ['Applied', 'Screening', 'Interviewing', 'Offer Extended', 'Hired'];
  const getActiveStep = (status) => {
    switch (status) {
      case 'new': return 0;
      case 'screening': return 1;
      case 'interviewing': return 2;
      case 'offer_extended': return 3;
      case 'offer_accepted': 
      case 'hired': return 4;
      default: return -1; 
    }
  };

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
        setError(err.response?.status === 404 ? "Applicant not found." : (err.response?.data?.message || err.message || "Could not load applicant details."));
      } finally {
        setLoading(false);
      }
    };
    fetchApplicant();
  }, [apiClient, isAuthenticated, applicantId]);

  // Auto-scroll to bottom of notes when notes change
  useEffect(() => {
    if (notesEndRef.current) {
      notesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [applicant?.notes]);

  // --- Actions ---

  const handleDownloadResume = async () => {
    if (!applicant?.resume_path) { setError("No resume file available for download."); return; }
    setDownloading(true); setError("");
    try {
        const response = await apiClient.get(`/applicants/${applicant.id}/resume`, { responseType: 'blob' });
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', applicant.resume_filename || `resume_${applicant.first_name}_${applicant.last_name}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.parentNode.removeChild(link);
        // Added small timeout to prevent browser download abortion
        setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } catch (err) {
        setError("Could not download resume.");
    } finally {
        setDownloading(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNoteContent.trim()) return;
    setSavingNotes(true);
    try {
      const timestamp = DateTime.now().toFormat('dd MMM yyyy, HH:mm');
      const author = user?.first_name ? `${user.first_name} ${user.last_name}` : "Recruiter";
      const formattedNewNote = `[${timestamp} - ${author}]: ${newNoteContent}`;
      
      const updatedNotes = applicant.notes ? `${applicant.notes}\n\n${formattedNewNote}` : formattedNewNote;

      const response = await apiClient.put(`/applicants/${applicantId}`, { 
        ...applicant, 
        notes: updatedNotes 
      });
      
      if (response.data?.status === "success") {
        setApplicant(prev => ({ ...prev, notes: updatedNotes }));
        setNewNoteContent("");
        setSuccessMsg("Note added successfully.");
      }
    } catch (err) {
      setError("Failed to add note.");
    } finally {
      setSavingNotes(false);
    }
  };

  const handleUpdateRating = async (event, newValue) => {
    setSavingRating(true);
    const updatedRating = newValue === null ? 0 : newValue;
    
    try {
      const response = await apiClient.put(`/applicants/${applicantId}`, { 
        ...applicant, 
        rating: updatedRating 
      });
      
      if (response.data?.status === "success") {
        setApplicant(prev => ({ ...prev, rating: updatedRating }));
        setSuccessMsg("Applicant ranking updated.");
      }
    } catch (err) {
      setError("Failed to update ranking.");
    } finally {
      setSavingRating(false);
    }
  };

  const handleStatusChange = async () => {
    setActionLoading(true);
    try {
      let endpoint = `/applicants/${applicantId}`;
      let payload = { ...applicant, status: actionModal.targetStatus };
      
      if (actionModal.targetStatus === 'hired') {
         endpoint = `/applicants/${applicantId}/hire`;
         await apiClient.post(endpoint); 
      } else {
         await apiClient.put(endpoint, payload);
      }

      setApplicant(prev => ({ ...prev, status: actionModal.targetStatus }));
      setActionModal({ ...actionModal, open: false });
      setSuccessMsg(`Status updated to ${actionModal.targetStatus.replace('_', ' ')}.`);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update status.");
    } finally {
      setActionLoading(false);
    }
  };

  const openActionModal = (type, title, text, targetStatus) => {
    setActionModal({ open: true, type, title, text, targetStatus });
  };

  // --- Formatting Helpers ---
  const formatDateTime = (dateTimeString) => {
    if (!dateTimeString) return "N/A";
    try {
      const dt = DateTime.fromISO(dateTimeString);
      return dt.isValid ? dt.toFormat('dd MMM yyyy, hh:mm a') : "Invalid DateTime";
    } catch { return "N/A"; }
  };

  // Helper to keep JSX clean by parsing notes outside the render block
  const parseNotes = (notesString) => {
    if (!notesString) return [];
    return notesString.split('\n\n').map(note => {
      const match = note.match(/^(\[.*?\]:)\s*(.*)/s);
      return match ? { header: match[1], body: match[2], original: note } : { body: note, original: note };
    });
  };

  // --- UI States ---
  if (loading) return <Box m="20px" display="flex" justifyContent="center" alignItems="center" height="50vh"><CircularProgress color="secondary" /></Box>;
  if (!applicant && !loading) return <Box m="20px"><Alert severity="warning">Applicant not found.</Alert><Button startIcon={<ArrowBackOutlined />} onClick={() => navigate('/recruitment/applicants')} sx={{ mt: 2 }}>Back to Tracking</Button></Box>;

  const isRejected = ['rejected', 'withdrawn'].includes(applicant.status);
  const parsedNotesList = parseNotes(applicant.notes);

  return (
    <Box m={{ xs: "10px", md: "20px" }}>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1} mb={3}>
        <Header title="APPLICANT PROFILE" subtitle={`Manage pipeline for ${applicant?.first_name} ${applicant?.last_name}`} />
        <Box display="flex" gap={1.5} flexWrap="wrap">
          <Button
            startIcon={<ArrowBackOutlined />}
            onClick={() => navigate(applicant?.job_opening_id ? `/recruitment/applicants/${applicant.job_opening_id}` : '/recruitment/openings')}
            color="secondary"
            variant="outlined"
          >
            Back
          </Button>
          
          {canManageRecruitment && !isRejected && (
            <>
              {applicant.status === 'new' && (
                <Button color="info" variant="contained" startIcon={<PersonSearchOutlined />} onClick={() => openActionModal('screen', 'Move to Screening', 'Mark this applicant as currently being screened?', 'screening')}>Screen</Button>
              )}
              {['new', 'screening'].includes(applicant.status) && (
                <Button color="secondary" variant="contained" startIcon={<EventNoteOutlined />} onClick={() => openActionModal('interview', 'Schedule Interview', 'Move this applicant to the Interviewing stage?', 'interviewing')}>Interview</Button>
              )}
              {['screening', 'interviewing'].includes(applicant.status) && (
                <Button color="warning" variant="contained" startIcon={<SendOutlined />} onClick={() => openActionModal('offer', 'Confirm Application & Send Offer', `Generate an offer letter and automatically send it to ${applicant.email}?`, 'offer_extended')}>Send Offer Letter</Button>
              )}
              {applicant.status === 'offer_extended' && (
                <Button color="success" variant="contained" startIcon={<PersonAddOutlined />} onClick={() => openActionModal('hire', 'Accept Offer & Transition to Employee', `Has the applicant accepted? This will transition ${applicant.first_name} into a verified Employee.`, 'hired')}>Accept & Hire</Button>
              )}
              <Button color="error" variant="outlined" startIcon={<BlockOutlined />} onClick={() => openActionModal('reject', 'Reject Applicant', 'Are you sure you want to reject this applicant? They will be removed from the active pipeline.', 'rejected')}>Reject</Button>
            </>
          )}
        </Box>
      </Box>

      {/* Visual Pipeline Stepper */}
      <Paper elevation={2} sx={{ p: 3, mb: 3, backgroundColor: colors.primary[400], borderRadius: "12px" }}>
        {isRejected ? (
           <Alert severity={applicant.status === 'rejected' ? 'error' : 'info'} variant="filled">
              Applicant is currently {applicant.status.toUpperCase()}.
           </Alert>
        ) : (
          <Stepper activeStep={getActiveStep(applicant.status)} alternativeLabel>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        )}
      </Paper>

      <Grid container spacing={3}>
        {/* Left Column - Details */}
        <Grid item xs={12} md={7} lg={8}>
          <ProfileSection title="Applicant Information" icon={<BadgeOutlined sx={{ color: colors.greenAccent[400], fontSize: "28px" }} />}>
            
            <Grid item xs={12} display="flex" alignItems="center" gap={2} mb={1}>
                <Avatar sx={{ bgcolor: colors.greenAccent[500], width: 56, height: 56, fontSize: "22px", fontWeight: "bold" }}>
                   {applicant.first_name?.[0]}{applicant.last_name?.[0]}
                </Avatar>
                <Box>
                  <Typography variant="h4" fontWeight="bold" color={colors.grey[100]}>
                    {applicant.first_name} {applicant.last_name}
                  </Typography>
                  <Typography variant="body2" color={colors.grey[300]}>
                    {applicant.job_opening?.title || 'General Application'}
                  </Typography>
                </Box>
            </Grid>

            <DetailItem label="Email Address" value={applicant.email} link={`mailto:${applicant.email}`} />
            <DetailItem label="Phone Number" value={applicant.phone || 'N/A'} link={applicant.phone ? `tel:${applicant.phone}` : null} />
            <DetailItem label="Date Applied" value={formatDateTime(applicant.created_at)} />
            
            <Grid item xs={12} sm={6} md={4}>
              <Typography variant="body2" color={colors.grey[300]} sx={{ mb: 0.5 }}>Applicant Ranking</Typography>
              <Rating 
                name="applicant-rating" 
                value={parseFloat(applicant.rating) || 0} 
                onChange={handleUpdateRating}
                disabled={!canManageRecruitment || savingRating}
                sx={{ color: colors.greenAccent[400] }}
              />
            </Grid>
          </ProfileSection>

          <ProfileSection title="Application Details" icon={<WorkOutline sx={{ color: colors.blueAccent[400], fontSize: "28px" }} />}>
            <DetailItem label="Applying For" value={applicant.job_opening?.title || 'N/A'} />
            <DetailItem label="Source" value={applicant.source || 'N/A'} />
            <Grid item xs={12} sm={6} md={4} display="flex" flexDirection="column">
              <Typography variant="body2" color={colors.grey[300]} sx={{ mb: 0.5 }}>Resume</Typography>
              {applicant.resume_path ? (
                <Button
                  startIcon={downloading ? <CircularProgress size={20} color="inherit" /> : <DownloadOutlined />}
                  onClick={handleDownloadResume}
                  disabled={downloading}
                  variant="outlined"
                  size="small"
                  sx={{ mt: 0.5, width: 'fit-content', borderColor: colors.grey[500], color: colors.grey[100] }}
                >
                  {applicant.resume_filename || 'Download Resume'}
                </Button>
              ) : (
                <Typography variant="body1" color={colors.grey[100]} component="span">No Resume Uploaded</Typography>
              )}
            </Grid>
          </ProfileSection>
        </Grid>

        {/* Right Column - Notes History */}
        <Grid item xs={12} md={5} lg={4}>
          <Paper elevation={2} sx={{ p: 3, height: '100%', backgroundColor: colors.primary[400], borderRadius: "12px", display: 'flex', flexDirection: 'column' }}>
             <Box display="flex" alignItems="center" gap={1.5} mb={2}>
                <NotesOutlined sx={{ color: colors.redAccent[400], fontSize: "28px" }} />
                <Typography variant="h5" fontWeight="600" color={colors.grey[100]}>Recruiter Notes</Typography>
             </Box>
             <Divider sx={{ mb: 2, borderColor: colors.primary[500] }} />

             {/* Display Existing Notes formatted */}
             <Box sx={{ flexGrow: 1, overflowY: 'auto', mb: 2, maxHeight: '400px', pr: 1 }}>
                {parsedNotesList.length > 0 ? (
                  parsedNotesList.map((note, index) => (
                    <Box key={index} sx={{ mb: 2, p: 1.5, backgroundColor: colors.primary[500], borderRadius: '8px' }}>
                      {note.header && (
                        <Typography variant="caption" color={colors.grey[400]} display="block" gutterBottom>
                          {note.header}
                        </Typography>
                      )}
                      <Typography variant="body2" color={colors.grey[100]} sx={{ whiteSpace: 'pre-wrap' }}>
                        {note.body}
                      </Typography>
                    </Box>
                  ))
                ) : (
                  <Typography variant="body2" color={colors.grey[400]} fontStyle="italic">No notes recorded yet.</Typography>
                )}
                {/* Empty div acting as the scroll target */}
                <div ref={notesEndRef} />
             </Box>

             {/* Add New Note Section */}
             {canManageRecruitment && (
               <Box mt="auto">
                  <TextField
                    fullWidth
                    multiline
                    minRows={2}
                    variant="outlined"
                    value={newNoteContent}
                    onChange={(e) => setNewNoteContent(e.target.value)}
                    placeholder="Add a new note..."
                    sx={{ backgroundColor: colors.primary[500] }}
                  />
                  <Box display="flex" justifyContent="flex-end" mt={1}>
                     <Button 
                        startIcon={savingNotes ? <CircularProgress size={16} color="inherit"/> : <AddCommentOutlined />} 
                        onClick={handleAddNote} 
                        color="secondary" 
                        variant="contained"
                        disabled={savingNotes || !newNoteContent.trim()}
                        size="small"
                     >
                        Add Note
                     </Button>
                  </Box>
               </Box>
             )}
          </Paper>
        </Grid>
      </Grid>

      {/* Dynamic Action Confirmation Modal */}
      <Dialog open={actionModal.open} onClose={() => setActionModal({ ...actionModal, open: false })}>
        <DialogTitle>{actionModal.title}</DialogTitle>
        <DialogContent>
          <DialogContentText>{actionModal.text}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActionModal({ ...actionModal, open: false })} color="inherit" disabled={actionLoading}>Cancel</Button>
          <Button 
            onClick={handleStatusChange} 
            color={actionModal.type === 'reject' ? 'error' : (actionModal.type === 'offer' ? 'warning' : 'success')} 
            variant="contained" 
            disabled={actionLoading}
          >
            {actionLoading ? <CircularProgress size={24} /> : "Confirm Action"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success Notifications */}
      <Snackbar open={!!successMsg} autoHideDuration={4000} onClose={() => setSuccessMsg("")} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setSuccessMsg("")} severity="success" variant="filled" sx={{ width: '100%' }}>{successMsg}</Alert>
      </Snackbar>
    </Box>
  );
};

export default ApplicantProfileView;