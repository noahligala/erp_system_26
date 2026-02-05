// src/scenes/accounting/reports/Team.jsx
import React, {
  useEffect,
  useState,
  useCallback
} from "react";
import {
  Box,
  Typography,
  useTheme,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Checkbox,
  FormControlLabel
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { tokens } from "../../theme";
import AdminPanelSettingsOutlinedIcon from "@mui/icons-material/AdminPanelSettingsOutlined";
import LockOpenOutlinedIcon from "@mui/icons-material/LockOpenOutlined";
import SecurityOutlinedIcon from "@mui/icons-material/SecurityOutlined";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import Header from "../../components/Header";
import RefreshIcon from "@mui/icons-material/Refresh";
import GetAppIcon from "@mui/icons-material/GetApp"; // Export icon
import PrintIcon from "@mui/icons-material/Print";
import ViewColumnIcon from "@mui/icons-material/ViewColumn";
import { useAuth } from "../../api/AuthProvider";
import { secureStore } from "../../utils/storage";
import * as XLSX from "xlsx";
import { Link } from "react-router-dom";
// ADDED: Import globalPrint
import { globalPrint } from "../../utils/print"; 

// Key for storing column visibility preferences
const VISIBILITY_STORAGE_KEY = "team_column_visibility";

const Team = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const { apiClient, isAuthenticated, user } = useAuth();

  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [columnMenuAnchor, setColumnMenuAnchor] = useState(null);

  // Default visibility model, includes actions: true
  const defaultColumnModel = {
    id: true,
    full_name: true,
    email: true,
    phone_number: true,
    department: true,
    job_title: true,
    salary: true,
    status: true,
    accessLevel: true,
    hired_on: false,
    national_id: false,
    nssf_number: false,
    kra_pin: false,
    nhif_number: false,
    bank_account: false,
    bank_name: false,
    bank_branch: false,
    actions: true // Actions column is visible by default
  };

  const [columnVisibilityModel, setColumnVisibilityModel] = useState(
    secureStore.get(VISIBILITY_STORAGE_KEY) || defaultColumnModel
  );

  const getAccessLevelDisplay = (accessLevel) => {
    switch (accessLevel) {
      case 'OWNER': return 'admin';
      case 'MANAGER': return 'manager';
      default: return 'user';
    }
  };

  const handleDelete = (employee) => {
    if (window.confirm(`Are you sure you want to delete ${employee.email}?`)) {
      apiClient.delete(`/employees/${employee.id}`)
        .then(() => {
          alert(`Deleted employee: ${employee.email}`);
          fetchEmployees(true); // Refresh data after delete
        })
        .catch(err => {
          console.error("Delete failed:", err);
          alert(`Failed to delete employee: ${err.message}`);
        });
    }
  };

  const columns = [
    { field: "id", headerName: "ID", width: 60, hideable: false },
    { field: "full_name", headerName: "Full Name", width: 160,
      renderCell: (params) => (
        <Link
          to={`/hrm/employee-profile/${params.row.id}`} // Link to the profile page
          style={{ textDecoration: 'none', color: colors.greenAccent[300] }}
        >
          {params.value}
        </Link>
      ),
     },
    { field: "email", headerName: "Email", width: 180 },
    { field: "phone_number", headerName: "Phone", width: 100 },
    { field: "department", headerName: "Department", width: 150 },
    { field: "job_title", headerName: "Job Title", width: 140 },
    {
      field: "salary",
      headerName: "Salary",
      width: 100,
      type: "number",
      // FIX: Ensure valueGetter returns a clean number (0 if undefined/null/bad format)
      valueGetter: (params) => {
        const rawSalary = params?.row?.salary;
        // Convert to float, defaulting to 0 if conversion fails or value is missing
        return rawSalary ? parseFloat(rawSalary) || 0 : 0;
      },
      // FIX: Ensure valueFormatter correctly formats the numeric value received from valueGetter
      valueFormatter: (params) => {
        const numericValue = params.value;
        if (typeof numericValue !== 'number' || isNaN(numericValue)) return 'KSh 0';
        return `KSh ${numericValue.toLocaleString()}`;
      },
    },
    {
      field: "status",
      headerName: "Status",
      width: 100,
      renderCell: (params) => {
        const status = params?.row?.status || 'N/A';
        return (
          <Box width="90%" m="0 auto" p="3px" display="flex" justifyContent="center"
               backgroundColor={status === "active" ? colors.greenAccent[600] : colors.redAccent[600]}
               borderRadius="4px">
            <Typography color={colors.grey[100]} sx={{ textTransform: "capitalize", fontSize: '0.75rem', fontWeight: '500' }}>
              {status}
            </Typography>
          </Box>
        );
      },
    },
    {
      field: "hired_on",
      headerName: "Hire Date",
      width: 110,
      valueFormatter: (params) => {
        const value = params?.row?.hired_on;
        if (!value) return 'N/A';
        try { return new Date(value).toLocaleDateString('en-GB'); } catch { return 'N/A'; }
      },
    },
    { field: "national_id", headerName: "National ID", width: 130 },
    { field: "nssf_number", headerName: "NSSF No", width: 120 },
    { field: "kra_pin", headerName: "KRA Pin", width: 110 },
    { field: "nhif_number", headerName: "NHIF No", width: 120 },
    { field: "bank_account", headerName: "Bank Account", width: 140 },
    { field: "bank_name", headerName: "Bank Name", width: 120 },
    { field: "bank_branch", headerName: "Bank Branch", width: 120 },
    {
      field: "accessLevel",
      headerName: "Access",
      width: 100,
      valueGetter: (params) => getAccessLevelDisplay(params?.row?.accessLevel),
      renderCell: (params) => {
        const access = params?.value || 'user';
        return (
          <Box width="90%" m="0 auto" p="3px" display="flex" justifyContent="center"
               backgroundColor={
                 access === "admin" ? colors.greenAccent[600] :
                 access === "manager" ? colors.greenAccent[700] : colors.blueAccent[700]
               } borderRadius="4px">
            {access === "admin" && <AdminPanelSettingsOutlinedIcon sx={{ fontSize: '1rem' }} />}
            {access === "manager" && <SecurityOutlinedIcon sx={{ fontSize: '1rem' }} />}
            {access === "user" && <LockOpenOutlinedIcon sx={{ fontSize: '1rem' }} />}
            <Typography color={colors.grey[100]} sx={{ ml: "3px", textTransform: "capitalize", fontSize: '0.75rem', fontWeight: '500' }}>
              {access}
            </Typography>
          </Box>
        );
      },
    },
    {
      field: "actions",
      headerName: "Actions",
      width: 100,
      hideable: false, // Ensure action column is never hidden by checkbox toggle
      renderCell: (params) => (
        <Box display="flex" justifyContent="center" gap={1} width="100%">
          <Link to={`/hrm/edit-employee/${params.row.id}`}>
            <IconButton
              size="small"
              sx={{ color: colors.blueAccent[400] }}
              title="Edit Employee"
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Link>
          
          <IconButton
            size="small"
            onClick={() => handleDelete(params.row)}
            sx={{ color: colors.redAccent[500] }}
            title="Delete Employee"
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      ),
    },
  ];

  const visibleColumns = columns.filter(col => columnVisibilityModel[col.field] !== false);
  const dataGridColumns = columns.filter(col => columnVisibilityModel[col.field] !== false);


  const fetchEmployees = useCallback(async (forceRefresh = false) => {
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
      if (!Array.isArray(employeesData)) {
         console.error("Invalid data format received:", employeesData);
         throw new Error('Invalid data format received from server');
      }
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
  }, [apiClient, isAuthenticated]);

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

  /**
   * Print function using the centralized globalPrint utility.
   * This generates the HTML content/header/footer and passes it to globalPrint.
   */
  const printEmployees = () => {
    if (!employees.length) { alert('No data to print'); return; }

    // Filter columns, excluding 'actions' for the printed report
    const printableColumns = visibleColumns.filter(c => c.field !== 'actions');
    
    // --- Letterhead/Header Content (Passed to globalPrint.header) ---
    const company = {
        name: user?.company?.name || "LIGCO TECHNOLOGIES",
        tagline: user?.company?.tagline || "Your Innovative Tech Partner",
        logoUrl: user?.company?.logoUrl || "https://via.placeholder.com/70x70.png?text=LOGO",
        tel: user?.company?.tel || "0725611832",
        email: user?.company?.email || "example@ligco.tech",
        website: user?.company?.website || "www.ligco.tech",
        poBox: user?.company?.poBox || "P.O. Box 1234 - Kitale",
    };

    const headerHtml = `
      <div style="text-align: center; padding-bottom: 5px; font-family: 'Source Sans Pro', sans-serif;">
        <img src="${company.logoUrl}" alt="Logo" style="width: 70px; height: 70px; object-fit: contain; margin-bottom: 5px;" />
        <h2 style="margin: 0; font-size: 18px; letter-spacing: 1px; color: #1a1a1a;">${company.name.toUpperCase()}</h2>
        ${company.tagline ? `<p style="margin: 2px 0; font-size: 10px; color: #555;">${company.tagline}</p>` : ''}
        <p style="margin: 4px 0; font-size: 12px; color: #444; line-height: 1.4;">
          ${company.poBox ? `P.O. Box: ${company.poBox}` : ''} | Tel: ${company.tel || 'N/A'} | Email: ${company.email || 'N/A'}
        </p>
        <hr style="margin: 10px 0 0; border: none; border-top: 1px solid rgba(0, 0, 0, 0.15);" />
        <h3 style="margin: 5px 0 0; font-size: 14px; color: #333;">EMPLOYEE LIST REPORT</h3>
      </div>
    `;

    // --- Table CSS Styles (Passed to globalPrint.styles) ---
    const printStyles = `
      /* General Table Styling */
      table { width: 100%; border-collapse: collapse; font-size: 9pt; page-break-inside: auto; margin-top: 10px; }
      th, td { border: 1px solid #ddd; padding: 4px 6px; text-align: left; word-wrap: break-word; }
      th { background-color: #f2f2f2 !important; font-weight: bold; white-space: nowrap; }
      tr { page-break-inside: avoid; page-break-after: auto; }
      tr:nth-child(even) { background-color: #f9f9f9; }
      
      /* Status Styling */
      .status-active { background-color: #d4edda !important; color: #155724 !important; padding: 1px 4px; border-radius: 3px; font-size: 7pt; display: inline-block; }
      .status-inactive { background-color: #f8d7da !important; color: #721c24 !important; padding: 1px 4px; border-radius: 3px; font-size: 7pt; display: inline-block; }
    `;

    // --- Table Content (Passed to globalPrint.content) ---
    const tableHeaderHtml = `
       <thead>
         <tr>${printableColumns.map(c => `<th>${c.headerName}</th>`).join('')}</tr>
       </thead>
    `;

    const tableBodyHtml = `
      <tbody>
        ${employees.map(emp => `
          <tr>
            ${printableColumns.map(c => {
              let value;
              let isStatus = false;
              if (c.field === 'full_name') value = emp.full_name || 'N/A';
              else if (c.field === 'salary') value = `KSh ${(parseFloat(emp.salary) || 0).toLocaleString()}`;
              else if (c.field === 'hired_on') value = emp.hired_on ? new Date(emp.hired_on).toLocaleDateString('en-GB') : 'N/A';
              else if (c.field === 'accessLevel') value = getAccessLevelDisplay(emp.accessLevel);
              else if (c.field === 'status') {
                 isStatus = true;
                 const status = emp.status || 'N/A';
                 const cls = status === 'active' ? 'status-active' : 'status-inactive';
                 // Wrap status in a styled div/span
                 value = `<span class="${cls}">${status.toUpperCase()}</span>`;
              }
              else value = emp[c.field] ?? 'N/A';

              const escapedValue = isStatus ? value : String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
              return `<td>${escapedValue}</td>`;
            }).join('')}
          </tr>
        `).join('')}
      </tbody>
    `;

    // Final printable HTML structure is just the <table>
    const printableContent = `
      <table>
        ${tableHeaderHtml}
        ${tableBodyHtml}
      </table>
    `;

    // Call globalPrint
    globalPrint({
      title: "Employee Report",
      content: printableContent,
      styles: printStyles,
      orientation: "landscape",
      header: headerHtml, 
      footer: `
        <div style="text-align: right; font-size: 8pt; color: #555;">
          Report Generated: ${new Date().toLocaleString()}
        </div>
      `,
    });
  };

  const handleColumnVisibilityChange = (newModel) => {
    // Ensure the 'actions' column remains visible in the DataGrid itself
    const finalModel = {
      ...newModel,
      actions: true 
    };
    setColumnVisibilityModel(finalModel);
    secureStore.set(VISIBILITY_STORAGE_KEY, finalModel);
  };

  useEffect(() => { fetchEmployees(); }, [fetchEmployees]);

  return (
    <Box m="20px">
      <Header title="TEAM" subtitle="Managing the Team Members" />

      {/* --- Action Bar --- */}
      <Box display="flex" justifyContent="space-between" mb={2}>
        <Box />
        <Box>
          <IconButton onClick={() => fetchEmployees(true)} sx={{ mr: 1 }} title="Refresh Data"><RefreshIcon /></IconButton>
          <IconButton onClick={exportToExcel} sx={{ mr: 1 }} title="Export to Excel"><GetAppIcon /></IconButton>
         <IconButton onClick={printEmployees} sx={{ mr: 1 }} title="Print Table"><PrintIcon /></IconButton>
          <IconButton onClick={(e) => setColumnMenuAnchor(e.currentTarget)} title="Toggle Columns"><ViewColumnIcon /></IconButton>
          <Menu anchorEl={columnMenuAnchor} open={Boolean(columnMenuAnchor)} onClose={() => setColumnMenuAnchor(null)}>
            {columns
              .filter(col => col.hideable !== false)
              .map(col => (
              <MenuItem key={col.field}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={columnVisibilityModel[col.field] !== false}
                      onChange={(e) => handleColumnVisibilityChange({
                        ...columnVisibilityModel,
                        [col.field]: e.target.checked
                      })}
                    />
                  }
                  // The actions column is hidden in the menu, but visible in the DataGrid
                  label={col.headerName}
                />
              </MenuItem>
            ))}
          </Menu>
        </Box>
      </Box>
      {/* --- End Action Bar --- */}

      <Box height="780px" sx={{
        width: '100%',
        overflowX: 'auto',
        "& .MuiDataGrid-root": { border: "none" },
        "& .MuiDataGrid-cell": { borderBottom: "none", py: 0.5, fontSize: '0.85rem' },
        "& .MuiDataGrid-columnHeaders": { backgroundColor: colors.blueAccent[700], borderBottom: "none" },
         "& .MuiDataGrid-columnHeader": { py: 1, fontSize: '0.875rem' },
        "& .MuiDataGrid-virtualScroller": { backgroundColor: colors.primary[400] },
        "& .MuiDataGrid-footerContainer": { borderTop: "none", backgroundColor: colors.blueAccent[700] },
        "& .MuiCheckbox-root": { color: `${colors.greenAccent[200]} !important` },
        "& .MuiDataGrid-row": {
          transition: "transform 0.1s ease-in-out, box-shadow 0.1s ease-in-out",
        },
        "& .MuiDataGrid-row:hover": {
          transform: "translateY(-1px)",
          boxShadow: `0 2px 8px rgba(0,0,0,0.2)`,
          backgroundColor: `${colors.primary[500]} !important`,
          zIndex: 10,
        },
      }}>
        <DataGrid
          rows={employees}
          columns={dataGridColumns} // Use dataGridColumns which is filtered by visibility model
          loading={loading}
          getRowId={(row) => row.id}
          disableSelectionOnClick
          // We handle visibility manually with the column prop, but keep the model for state tracking
          // columnVisibilityModel={columnVisibilityModel} 
          // onColumnVisibilityModelChange={handleColumnVisibilityChange} // Removing native handler to control it manually
          pageSizeOptions={[19, 50, 100]}
          initialState={{
            pagination: {
              paginationModel: { pageSize: 19 },
            },
          }}
          density="compact"
        />
      </Box>
      {error && <Typography color={colors.redAccent[500]} sx={{ mt: 1 }}>{error}</Typography>}
    </Box>
  );
};

export default Team;

