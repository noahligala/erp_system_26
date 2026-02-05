import { useState, useEffect, useCallback } from "react";
import { Link as RouterLink, useNavigate, useParams } from "react-router-dom";
import {
  Box,
  Typography,
  useTheme,
  Button,
  IconButton,
  Chip,
  CircularProgress,
  Alert,
  Tooltip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from "@mui/material";
import { DataGrid, GridToolbar } from "@mui/x-data-grid";
import {
  AddOutlined,
  VisibilityOutlined, // View Profile
  Refresh,
  PersonSearchOutlined, // Screening
  WorkOutline, // Hired
  DoDisturbAltOutlined, // Rejected
  EventNoteOutlined, // Interviewing
  FiberNewOutlined, // New
} from "@mui/icons-material";
import { HighlightOff } from "@mui/icons-material"; // Import HighlightOff
import { DateTime } from "luxon";
import Header from "../../../components/Header";
import { tokens } from "../../../theme";
import { useAuth } from "../../../api/AuthProvider";

const ApplicantTracking = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const navigate = useNavigate();
  const { jobId: jobIdFromParams } = useParams(); // Get optional jobId from URL
  const { apiClient, isAuthenticated, user } = useAuth();

  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [jobOpenings, setJobOpenings] = useState([]); // For filter dropdown
  const [selectedJobId, setSelectedJobId] = useState(jobIdFromParams || "all"); // Initialize with URL param or 'all'

  // Server-side pagination
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 20 });
  const [rowCount, setRowCount] = useState(0);

  // Check user permissions
  const canManageRecruitment = user && ['MANAGER', 'ADMIN', 'OWNER'].includes(user.company_role);

  // --- Fetch Job Openings for Filter ---
  const fetchJobOpeningsForFilter = useCallback(async () => {
     if (!isAuthenticated) return;
     try {
       // Fetch only open or recently closed jobs for relevance? Or all? Let's fetch all for now.
       const response = await apiClient.get("/job-openings", { params: { status: 'all', per_page: 500 } }); // Fetch many for dropdown
       if (response.data?.status === "success" && response.data.data) {
         setJobOpenings(response.data.data.data || []);
       }
     } catch (err) {
       console.error("Error fetching job openings for filter:", err);
       // Non-critical error, maybe show a small warning
     }
  }, [apiClient, isAuthenticated]);

  // --- Fetch Applicants ---
  const fetchApplicants = useCallback(async () => {
    if (!isAuthenticated) {
      setError("Authentication required.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const params = {
        page: paginationModel.page + 1,
        per_page: paginationModel.pageSize,
        job_opening_id: selectedJobId === 'all' ? undefined : selectedJobId, // Filter by job ID if selected
        // status: 'all', // Add status filter later if needed
      };
      const response = await apiClient.get("/applicants", { params });

      if (response.data?.status === "success" && response.data.data) {
        setApplicants(response.data.data.data || []);
        setRowCount(response.data.data.total || 0);
      } else {
        throw new Error(response.data?.message || "Failed to fetch applicants");
      }
    } catch (err) {
      console.error("Error fetching applicants:", err);
      setError(err.response?.data?.message || err.message || "Could not load applicants.");
      setApplicants([]);
      setRowCount(0);
    } finally {
      setLoading(false);
    }
  }, [apiClient, isAuthenticated, paginationModel, selectedJobId]); // Refetch when filter changes

  useEffect(() => {
    fetchJobOpeningsForFilter(); // Fetch jobs on mount
  }, [fetchJobOpeningsForFilter]);

  useEffect(() => {
    fetchApplicants(); // Fetch applicants on mount and when filters change
  }, [fetchApplicants]);

  // Update selectedJobId if URL parameter changes
   useEffect(() => {
     setSelectedJobId(jobIdFromParams || "all");
   }, [jobIdFromParams]);

  // --- Formatting Helpers ---
  const formatDateTime = (dateTimeString) => {
     if (!dateTimeString) return "N/A";
     try {
        const dt = DateTime.fromISO(dateTimeString);
        return dt.isValid ? dt.toFormat('dd MMM yyyy, hh:mm a') : "Invalid DateTime";
     } catch { return "N/A"; }
  };

  const getStatusChip = (status) => {
    let color = "default";
    let icon = null;
    switch (status) {
      case 'new': color = 'info'; icon = <FiberNewOutlined sx={{ fontSize: '1rem', mr: 0.5 }}/>; break;
      case 'screening': color = 'primary'; icon = <PersonSearchOutlined sx={{ fontSize: '1rem', mr: 0.5 }}/>; break;
      case 'interviewing': color = 'secondary'; icon = <EventNoteOutlined sx={{ fontSize: '1rem', mr: 0.5 }}/>; break;
      case 'offer_extended': color = 'success'; icon = <WorkOutline sx={{ fontSize: '1rem', mr: 0.5 }}/>; break;
      case 'offer_accepted': color = 'success'; icon = <WorkOutline sx={{ fontSize: '1rem', mr: 0.5 }}/>; break;
      case 'hired': color = 'success'; icon = <WorkOutline sx={{ fontSize: '1rem', mr: 0.5 }}/>; break;
      case 'rejected': color = 'error'; icon = <DoDisturbAltOutlined sx={{ fontSize: '1rem', mr: 0.5 }}/>; break;
      case 'withdrawn': color = 'default'; icon = <HighlightOff sx={{ fontSize: '1rem', mr: 0.5 }}/>; break;
      default: break;
    }
    return <Chip label={status} color={color} size="small" icon={icon} sx={{ textTransform: 'capitalize' }}/>;
  };

  // --- DataGrid Columns ---
  const columns = [
    { field: "id", headerName: "ID", width: 60 },
    {
        field: "name", headerName: "Applicant Name", width: 180,
        valueGetter: (params) => `${params.row.first_name || ''} ${params.row.last_name || ''}`.trim() || 'N/A',
        renderCell: (params) => ( // Make name clickable to profile
           <RouterLink
             to={`/recruitment/applicant-profile/${params.row.id}`}
             style={{ textDecoration: 'none', color: colors.greenAccent[300] }}
            >
             {params.value}
           </RouterLink>
        )
    },
    { field: "email", headerName: "Email", width: 200 },
    { field: "phone", headerName: "Phone", width: 130, valueGetter: (params) => params.value || 'N/A' },
    {
        field: "jobOpening", headerName: "Job Opening", width: 200,
        valueGetter: (params) => params.row.job_opening?.title || 'N/A',
    },
    { field: "source", headerName: "Source", width: 100, valueGetter: (params) => params.value || 'N/A' },
    {
      field: "status", headerName: "Status", width: 150, // Wider for icon+text
      renderCell: (params) => getStatusChip(params.value),
    },
    {
      field: "created_at", headerName: "Applied On", width: 160,
      valueFormatter: (params) => formatDateTime(params.value),
    },
    // Actions Column
    {
      field: "actions",
      headerName: "Actions",
      width: 100,
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      renderCell: (params) => (
        <Box display="flex" justifyContent="center" gap={0.5}>
           <Tooltip title="View Profile">
             <IconButton
               size="small"
               onClick={() => navigate(`/recruitment/applicant-profile/${params.row.id}`)}
               sx={{ color: colors.blueAccent[300] }}
             >
               <VisibilityOutlined fontSize="small" />
             </IconButton>
           </Tooltip>
           {/* Add Edit/Delete Later if needed, checking permissions */}
           {/* {canManageRecruitment && (
              <Tooltip title="Edit Applicant">...</Tooltip>
           )} */}
        </Box>
      ),
    },
  ];

  return (
    <Box m={{ xs: "10px", md: "20px" }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1} mb={2}>
        <Header title="APPLICANT TRACKING" subtitle="Manage candidates for job openings" />
        {canManageRecruitment && (
          <Button
            variant="contained"
            color="secondary"
            startIcon={<AddOutlined />}
            onClick={() => navigate(`/recruitment/add-applicant/${selectedJobId !== 'all' ? selectedJobId : ''}`)} // Pre-fill job ID if filtered
          >
            Add Applicant Manually
          </Button>
        )}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* --- Filter Controls --- */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <FormControl variant="filled" sx={{ minWidth: 250 }}>
          <InputLabel id="job-filter-label">Filter by Job Opening</InputLabel>
          <Select
            labelId="job-filter-label"
            value={selectedJobId}
            onChange={(e) => {
              const newJobId = e.target.value;
              setSelectedJobId(newJobId);
              setPaginationModel(prev => ({ ...prev, page: 0 })); // Reset page
              // Update URL without full page reload (optional but nice)
              navigate(`/recruitment/applicants${newJobId !== 'all' ? '/' + newJobId : ''}`, { replace: true });
            }}
            label="Filter by Job Opening"
          >
            <MenuItem value="all"><em>All Job Openings</em></MenuItem>
            {jobOpenings.map((job) => (
                <MenuItem key={job.id} value={job.id}>
                    {job.title} (ID: {job.id})
                </MenuItem>
            ))}
          </Select>
        </FormControl>
         <Tooltip title="Refresh Data">
            <IconButton onClick={fetchApplicants}>
                 <Refresh />
            </IconButton>
        </Tooltip>
      </Box>

      {/* --- Data Grid --- */}
      <Box height="75vh" sx={{ /* Grid styles from previous components */ }}>
        <DataGrid
          rows={applicants}
          columns={columns}
          loading={loading}
          rowCount={rowCount}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          pageSizeOptions={[20, 50, 100]}
          paginationMode="server"
          filterMode="server"
          getRowId={(row) => row.id}
          disableRowSelectionOnClick
          slots={{ toolbar: GridToolbar }}
          slotProps={{
            toolbar: { showQuickFilter: true, quickFilterProps: { debounceMs: 500 } },
          }}
          density="compact"
        />
      </Box>
    </Box>
  );
};

export default ApplicantTracking;