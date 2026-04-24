import { useState, useEffect, useCallback } from "react";
import { Link as RouterLink, useNavigate, useParams } from "react-router-dom";
import {
  Box,
  Button,
  IconButton,
  Chip,
  Alert,
  Tooltip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  useTheme,
  Rating,
} from "@mui/material";
import { DataGrid, GridToolbar } from "@mui/x-data-grid";
import {
  AddOutlined,
  VisibilityOutlined, 
  Refresh,
  PersonSearchOutlined, 
  WorkOutline, 
  DoDisturbAltOutlined, 
  EventNoteOutlined, 
  FiberNewOutlined, 
  HighlightOff, 
  SendOutlined,
} from "@mui/icons-material";
import { DateTime } from "luxon";
import Header from "../../../components/Header";
import { tokens } from "../../../theme";
import { useAuth } from "../../../api/AuthProvider";

const ApplicantTracking = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const navigate = useNavigate();
  const { jobId: jobIdFromParams } = useParams(); 
  const { apiClient, isAuthenticated, user } = useAuth();

  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [jobOpenings, setJobOpenings] = useState([]); 
  const [selectedJobId, setSelectedJobId] = useState(jobIdFromParams || "all"); 

  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 20 });
  const [rowCount, setRowCount] = useState(0);

  const canManageRecruitment = user && ['MANAGER', 'ADMIN', 'OWNER'].includes(user.company_role);

  const fetchJobOpeningsForFilter = useCallback(async () => {
     if (!isAuthenticated) return;
     try {
       const response = await apiClient.get("/job-openings", { params: { status: 'all', per_page: 500 } }); 
       if (response.data?.status === "success" && response.data.data) {
         setJobOpenings(response.data.data.data || []);
       }
     } catch (err) {
       console.error("Error fetching job openings for filter:", err);
     }
  }, [apiClient, isAuthenticated]);

  const fetchApplicants = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError("");
    try {
      const params = {
        page: paginationModel.page + 1,
        per_page: paginationModel.pageSize,
        job_opening_id: selectedJobId === 'all' ? undefined : selectedJobId, 
      };
      const response = await apiClient.get("/applicants", { params });

      if (response.data?.status === "success" && response.data.data) {
        setApplicants(response.data.data.data || []);
        setRowCount(response.data.data.total || 0);
      } else {
        throw new Error("Failed to fetch applicants");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Could not load applicants.");
      setApplicants([]); setRowCount(0);
    } finally {
      setLoading(false);
    }
  }, [apiClient, isAuthenticated, paginationModel, selectedJobId]); 

  useEffect(() => { fetchJobOpeningsForFilter(); }, [fetchJobOpeningsForFilter]);
  useEffect(() => { fetchApplicants(); }, [fetchApplicants]);
  useEffect(() => { setSelectedJobId(jobIdFromParams || "all"); }, [jobIdFromParams]);

  const formatDateTime = (dateTimeString) => {
     if (!dateTimeString) return "N/A";
     try {
        const dt = DateTime.fromISO(dateTimeString);
        return dt.isValid ? dt.toFormat('dd MMM, hh:mm a') : "Invalid Date";
     } catch { return "N/A"; }
  };

  const getStatusChip = (status) => {
    let color = "default"; let icon = null;
    switch (status) {
      case 'new': color = 'info'; icon = <FiberNewOutlined sx={{ fontSize: '1rem', mr: 0.5 }}/>; break;
      case 'screening': color = 'primary'; icon = <PersonSearchOutlined sx={{ fontSize: '1rem', mr: 0.5 }}/>; break;
      case 'interviewing': color = 'secondary'; icon = <EventNoteOutlined sx={{ fontSize: '1rem', mr: 0.5 }}/>; break;
      case 'offer_extended': color = 'warning'; icon = <SendOutlined sx={{ fontSize: '1rem', mr: 0.5 }}/>; break;
      case 'offer_accepted': color = 'success'; icon = <WorkOutline sx={{ fontSize: '1rem', mr: 0.5 }}/>; break;
      case 'hired': color = 'success'; icon = <WorkOutline sx={{ fontSize: '1rem', mr: 0.5 }}/>; break;
      case 'rejected': color = 'error'; icon = <DoDisturbAltOutlined sx={{ fontSize: '1rem', mr: 0.5 }}/>; break;
      case 'withdrawn': color = 'default'; icon = <HighlightOff sx={{ fontSize: '1rem', mr: 0.5 }}/>; break;
      default: break;
    }
    return <Chip label={status?.replace('_', ' ')} color={color} size="small" icon={icon} sx={{ textTransform: 'capitalize' }}/>;
  };

  const columns = [
    { field: "id", headerName: "ID", width: 60 },
    {
        field: "name", headerName: "Applicant Name", width: 160,
        valueGetter: (value, row) => `${row.first_name || ''} ${row.last_name || ''}`.trim() || 'N/A',
        renderCell: (params) => ( 
           <RouterLink to={`/recruitment/applicant-profile/${params.row.id}`} style={{ textDecoration: 'none', color: colors.greenAccent[300], fontWeight: 'bold' }}>
             {params.value}
           </RouterLink>
        )
    },
    { field: "jobOpening", headerName: "Job Opening", width: 160, valueGetter: (value, row) => row.job_opening?.title || 'N/A' },
    { 
        field: "rating", headerName: "Rank", width: 120, 
        renderCell: (params) => (
           <Rating value={params.row.rating ? parseFloat(params.row.rating) : 0} readOnly size="small" sx={{ mt: 1.5 }} />
        )
    },
    { field: "status", headerName: "Status", width: 150, renderCell: (params) => getStatusChip(params.value) },
    { field: "email", headerName: "Email", width: 180 },
    { field: "phone", headerName: "Phone", width: 120, valueGetter: (value) => value || 'N/A' },
    { field: "created_at", headerName: "Applied On", width: 140, valueFormatter: (value) => formatDateTime(value) },
    {
      field: "actions", headerName: "Profile", width: 80, sortable: false, filterable: false, disableColumnMenu: true,
      renderCell: (params) => (
        <Box display="flex" justifyContent="center" gap={0.5}>
           <Tooltip title="View Profile">
             <IconButton size="small" onClick={() => navigate(`/recruitment/applicant-profile/${params.row.id}`)} sx={{ color: colors.blueAccent[300] }}>
               <VisibilityOutlined fontSize="small" />
             </IconButton>
           </Tooltip>
        </Box>
      ),
    },
  ];

  return (
    <Box m={{ xs: "10px", md: "20px" }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1} mb={2}>
        <Header title="APPLICANT TRACKING" subtitle="Manage candidates for job openings" />
        {canManageRecruitment && (
          <Button variant="contained" color="secondary" startIcon={<AddOutlined />} onClick={() => navigate(`/recruitment/add-applicant/${selectedJobId !== 'all' ? selectedJobId : ''}`)}>
            Add Applicant Manually
          </Button>
        )}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <FormControl variant="filled" sx={{ minWidth: 250 }}>
          <InputLabel id="job-filter-label">Filter by Job Opening</InputLabel>
          <Select
            labelId="job-filter-label"
            value={selectedJobId}
            onChange={(e) => {
              const newJobId = e.target.value;
              setSelectedJobId(newJobId);
              setPaginationModel(prev => ({ ...prev, page: 0 })); 
              navigate(`/recruitment/applicants${newJobId !== 'all' ? '/' + newJobId : ''}`, { replace: true });
            }}
            label="Filter by Job Opening"
          >
            <MenuItem value="all"><em>All Job Openings</em></MenuItem>
            {jobOpenings.map((job) => <MenuItem key={job.id} value={job.id}>{job.title}</MenuItem>)}
          </Select>
        </FormControl>
         <Tooltip title="Refresh Data">
            <IconButton onClick={fetchApplicants}><Refresh /></IconButton>
        </Tooltip>
      </Box>

      <Box height="75vh">
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
          slotProps={{ toolbar: { showQuickFilter: true, quickFilterProps: { debounceMs: 500 } } }}
          density="compact"
        />
      </Box>
    </Box>
  );
};

export default ApplicantTracking;