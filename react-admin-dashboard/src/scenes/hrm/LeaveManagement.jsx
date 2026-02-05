import { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  useTheme,
  Button,
  IconButton,
  Chip,
  CircularProgress,
  Alert,
  Snackbar,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
  Tooltip,
} from "@mui/material";
import { DataGrid, GridToolbar } from "@mui/x-data-grid";
import {
  CheckCircleOutline,
  HighlightOff,
  HourglassEmpty,
  Refresh,
  ThumbUpAltOutlined, // Approve Icon
  ThumbDownAltOutlined, // Reject Icon
} from "@mui/icons-material";
import { DateTime } from "luxon";
import Header from "../../components/Header";
import { tokens } from "../../theme";
import { useAuth } from "../../api/AuthProvider";

const LeaveManagement = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const { apiClient, isAuthenticated, user } = useAuth(); // Get user role

  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Server-side pagination and filtering state
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 15 });
  const [rowCount, setRowCount] = useState(0);
  const [filterStatus, setFilterStatus] = useState("pending"); // Default to pending

  // Rejection dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null); // Request to be rejected
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejectError, setRejectError] = useState(""); // Error specifically for the dialog

  // Check if the current user is authorized to manage leave
  const canManageLeave = user && ['MANAGER', 'ADMIN', 'OWNER'].includes(user.company_role);

  // --- Data Fetching ---
  const fetchLeaveRequests = useCallback(async () => {
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
        status: filterStatus === 'all' ? undefined : filterStatus,
      };

      const response = await apiClient.get("/leave-requests", { params });

      // console.log("Full API Response:", response); // Keep for debugging if needed
      const responseData = response.data;

      if (responseData?.status === "success" && responseData.data) {
        if (responseData.data.data && Array.isArray(responseData.data.data)) {
          // console.log("Actual Leave Request Data Received:", responseData.data.data); // Keep for debugging if needed
          setLeaveRequests(responseData.data.data);
          setRowCount(responseData.data.total || 0);
        } else {
           console.error("API Error: Expected paginated data array", responseData.data);
           throw new Error("Invalid data structure received (pagination expected).");
        }
      } else {
        console.error("API Error: Request status not 'success'", responseData);
        throw new Error(responseData?.message || "Failed to fetch requests (unknown structure)");
      }

    } catch (err) {
      console.error("Error fetching leave requests:", err);
      setError(err.response?.data?.message || err.message || "Could not load requests.");
      setLeaveRequests([]);
      setRowCount(0);
    } finally {
      setLoading(false);
    }
  }, [apiClient, isAuthenticated, paginationModel, filterStatus]);

  useEffect(() => {
    fetchLeaveRequests();
  }, [fetchLeaveRequests]);

  // --- Action Handlers ---
  const handleApprove = async (id) => {
    if (!canManageLeave) return;
    setError(""); setSuccess("");
    try {
      const response = await apiClient.patch(`/leave-requests/${id}/approve`);
      if (response.data?.status === "success") {
        setSuccess("Leave request approved successfully!");
        fetchLeaveRequests();
      } else {
        throw new Error(response.data?.message || "Failed to approve request");
      }
    } catch (err) {
      console.error("Approve error:", err);
      setError(err.response?.data?.message || err.message || "Could not approve request.");
    }
  };

  const handleRejectClick = (request) => {
    if (!canManageLeave) return;
    setSelectedRequest(request);
    setRejectionReason("");
    setRejectError("");
    setDialogOpen(true);
  };

  const handleRejectConfirm = async () => {
    if (!selectedRequest || !rejectionReason.trim()) {
      setRejectError("Rejection reason is required.");
      return;
    }
    if (!canManageLeave) return;

    setRejectError("");
    try {
      const response = await apiClient.patch(`/leave-requests/${selectedRequest.id}/reject`, {
        rejection_reason: rejectionReason,
      });
      if (response.data?.status === "success") {
        setSuccess("Leave request rejected successfully!");
        setDialogOpen(false);
        setSelectedRequest(null);
        fetchLeaveRequests();
      } else {
         throw new Error(response.data?.message || "Failed to reject request");
      }
    } catch (err) {
        console.error("Reject error:", err);
        setRejectError(err.response?.data?.message || err.message || "Could not reject request.");
    }
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setSelectedRequest(null);
  };

  // --- Formatting Helpers ---
  const formatDate = (value, fieldName) => {
    // console.log(`formatDate for ${fieldName} received:`, value, typeof value);
    if (!value || typeof value !== 'string') {
        return "N/A";
    }
    try {
      const dt = DateTime.fromISO(value);
      if (!dt.isValid) {
        console.warn(`Luxon failed to parse date for ${fieldName}:`, value, dt.invalidReason);
        return "Invalid Date";
      }
      return dt.toLocaleString(DateTime.DATE_MED);
    } catch (e) {
      console.error(`Error during formatDate for ${fieldName}:`, e, "Input:", value);
      return "Format Error";
    }
  };

  const formatDateTime = (value, fieldName) => {
    //  console.log(`formatDateTime for ${fieldName} received:`, value, typeof value);
     if (!value || typeof value !== 'string') {
        return "N/A";
    }
     try {
        const dt = DateTime.fromISO(value);
        if (!dt.isValid) {
            console.warn(`Luxon failed to parse datetime for ${fieldName}:`, value, dt.invalidReason);
            return "Invalid DateTime";
        }
        return dt.toFormat('dd MMM yyyy, hh:mm a');
     } catch (e) {
         console.error(`Error during formatDateTime for ${fieldName}:`, e, "Input:", value);
         return "Format Error";
     }
  }

  const getStatusChip = (status) => {
    let color = "default";
    let icon = null;
    switch (status) {
      case 'pending': color = 'warning'; icon = <HourglassEmpty sx={{ fontSize: '1rem', mr: 0.5 }}/>; break;
      case 'approved': color = 'success'; icon = <CheckCircleOutline sx={{ fontSize: '1rem', mr: 0.5 }}/>; break;
      case 'rejected': color = 'error'; icon = <HighlightOff sx={{ fontSize: '1rem', mr: 0.5 }}/>; break;
      case 'cancelled': color = 'default'; break;
      default: break;
    }
    return <Chip label={status} color={color} size="small" icon={icon} sx={{ textTransform: 'capitalize' }}/>;
  };

  // --- DataGrid Columns ---
  const columns = [
    { field: "id", headerName: "ID", width: 60 },
    {
      field: "employee", headerName: "Employee", width: 180,
      valueGetter: (params) => params?.row?.user?.name || 'N/A',
    },
    {
      field: "leaveType", headerName: "Leave Type", width: 150,
      valueGetter: (params) => params?.row?.leave_type?.name || 'N/A',
    },
    {
      field: "start_date", headerName: "Start Date", width: 120,
      // --- FIX: Check if params exists ---
      valueFormatter: (params) => params ? formatDate(params.value, 'start_date') : 'N/A',
    },
    {
      field: "end_date", headerName: "End Date", width: 120,
      // --- FIX: Check if params exists ---
      valueFormatter: (params) => params ? formatDate(params.value, 'end_date') : 'N/A',
    },
    {
        field: "reason", headerName: "Reason", width: 250,
        renderCell: (params) => (
            <Tooltip title={params.value || ''} placement="bottom-start">
                <Typography noWrap sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {params.value || 'N/A'}
                </Typography>
            </Tooltip>
        )
    },
    {
      field: "status", headerName: "Status", width: 120,
      renderCell: (params) => getStatusChip(params.value),
    },
     {
      field: "created_at", headerName: "Requested On", width: 160,
      // --- FIX: Check if params exists ---
      valueFormatter: (params) => params ? formatDateTime(params.value, 'created_at') : 'N/A',
    },
    {
      field: "approver", headerName: "Actioned By", width: 150,
      valueGetter: (params) => params?.row?.approver?.name || 'N/A',
    },
     {
      field: "approved_at", headerName: "Actioned At", width: 160,
      // --- FIX: Check if params exists ---
      valueFormatter: (params) => params ? formatDateTime(params.value, 'approved_at') : 'N/A',
    },
    // --- Actions Column (Conditional) ---
    ...(canManageLeave ? [{
      field: "actions",
      headerName: "Actions",
      width: 150,
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      renderCell: (params) => (
        params.row.status === 'pending' ? (
          <Box display="flex" justifyContent="center" gap={1}>
            <Tooltip title="Approve Request">
              <IconButton
                size="small"
                onClick={() => handleApprove(params.row.id)}
                sx={{ color: colors.greenAccent[400], '&:hover': { backgroundColor: colors.greenAccent[800] } }}
              >
                <ThumbUpAltOutlined fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Reject Request">
              <IconButton
                size="small"
                onClick={() => handleRejectClick(params.row)}
                sx={{ color: colors.redAccent[500], '&:hover': { backgroundColor: colors.redAccent[700] } }}
              >
                <ThumbDownAltOutlined fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        ) : null
      ),
    }] : []),
  ];

  // --- Render UI ---
  return (
    <Box m={{ xs: "10px", md: "20px" }}>
      <Header title="LEAVE MANAGEMENT" subtitle="View and manage employee leave requests" />

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* --- Filter Controls --- */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
         <FormControl variant="filled" sx={{ minWidth: 180 }}>
            <InputLabel id="status-filter-label">Filter by Status</InputLabel>
            <Select
              labelId="status-filter-label"
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setPaginationModel(prev => ({ ...prev, page: 0 }));
              }}
              label="Filter by Status"
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="approved">Approved</MenuItem>
              <MenuItem value="rejected">Rejected</MenuItem>
              <MenuItem value="cancelled">Cancelled</MenuItem>
            </Select>
         </FormControl>
         <Tooltip title="Refresh Data">
            <IconButton onClick={fetchLeaveRequests}>
                 <Refresh />
            </IconButton>
        </Tooltip>
      </Box>

      {/* --- Data Grid --- */}
      <Box
         height="75vh"
         sx={{
            "& .MuiDataGrid-root": { border: "none" },
            "& .MuiDataGrid-cell": { borderBottom: "none", py: 0.5 },
            "& .MuiDataGrid-columnHeaders": { backgroundColor: colors.blueAccent[700], borderBottom: "none" },
            "& .MuiDataGrid-virtualScroller": { backgroundColor: colors.primary[400] },
            "& .MuiDataGrid-footerContainer": { borderTop: "none", backgroundColor: colors.blueAccent[700] },
            "& .MuiCheckbox-root": { color: `${colors.greenAccent[200]} !important` },
            "& .MuiDataGrid-toolbarContainer .MuiButton-text": { color: `${colors.grey[100]} !important` },
          }}
      >
        <DataGrid
          rows={leaveRequests}
          columns={columns}
          loading={loading}
          rowCount={rowCount}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          pageSizeOptions={[15, 30, 50]}
          paginationMode="server"
          filterMode="server"
          getRowId={(row) => row.id}
          disableRowSelectionOnClick
          slots={{ toolbar: GridToolbar }}
          slotProps={{
            toolbar: {
              showQuickFilter: true,
              quickFilterProps: { debounceMs: 500 },
            },
          }}
          density="compact"
        />
      </Box>

      {/* --- Rejection Dialog --- */}
      <Dialog open={dialogOpen} onClose={handleDialogClose} maxWidth="sm" fullWidth>
         <DialogTitle sx={{ bgcolor: colors.primary[400], borderBottom: `1px solid ${colors.grey[700]}` }}>
           Reject Leave Request
         </DialogTitle>
         <DialogContent sx={{ bgcolor: colors.primary[400], pt: '20px !important' }}>
             <DialogContentText sx={{ mb: 2, color: colors.grey[200] }}>
               Please provide a reason for rejecting the leave request for{' '}
               <strong>{selectedRequest?.user?.name || 'this employee'}</strong> from{' '}
               <strong>{formatDate(selectedRequest?.start_date)}</strong> to{' '}
               <strong>{formatDate(selectedRequest?.end_date)}</strong>.
             </DialogContentText>
             {rejectError && <Alert severity="error" sx={{ mb: 2 }}>{rejectError}</Alert>}
             <TextField
               autoFocus
               margin="dense"
               id="rejection_reason"
               label="Rejection Reason *"
               type="text"
               fullWidth
               variant="filled"
               multiline
               rows={3}
               value={rejectionReason}
               onChange={(e) => {
                   setRejectionReason(e.target.value);
                   if (e.target.value.trim()) setRejectError("");
               }}
               error={!!rejectError}
               helperText={rejectError || ""}
             />
         </DialogContent>
         <DialogActions sx={{ bgcolor: colors.primary[400], px: 3, pb: 2, borderTop: `1px solid ${colors.grey[700]}` }}>
             <Button onClick={handleDialogClose} sx={{ color: colors.grey[100] }}>Cancel</Button>
             <Button
               onClick={handleRejectConfirm}
               variant="contained"
               color="error"
             >
               Confirm Rejection
             </Button>
         </DialogActions>
      </Dialog>

      {/* --- Success Snackbar --- */}
      <Snackbar open={!!success} autoHideDuration={4000} onClose={() => setSuccess("")} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
          <Alert onClose={() => setSuccess("")} severity="success" variant="filled" sx={{ width: '100%' }}>
            {success}
          </Alert>
      </Snackbar>

    </Box>
  );
};

export default LeaveManagement;