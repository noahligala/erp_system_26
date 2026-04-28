import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  Box,
  Typography,
  useTheme,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Chip,
  Paper,
  Stack,
  Tooltip,
  Grow,
  Fade,
  Divider
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { DataGrid, GridToolbarContainer, GridToolbarQuickFilter } from "@mui/x-data-grid";
import { Link, useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";

// Icons
import AdminPanelSettingsOutlinedIcon from "@mui/icons-material/AdminPanelSettingsOutlined";
import LockOpenOutlinedIcon from "@mui/icons-material/LockOpenOutlined";
import SecurityOutlinedIcon from "@mui/icons-material/SecurityOutlined";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import RefreshIcon from "@mui/icons-material/Refresh";
import GetAppIcon from "@mui/icons-material/GetApp"; 
import PrintIcon from "@mui/icons-material/Print";
import ViewColumnIcon from "@mui/icons-material/ViewColumn";
import GroupOutlinedIcon from "@mui/icons-material/GroupOutlined";
import PersonOffOutlinedIcon from "@mui/icons-material/PersonOffOutlined";
import VerifiedUserOutlinedIcon from "@mui/icons-material/VerifiedUserOutlined";

// Utilities & Context
import { tokens } from "../../theme";
import Header from "../../components/Header";
import { useAuth } from "../../api/AuthProvider";
import { secureStore } from "../../utils/storage";
import { globalPrint } from "../../utils/print";

const VISIBILITY_STORAGE_KEY = "team_column_visibility";
const appleFont = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', sans-serif";

const Team = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const isDark = theme.palette.mode === "dark";
  const navigate = useNavigate();
  const { apiClient, isAuthenticated, user } = useAuth();

  // ==========================================
  // 🛡️ CRASH-PROOF COLOR ENGINE
  // ==========================================
  const safeColors = useMemo(() => ({
    primary: {
      main: colors?.primary?.[500] || '#1976d2',
    },
    greenAccent: {
      main: colors?.greenAccent?.[500] || '#4caf50',
    },
    redAccent: {
      main: colors?.redAccent?.[500] || '#f44336',
    },
    blueAccent: {
      main: colors?.blueAccent?.[500] || '#2196f3',
    },
    orangeAccent: {
      main: colors?.orangeAccent?.[500] || '#ff9800',
    },
    grey: {
      50: colors?.grey?.[50] || '#fafafa',
      100: colors?.grey?.[100] || '#f5f5f5',
      200: colors?.grey?.[200] || '#eeeeee',
      300: colors?.grey?.[300] || '#e0e0e0',
      400: colors?.grey?.[400] || '#bdbdbd',
      500: colors?.grey?.[500] || '#9e9e9e',
      600: colors?.grey?.[600] || '#757575',
      700: colors?.grey?.[700] || '#616161',
      800: colors?.grey?.[800] || '#424242',
      900: colors?.grey?.[900] || '#212121',
    }
  }), [colors]);

  // State
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [columnMenuAnchor, setColumnMenuAnchor] = useState(null);

  const defaultColumnModel = {
    id: true, full_name: true, email: true, phone_number: true,
    department: true, job_title: true, salary: true, status: true,
    accessLevel: true, hired_on: false, national_id: false,
    nssf_number: false, kra_pin: false, nhif_number: false,
    bank_account: false, bank_name: false, bank_branch: false, actions: true 
  };

  const [columnVisibilityModel, setColumnVisibilityModel] = useState(
    secureStore.get(VISIBILITY_STORAGE_KEY) || defaultColumnModel
  );

  // ==========================================
  // LOGIC & DATA FETCHING
  // ==========================================
  const fetchEmployees = async (forceRefresh = false) => {
    const cachedData = secureStore.get('employees_data');
    const cacheTimestamp = secureStore.get('employees_timestamp');
    const cacheExpiry = 5 * 60 * 1000;

    if (!forceRefresh && cachedData && cacheTimestamp && (Date.now() - cacheTimestamp < cacheExpiry)) {
      setEmployees(cachedData);
      setError(null);
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      if (!isAuthenticated) throw new Error('Not authenticated');
      const response = await apiClient.get('/employees');
      let employeesData = response.data;
      if (employeesData?.status === "success") employeesData = employeesData.data;
      if (!Array.isArray(employeesData)) throw new Error('Invalid data format received from server');
      
      setEmployees(employeesData);
      secureStore.set('employees_data', employeesData);
      secureStore.set('employees_timestamp', Date.now());
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to fetch employees');
      const fallback = secureStore.get('employees_data');
      if (fallback) setEmployees(fallback);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEmployees(); }, [isAuthenticated]);

  const handleDelete = async (employee) => {
    if (window.confirm(`Are you sure you want to permanently delete ${employee.email}?`)) {
      try {
        await apiClient.delete(`/employees/${employee.id}`);
        fetchEmployees(true);
      } catch (err) {
        console.error("Delete failed:", err);
        alert(`Failed to delete employee: ${err.message}`);
      }
    }
  };

  const getAccessLevelDisplay = (accessLevel) => {
    switch (accessLevel) {
      case 'OWNER': return 'admin';
      case 'MANAGER': return 'manager';
      default: return 'user';
    }
  };

  // ==========================================
  // EXPORTS & PRINTING
  // ==========================================
  const exportToExcel = () => {
    if (!employees.length) { alert('No data to export'); return; }
    const dataToExport = employees.map(emp => ({
      ID: emp.id,
      'Full Name': emp.full_name || 'N/A',
      Email: emp.email,
      'Phone Number': emp.phone_number || 'N/A',
      Department: emp.department || 'N/A',
      'Job Title': emp.job_title || 'N/A',
      Salary: `KSh ${(emp.salary || 0).toLocaleString()}`,
      Status: emp.status || 'N/A',
      'Access Level': getAccessLevelDisplay(emp.accessLevel),
      'Hire Date': emp.hired_on ? new Date(emp.hired_on).toLocaleDateString('en-GB') : 'N/A',
      'National ID': emp.national_id || 'N/A',
      'NSSF Number': emp.nssf_number || 'N/A',
      'KRA Pin': emp.kra_pin || 'N/A',
      'NHIF Number': emp.nhif_number || 'N/A',
      'Bank Account': emp.bank_account || 'N/A',
      'Bank Name': emp.bank_name || 'N/A',
      'Bank Branch': emp.bank_branch || 'N/A',
    }));
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Employees");
    XLSX.writeFile(wb, "employees_data.xlsx");
  };

  const printEmployees = () => {
    if (!employees.length) { alert('No data to print'); return; }
    const printableColumns = columns.filter(c => c.field !== 'actions' && columnVisibilityModel[c.field] !== false);
    
    // Removed dummy data fallbacks. Only uses actual API data if present.
    const company = {
        name: user?.company?.name || "",
        tagline: user?.company?.tagline || "",
        logoUrl: user?.company?.logoUrl || "",
        tel: user?.company?.tel || "",
        email: user?.company?.email || "",
        poBox: user?.company?.poBox || "",
    };

    // Dynamically build the contact line to avoid trailing pipes if data is missing
    const contactInfo = [
      company.poBox ? `P.O. Box: ${company.poBox}` : '',
      company.tel ? `Tel: ${company.tel}` : '',
      company.email ? `Email: ${company.email}` : ''
    ].filter(Boolean).join(' | ');

    const headerHtml = `
      <div style="text-align: center; padding-bottom: 10px; font-family: 'Helvetica Neue', sans-serif;">
        ${company.logoUrl ? `<img src="${company.logoUrl}" alt="Logo" style="width: 70px; height: 70px; object-fit: contain; margin-bottom: 5px;" />` : ''}
        ${company.name ? `<h2 style="margin: 0; font-size: 20px; color: #1a1a1a;">${company.name.toUpperCase()}</h2>` : ''}
        ${company.tagline ? `<p style="margin: 2px 0; font-size: 11px; color: #666;">${company.tagline}</p>` : ''}
        ${contactInfo ? `<p style="margin: 6px 0; font-size: 12px; color: #444;">${contactInfo}</p>` : ''}
        <hr style="margin: 15px 0 10px; border: none; border-top: 1px solid #ddd;" />
        <h3 style="margin: 5px 0 0; font-size: 16px; color: #333;">EMPLOYEE DIRECTORY REPORT</h3>
      </div>
    `;

    const printStyles = `
      table { width: 100%; border-collapse: collapse; font-family: 'Helvetica Neue', sans-serif; font-size: 10px; margin-top: 10px; }
      th, td { border: 1px solid #ececec; padding: 8px 6px; text-align: left; }
      th { background-color: #f8f9fa !important; font-weight: bold; color: #333; }
      tr:nth-child(even) { background-color: #fdfdfd; }
      .status-active { color: #2e7d32; font-weight: bold; }
      .status-inactive { color: #c62828; font-weight: bold; }
    `;

    const tableHtml = `
      <table>
        <thead><tr>${printableColumns.map(c => `<th>${c.headerName}</th>`).join('')}</tr></thead>
        <tbody>
          ${employees.map(emp => `
            <tr>
              ${printableColumns.map(c => {
                let val;
                if (c.field === 'salary') val = `KSh ${(parseFloat(emp.salary) || 0).toLocaleString()}`;
                else if (c.field === 'hired_on') val = emp.hired_on ? new Date(emp.hired_on).toLocaleDateString('en-GB') : 'N/A';
                else if (c.field === 'accessLevel') val = getAccessLevelDisplay(emp.accessLevel);
                else if (c.field === 'status') {
                   const cls = emp.status === 'active' ? 'status-active' : 'status-inactive';
                   val = `<span class="${cls}">${(emp.status || 'N/A').toUpperCase()}</span>`;
                   return `<td>${val}</td>`; 
                } else val = emp[c.field] ?? 'N/A';
                return `<td>${String(val).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</td>`;
              }).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    globalPrint({
      title: "Employee Report",
      content: tableHtml,
      styles: printStyles,
      orientation: "landscape",
      header: headerHtml,
      footer: `<div style="text-align: right; font-size: 9px; color: #888;">Generated: ${new Date().toLocaleString()}</div>`,
    });
  };

  // ==========================================
  // DATAGRID CONFIGURATION
  // ==========================================
  const columns = [
    { field: "id", headerName: "ID", width: 70, hideable: false },
    { field: "full_name", headerName: "Full Name", width: 200,
      renderCell: (params) => (
        <Link to={`/hrm/employee-profile/${params.row.id}`} style={{ textDecoration: 'none', color: safeColors.blueAccent.main, fontWeight: 600 }}>
          {params.value || 'Unknown'}
        </Link>
      ),
    },
    { field: "email", headerName: "Email", width: 200 },
    { field: "phone_number", headerName: "Phone", width: 130 },
    { field: "department", headerName: "Department", width: 160 },
    { field: "job_title", headerName: "Job Title", width: 160 },
    {
      field: "salary", headerName: "Salary", width: 120, type: "number",
      valueGetter: (params) => params?.row?.salary ? parseFloat(params.row.salary) || 0 : 0,
      valueFormatter: (params) => `KSh ${(params.value || 0).toLocaleString()}`,
    },
    {
      field: "status", headerName: "Status", width: 120,
      renderCell: (params) => {
        const isActive = params?.row?.status === "active";
        return (
          <Chip 
            label={(params?.row?.status || 'N/A').toUpperCase()} 
            size="small"
            sx={{ 
              fontWeight: 700, fontSize: '0.65rem', borderRadius: '6px', height: '20px',
              backgroundColor: isActive ? alpha(safeColors.greenAccent.main, 0.15) : alpha(safeColors.redAccent.main, 0.15),
              color: isActive ? safeColors.greenAccent.main : safeColors.redAccent.main
            }} 
          />
        );
      },
    },
    {
      field: "accessLevel", headerName: "Access Role", width: 140,
      valueGetter: (params) => getAccessLevelDisplay(params?.row?.accessLevel),
      renderCell: (params) => {
        const access = params?.value || 'user';
        let color = safeColors.blueAccent.main;
        let icon = <LockOpenOutlinedIcon fontSize="small" sx={{ mr: 0.5, fontSize: '1rem' }} />;
        
        if (access === "admin") {
          color = safeColors.orangeAccent.main;
          icon = <AdminPanelSettingsOutlinedIcon fontSize="small" sx={{ mr: 0.5, fontSize: '1rem' }} />;
        } else if (access === "manager") {
          color = safeColors.greenAccent.main;
          icon = <SecurityOutlinedIcon fontSize="small" sx={{ mr: 0.5, fontSize: '1rem' }} />;
        }

        return (
          <Chip 
            icon={icon}
            label={access.toUpperCase()} 
            size="small"
            sx={{ 
              fontWeight: 700, fontSize: '0.65rem', borderRadius: '6px', height: '22px',
              backgroundColor: alpha(color, 0.1), color: color,
              '& .MuiChip-icon': { color: color }
            }} 
          />
        );
      },
    },
    {
      field: "hired_on", headerName: "Hire Date", width: 120,
      valueFormatter: (params) => params?.row?.hired_on ? new Date(params.row.hired_on).toLocaleDateString('en-GB') : 'N/A',
    },
    { field: "national_id", headerName: "National ID", width: 130 },
    { field: "nssf_number", headerName: "NSSF No", width: 120 },
    { field: "kra_pin", headerName: "KRA Pin", width: 110 },
    { field: "nhif_number", headerName: "NHIF No", width: 120 },
    { field: "bank_account", headerName: "Bank Account", width: 140 },
    { field: "bank_name", headerName: "Bank Name", width: 120 },
    { field: "bank_branch", headerName: "Bank Branch", width: 120 },
    {
      field: "actions", headerName: "Actions", width: 100, hideable: false, sortable: false,
      renderCell: (params) => (
        <Stack direction="row" spacing={0.5}>
          <Tooltip title="Edit Employee">
            <IconButton size="small" onClick={() => navigate(`/hrm/edit-employee/${params.row.id}`)} sx={{ color: safeColors.blueAccent.main, backgroundColor: alpha(safeColors.blueAccent.main, 0.1) }}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete Employee">
            <IconButton size="small" onClick={() => handleDelete(params.row)} sx={{ color: safeColors.redAccent.main, backgroundColor: alpha(safeColors.redAccent.main, 0.1) }}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      ),
    },
  ];

  const dataGridColumns = columns.filter(col => columnVisibilityModel[col.field] !== false);

  const handleColumnVisibilityChange = (newModel) => {
    const finalModel = { ...newModel, actions: true };
    setColumnVisibilityModel(finalModel);
    secureStore.set(VISIBILITY_STORAGE_KEY, finalModel);
  };

  // Custom Toolbar
  const CustomToolbar = () => (
    <GridToolbarContainer sx={{ p: 1.5, display: 'flex', justifyContent: 'space-between', borderBottom: `1px solid ${alpha(safeColors.grey[500], 0.15)}` }}>
      <GridToolbarQuickFilter sx={{ width: '300px', '& .MuiInputBase-root': { fontFamily: appleFont } }} />
    </GridToolbarContainer>
  );

  // ==========================================
  // STYLES
  // ==========================================
  const summaryCardSx = {
    borderRadius: "20px",
    p: 2.5,
    backgroundColor: isDark ? alpha(safeColors.primary.main, 0.5) : '#ffffff',
    border: `1px solid ${isDark ? alpha(safeColors.grey[700], 0.4) : alpha(safeColors.grey[300], 0.5)}`,
    boxShadow: isDark ? '0 10px 30px rgba(0,0,0,0.2)' : '0 10px 30px rgba(0,0,0,0.03)',
  };

  const tableWrapperSx = {
    borderRadius: "20px",
    p: 0,
    overflow: 'hidden',
    backgroundColor: isDark ? theme.palette.background.default : '#ffffff',
    border: `1px solid ${isDark ? alpha(safeColors.grey[700], 0.4) : alpha(safeColors.grey[300], 0.5)}`,
    boxShadow: isDark ? '0 10px 30px rgba(0,0,0,0.2)' : '0 10px 30px rgba(0,0,0,0.03)',
    backgroundImage: 'none'
  };

  const actionButtonSx = {
    borderRadius: "10px",
    textTransform: "none",
    fontWeight: 600,
    boxShadow: "none",
  };

  return (
    <Box m={{ xs: "12px", md: "20px" }} sx={{ '& *': { fontFamily: appleFont } }}>
      <Header title="TEAM DIRECTORY" subtitle="Manage employees, roles, and enterprise access levels" />

      {/* ===== SUMMARY CARDS ===== */}
      <Box display="grid" gridTemplateColumns={{ xs: "1fr", md: "repeat(3, 1fr)" }} gap="20px" mb={3}>
        {[
          { title: "Total Headcount", value: employees.length, icon: <GroupOutlinedIcon fontSize="large" />, color: safeColors.blueAccent.main },
          { title: "Active Employees", value: employees.filter(e => e.status === "active").length, icon: <VerifiedUserOutlinedIcon fontSize="large" />, color: safeColors.greenAccent.main },
          { title: "Inactive / Suspended", value: employees.filter(e => e.status !== "active").length, icon: <PersonOffOutlinedIcon fontSize="large" />, color: safeColors.redAccent.main },
        ].map((stat, i) => (
          <Grow in={true} timeout={400 + (i * 150)} key={i}>
            <Paper elevation={0} sx={{ ...summaryCardSx, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="body2" color={safeColors.grey[400]} fontWeight={600} mb={0.5}>{stat.title}</Typography>
                <Typography variant="h3" fontWeight={800} color={safeColors.grey[100]}>{stat.value}</Typography>
              </Box>
              <Box sx={{ width: 60, height: 60, borderRadius: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center', background: `linear-gradient(135deg, ${alpha(stat.color, 0.2)} 0%, ${alpha(stat.color, 0.05)} 100%)`, color: stat.color }}>
                {stat.icon}
              </Box>
            </Paper>
          </Grow>
        ))}
      </Box>

      {/* ===== ACTION BAR & DATAGRID ===== */}
      <Fade in={true} timeout={800}>
        <Paper elevation={0} sx={tableWrapperSx}>
          
          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems="center" p={2.5} sx={{ borderBottom: `1px solid ${alpha(safeColors.grey[500], 0.15)}`, backgroundColor: isDark ? theme.palette.background.default : alpha(safeColors.grey[50], 0.5) }}>
            <Typography variant="h5" fontWeight={700} color={safeColors.grey[100]}>Employee Roster</Typography>
            
            <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap mt={{ xs: 2, md: 0 }}>
              <Button variant="contained" startIcon={<RefreshIcon />} onClick={() => fetchEmployees(true)} sx={{ ...actionButtonSx, backgroundColor: safeColors.blueAccent.main, '&:hover': { backgroundColor: safeColors.blueAccent.dark } }}>
                Sync Data
              </Button>
              <Button variant="outlined" startIcon={<GetAppIcon />} onClick={exportToExcel} sx={{ ...actionButtonSx, borderColor: alpha(safeColors.grey[500], 0.3), color: safeColors.grey[100] }}>
                Excel
              </Button>
              <Button variant="outlined" startIcon={<PrintIcon />} onClick={printEmployees} sx={{ ...actionButtonSx, borderColor: alpha(safeColors.grey[500], 0.3), color: safeColors.grey[100] }}>
                Print
              </Button>
              <Button variant="outlined" startIcon={<ViewColumnIcon />} onClick={(e) => setColumnMenuAnchor(e.currentTarget)} sx={{ ...actionButtonSx, borderColor: alpha(safeColors.grey[500], 0.3), color: safeColors.grey[100] }}>
                Columns
              </Button>
            </Stack>
          </Stack>

          <Box height="65vh" width="100%">
            <DataGrid
              rows={employees}
              columns={dataGridColumns}
              loading={loading}
              getRowId={(row) => row.id}
              density="compact" 
              pageSizeOptions={[20, 50, 100]}
              disableRowSelectionOnClick
              slots={{ toolbar: CustomToolbar }}
              initialState={{ pagination: { paginationModel: { pageSize: 20 } } }}
              sx={{
                border: "none",
                fontFamily: appleFont,
                backgroundColor: isDark ? theme.palette.background.default : '#ffffff',
                "& .MuiDataGrid-columnHeaders": {
                  backgroundColor: isDark ? theme.palette.background.default : safeColors.grey[50],
                  borderBottom: `1px solid ${alpha(safeColors.grey[500], 0.2)}`,
                },
                "& .MuiDataGrid-columnHeaderTitle": {
                  fontWeight: 700,
                  color: safeColors.grey[300],
                  textTransform: 'uppercase',
                  fontSize: '0.75rem',
                  letterSpacing: '0.5px'
                },
                "& .MuiDataGrid-row": {
                  transition: "background-color 0.2s ease",
                  '&:hover': { backgroundColor: alpha(safeColors.blueAccent.main, 0.04) }
                },
                "& .MuiDataGrid-cell": {
                  borderBottom: `1px solid ${alpha(safeColors.grey[500], 0.1)}`,
                  display: 'flex',
                  alignItems: 'center',
                  fontSize: '0.85rem',
                },
                "& .MuiDataGrid-footerContainer": {
                  borderTop: `1px solid ${alpha(safeColors.grey[500], 0.15)}`,
                  backgroundColor: isDark ? theme.palette.background.default : safeColors.grey[50],
                },
              }}
            />
          </Box>
        </Paper>
      </Fade>

      {/* ===== COLUMN VISIBILITY MENU ===== */}
      <Menu
        anchorEl={columnMenuAnchor}
        open={Boolean(columnMenuAnchor)}
        onClose={() => setColumnMenuAnchor(null)}
        PaperProps={{
          sx: {
            borderRadius: "16px",
            minWidth: 220,
            maxHeight: 400,
            background: isDark ? safeColors.primary.main : "#fff",
            border: `1px solid ${alpha(safeColors.grey[500], 0.2)}`,
            boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
            mt: 1
          },
        }}
      >
        <Box px={2} py={1}>
          <Typography variant="overline" fontWeight={700} color={safeColors.grey[400]}>Toggle Columns</Typography>
        </Box>
        <Divider sx={{ borderColor: alpha(safeColors.grey[500], 0.1) }} />
        {columns.filter(col => col.hideable !== false).map(col => (
          <MenuItem key={col.field} sx={{ py: 0.5 }}>
            <FormControlLabel
              control={
                <Checkbox
                  size="small"
                  checked={columnVisibilityModel[col.field] !== false}
                  onChange={(e) => handleColumnVisibilityChange({ ...columnVisibilityModel, [col.field]: e.target.checked })}
                  sx={{ color: safeColors.blueAccent.main, '&.Mui-checked': { color: safeColors.blueAccent.main } }}
                />
              }
              label={<Typography variant="body2" fontWeight={600}>{col.headerName}</Typography>}
            />
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
};

export default Team;