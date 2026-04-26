import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Box,
  Typography,
  useTheme,
  Button,
  IconButton,
  Chip,
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
  Paper,
  Stack,
  Fade,
  Grow,
  Divider,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { DataGrid, GridToolbarContainer, GridToolbarQuickFilter } from "@mui/x-data-grid";
import {
  CheckCircleOutline,
  HighlightOff,
  HourglassEmpty,
  Refresh,
  ThumbUpAltOutlined,
  ThumbDownAltOutlined,
  CancelOutlined,
  FilterListOutlined
} from "@mui/icons-material";
import { DateTime } from "luxon";

import Header from "../../components/Header";
import { tokens } from "../../theme";
import { useAuth } from "../../api/AuthProvider";

const appleFont = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', sans-serif";

const LeaveManagement = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const isDark = theme.palette.mode === "dark";
  const { apiClient, isAuthenticated, user } = useAuth();

  // ==========================================
  // 🛡️ CRASH-PROOF COLOR ENGINE
  // ==========================================
  const getColor = useCallback((colorPath, fallback = "#888888") => {
    try {
      const parts = colorPath.split('.');
      let value = colors;
      for (const part of parts) {
        if (!value || typeof value !== 'object') return fallback;
        value = value[part];
      }
      return value || fallback;
    } catch (error) {
      return fallback;
    }
  }, [colors]);

  const safeColors = useMemo(() => ({
    primary: { main: getColor('primary[500]', '#1976d2') },
    greenAccent: { main: getColor('greenAccent[500]', '#4caf50') },
    redAccent: { main: getColor('redAccent[500]', '#f44336') },
    blueAccent: { main: getColor('blueAccent[500]', '#2196f3') },
    orangeAccent: { main: getColor('orangeAccent[500]', '#ff9800') },
    grey: {
      50: getColor('grey[50]', '#fafafa'),
      100: getColor('grey[100]', '#f5f5f5'),
      200: getColor('grey[200]', '#eeeeee'),
      300: getColor('grey[300]', '#e0e0e0'),
      400: getColor('grey[400]', '#bdbdbd'),
      500: getColor('grey[500]', '#9e9e9e'),
      600: getColor('grey[600]', '#757575'),
      700: getColor('grey[700]', '#616161'),
      800: getColor('grey[800]', '#424242'),
      900: getColor('grey[900]', '#212121'),
    }
  }), [getColor]);

  // State Management
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 15 });
  const [rowCount, setRowCount] = useState(0);
  const [filterStatus, setFilterStatus] = useState("pending");

  // Dialog State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejectError, setRejectError] = useState("");

  const canManageLeave = user && ['MANAGER', 'ADMIN', 'OWNER'].includes(user.company_role);

  // ==========================================
  // DATA FETCHING
  // ==========================================
  const fetchLeaveRequests = useCallback(async () => {
    if (!isAuthenticated) return setError("Authentication required.");
    setLoading(true);
    setError("");
    try {
      const params = {
        page: paginationModel.page + 1,
        per_page: paginationModel.pageSize,
        status: filterStatus === 'all' ? undefined : filterStatus,
      };

      const response = await apiClient.get("/leave-requests", { params });
      const responseData = response.data;

      if (responseData?.status === "success" && responseData.data?.data) {
        setLeaveRequests(responseData.data.data);
        setRowCount(responseData.data.total || 0);
      } else {
        throw new Error(responseData?.message || "Failed to fetch requests.");
      }
    } catch (err) {
      console.error("Fetch leave requests error:", err);
      setError(err.response?.data?.message || err.message || "Could not load requests.");
      setLeaveRequests([]);
      setRowCount(0);
    } finally {
      setLoading(false);
    }
  }, [apiClient, isAuthenticated, paginationModel, filterStatus]);

  useEffect(() => { fetchLeaveRequests(); }, [fetchLeaveRequests]);

  // ==========================================
  // ACTION HANDLERS
  // ==========================================
  const handleApprove = async (id) => {
    if (!canManageLeave) return;
    setError(""); setSuccess("");
    try {
      const response = await apiClient.patch(`/leave-requests/${id}/approve`);
      if (response.data?.status === "success") {
        setSuccess("Leave request approved successfully.");
        fetchLeaveRequests();
      } else throw new Error(response.data?.message || "Failed to approve request");
    } catch (err) {
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
    if (!rejectionReason.trim()) return setRejectError("Rejection reason is required.");
    if (!canManageLeave) return;

    setRejectError("");
    try {
      const response = await apiClient.patch(`/leave-requests/${selectedRequest.id}/reject`, {
        rejection_reason: rejectionReason,
      });
      if (response.data?.status === "success") {
        setSuccess("Leave request rejected.");
        setDialogOpen(false);
        setSelectedRequest(null);
        fetchLeaveRequests();
      } else throw new Error(response.data?.message || "Failed to reject request");
    } catch (err) {
      setRejectError(err.response?.data?.message || err.message || "Could not reject request.");
    }
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setSelectedRequest(null);
  };

  // ==========================================
  // FORMATTERS
  // ==========================================
  const formatLuxonDate = (val, withTime = false) => {
    if (!val) return "N/A";
    const dt = DateTime.fromISO(val);
    if (!dt.isValid) return "Invalid";
    return withTime ? dt.toFormat('dd MMM yyyy, hh:mm a') : dt.toLocaleString(DateTime.DATE_MED);
  };

  const getStatusChip = (status) => {
    let color = safeColors.grey[500];
    let icon = null;
    let bgColor = alpha(safeColors.grey[500], 0.1);

    if (status === 'pending') {
      color = safeColors.orangeAccent.main;
      icon = <HourglassEmpty sx={{ fontSize: '1rem' }}/>;
      bgColor = alpha(safeColors.orangeAccent.main, 0.15);
    } else if (status === 'approved') {
      color = safeColors.greenAccent.main;
      icon = <CheckCircleOutline sx={{ fontSize: '1rem' }}/>;
      bgColor = alpha(safeColors.greenAccent.main, 0.15);
    } else if (status === 'rejected') {
      color = safeColors.redAccent.main;
      icon = <HighlightOff sx={{ fontSize: '1rem' }}/>;
      bgColor = alpha(safeColors.redAccent.main, 0.15);
    } else if (status === 'cancelled') {
      color = safeColors.grey[400];
      icon = <CancelOutlined sx={{ fontSize: '1rem' }}/>;
      bgColor = alpha(safeColors.grey[500], 0.1);
    }

    return (
      <Chip 
        label={(status || "Unknown").toUpperCase()} 
        icon={icon}
        size="small"
        sx={{ 
          fontWeight: 700, fontSize: '0.65rem', borderRadius: '6px', height: '22px',
          backgroundColor: bgColor, color: color, '& .MuiChip-icon': { color: color }
        }} 
      />
    );
  };

  // ==========================================
  // DATAGRID CONFIG
  // ==========================================
  const columns = [
    { field: "id", headerName: "ID", width: 70 },
    { field: "employee", headerName: "Employee", width: 180, valueGetter: (params) => params?.row?.user?.name || 'N/A' },
    { field: "leaveType", headerName: "Leave Type", width: 150, valueGetter: (params) => params?.row?.leave_type?.name || 'N/A' },
    { field: "start_date", headerName: "Start Date", width: 120, renderCell: (params) => formatLuxonDate(params.row.start_date) },
    { field: "end_date", headerName: "End Date", width: 120, renderCell: (params) => formatLuxonDate(params.row.end_date) },
    {
      field: "reason", headerName: "Reason", width: 220,
      renderCell: (params) => (
        <Tooltip title={params.row.reason || ''} placement="bottom-start">
          <Typography variant="body2" noWrap sx={{ overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '0.85rem' }}>
            {params.row.reason || 'N/A'}
          </Typography>
        </Tooltip>
      )
    },
    { field: "status", headerName: "Status", width: 130, renderCell: (params) => getStatusChip(params.row.status) },
    { field: "created_at", headerName: "Requested On", width: 170, renderCell: (params) => formatLuxonDate(params.row.created_at, true) },
    { field: "approver", headerName: "Actioned By", width: 150, valueGetter: (params) => params?.row?.approver?.name || '—' },
    ...(canManageLeave ? [{
      field: "actions", headerName: "Actions", width: 120, sortable: false, filterable: false, disableColumnMenu: true,
      renderCell: (params) => (
        params.row.status === 'pending' ? (
          <Stack direction="row" spacing={0.5}>
            <Tooltip title="Approve">
              <IconButton size="small" onClick={() => handleApprove(params.row.id)} sx={{ color: safeColors.greenAccent.main, backgroundColor: alpha(safeColors.greenAccent.main, 0.1), '&:hover': { backgroundColor: safeColors.greenAccent.main, color: '#fff' } }}>
                <ThumbUpAltOutlined fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Reject">
              <IconButton size="small" onClick={() => handleRejectClick(params.row)} sx={{ color: safeColors.redAccent.main, backgroundColor: alpha(safeColors.redAccent.main, 0.1), '&:hover': { backgroundColor: safeColors.redAccent.main, color: '#fff' } }}>
                <ThumbDownAltOutlined fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        ) : null
      ),
    }] : []),
  ];

  const CustomToolbar = () => (
    <GridToolbarContainer sx={{ p: 1.5, display: 'flex', justifyContent: 'flex-end', borderBottom: `1px solid ${alpha(safeColors.grey[500], 0.15)}` }}>
      <GridToolbarQuickFilter sx={{ width: '250px', '& .MuiInputBase-root': { fontFamily: appleFont } }} />
    </GridToolbarContainer>
  );

  // ==========================================
  // STYLES
  // ==========================================
  const tableWrapperSx = {
    borderRadius: "20px",
    p: 0,
    overflow: 'hidden',
    backgroundColor: isDark ? theme.palette.background.default : '#ffffff',
    border: `1px solid ${isDark ? alpha(safeColors.grey[700], 0.4) : alpha(safeColors.grey[300], 0.5)}`,
    boxShadow: isDark ? '0 10px 30px rgba(0,0,0,0.2)' : '0 10px 30px rgba(0,0,0,0.03)',
    backgroundImage: 'none'
  };

  return (
    <Box m={{ xs: "12px", md: "20px" }} sx={{ '& *': { fontFamily: appleFont } }}>
      <Header title="LEAVE MANAGEMENT" subtitle="Review, approve, and track employee time-off requests" />

      {error && (
        <Grow in={true}><Alert severity="error" sx={{ mb: 3, borderRadius: '14px' }}>{error}</Alert></Grow>
      )}

      {/* ===== ACTION BAR & DATAGRID ===== */}
      <Fade in={true} timeout={600}>
        <Paper elevation={0} sx={tableWrapperSx}>
          
          {/* Custom Header / Filters */}
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems="center" p={2.5} sx={{ borderBottom: `1px solid ${alpha(safeColors.grey[500], 0.15)}`, backgroundColor: isDark ? theme.palette.background.default : alpha(safeColors.grey[50], 0.5) }}>
            <Typography variant="h5" fontWeight={700} color={safeColors.grey[100]} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FilterListOutlined /> Request Roster
            </Typography>
            
            <Stack direction="row" spacing={2} alignItems="center" mt={{ xs: 2, sm: 0 }}>
              <FormControl size="small" sx={{ minWidth: 160 }}>
                <InputLabel sx={{ fontFamily: appleFont }}>Status Filter</InputLabel>
                <Select
                  value={filterStatus}
                  label="Status Filter"
                  onChange={(e) => { setFilterStatus(e.target.value); setPaginationModel(prev => ({ ...prev, page: 0 })); }}
                  sx={{ borderRadius: '10px', fontFamily: appleFont }}
                >
                  <MenuItem value="all">All Requests</MenuItem>
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="approved">Approved</MenuItem>
                  <MenuItem value="rejected">Rejected</MenuItem>
                  <MenuItem value="cancelled">Cancelled</MenuItem>
                </Select>
              </FormControl>

              <Tooltip title="Sync Data">
                <IconButton onClick={fetchLeaveRequests} sx={{ backgroundColor: alpha(safeColors.blueAccent.main, 0.1), color: safeColors.blueAccent.main, borderRadius: '10px' }}>
                  <Refresh />
                </IconButton>
              </Tooltip>
            </Stack>
          </Stack>

          {/* Grid */}
          <Box height="68vh" width="100%">
            <DataGrid
              rows={leaveRequests}
              columns={columns}
              loading={loading}
              rowCount={rowCount}
              paginationModel={paginationModel}
              onPaginationModelChange={setPaginationModel}
              pageSizeOptions={[15, 30, 50]}
              paginationMode="server"
              getRowId={(row) => row.id}
              disableRowSelectionOnClick
              density="compact"
              slots={{ toolbar: CustomToolbar }}
              sx={{
                border: "none",
                fontFamily: appleFont,
                backgroundColor: isDark ? theme.palette.background.default : '#ffffff',
                "& .MuiDataGrid-columnHeaders": {
                  backgroundColor: isDark ? theme.palette.background.default : safeColors.grey[50],
                  borderBottom: `1px solid ${alpha(safeColors.grey[500], 0.2)}`,
                },
                "& .MuiDataGrid-columnHeaderTitle": {
                  fontWeight: 700, color: safeColors.grey[300], textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.5px'
                },
                "& .MuiDataGrid-row": {
                  transition: "background-color 0.2s ease", '&:hover': { backgroundColor: alpha(safeColors.blueAccent.main, 0.04) }
                },
                "& .MuiDataGrid-cell": {
                  borderBottom: `1px solid ${alpha(safeColors.grey[500], 0.1)}`, display: 'flex', alignItems: 'center', fontSize: '0.85rem'
                },
                "& .MuiDataGrid-footerContainer": {
                  borderTop: `1px solid ${alpha(safeColors.grey[500], 0.15)}`, backgroundColor: isDark ? theme.palette.background.default : safeColors.grey[50],
                },
              }}
            />
          </Box>
        </Paper>
      </Fade>

      {/* ===== REJECTION DIALOG ===== */}
      <Dialog 
        open={dialogOpen} 
        onClose={handleDialogClose} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '24px',
            backgroundColor: isDark ? safeColors.primary.main : '#fff',
            backgroundImage: 'none',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
            '& *': { fontFamily: appleFont }
          }
        }}
      >
        <DialogTitle sx={{ pt: 3, pb: 2, px: 3, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ p: 1, borderRadius: '12px', backgroundColor: alpha(safeColors.redAccent.main, 0.1), color: safeColors.redAccent.main, display: 'flex' }}>
            <HighlightOff />
          </Box>
          <Typography variant="h5" fontWeight={800}>Reject Leave Request</Typography>
        </DialogTitle>
        <Divider sx={{ borderColor: alpha(safeColors.grey[500], 0.1) }} />
        
        <DialogContent sx={{ px: 3, py: 3 }}>
          <DialogContentText sx={{ mb: 3, color: safeColors.grey[300] }}>
            You are rejecting the leave request for <Typography component="span" fontWeight={700} color={safeColors.grey[100]}>{selectedRequest?.user?.name}</Typography> scheduled from <Typography component="span" fontWeight={700}>{formatLuxonDate(selectedRequest?.start_date)}</Typography> to <Typography component="span" fontWeight={700}>{formatLuxonDate(selectedRequest?.end_date)}</Typography>. Please provide a justification.
          </DialogContentText>
          
          {rejectError && <Alert severity="error" sx={{ mb: 2, borderRadius: '10px' }}>{rejectError}</Alert>}
          
          <TextField
            autoFocus
            fullWidth
            label="Reason for Rejection"
            variant="outlined"
            multiline
            rows={4}
            value={rejectionReason}
            onChange={(e) => { setRejectionReason(e.target.value); if (e.target.value.trim()) setRejectError(""); }}
            error={!!rejectError}
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: "14px",
                backgroundColor: isDark ? alpha(safeColors.primary.main, 0.4) : '#fff',
              }
            }}
          />
        </DialogContent>
        
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={handleDialogClose} sx={{ color: safeColors.grey[300], fontWeight: 600, textTransform: 'none', px: 2 }}>
            Cancel
          </Button>
          <Button onClick={handleRejectConfirm} variant="contained" sx={{ backgroundColor: safeColors.redAccent.main, '&:hover': { backgroundColor: safeColors.redAccent.dark }, borderRadius: '10px', fontWeight: 700, textTransform: 'none', px: 3, boxShadow: 'none' }}>
            Confirm Rejection
          </Button>
        </DialogActions>
      </Dialog>

      {/* ===== SUCCESS SNACKBAR ===== */}
      <Snackbar open={!!success} autoHideDuration={4000} onClose={() => setSuccess("")} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setSuccess("")} severity="success" variant="filled" sx={{ width: '100%', borderRadius: '12px', fontWeight: 600 }}>
          {success}
        </Alert>
      </Snackbar>

    </Box>
  );
};

export default LeaveManagement;