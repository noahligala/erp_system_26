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
  Divider,
  Alert,
} from "@mui/material";
import {
  DataGrid,
  GridToolbarContainer,
  GridToolbarQuickFilter,
} from "@mui/x-data-grid";
import { Link as RouterLink } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";

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

import Header from "../../components/Header";
import { useAuth } from "../../api/AuthProvider";
import { secureStore } from "../../utils/storage";
import { globalPrint } from "../../utils/print";

const VISIBILITY_STORAGE_KEY = "team_column_visibility";

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
  actions: true,
};

const getAccessLevelDisplay = (accessLevel) => {
  switch (accessLevel) {
    case "OWNER":
      return "admin";
    case "MANAGER":
      return "manager";
    default:
      return "user";
  }
};

const formatCurrency = (value) => {
  const amount = Number(value || 0);

  return `KSh ${amount.toLocaleString()}`;
};

const formatDate = (value) => {
  if (!value) return "N/A";

  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) return "N/A";

  return date.toLocaleDateString("en-GB");
};

const Team = () => {
  const theme = useTheme();
  const styles = theme.team;
  const navigate = useNavigate();
  const { apiClient, isAuthenticated, user } = useAuth();

  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [columnMenuAnchor, setColumnMenuAnchor] = useState(null);

  const [columnVisibilityModel, setColumnVisibilityModel] = useState(
    secureStore.get(VISIBILITY_STORAGE_KEY) || defaultColumnModel
  );

  const fetchEmployees = useCallback(
    async (forceRefresh = false) => {
      const cachedData = secureStore.get("employees_data");
      const cacheTimestamp = secureStore.get("employees_timestamp");
      const cacheExpiry = 5 * 60 * 1000;

      if (
        !forceRefresh &&
        cachedData &&
        cacheTimestamp &&
        Date.now() - cacheTimestamp < cacheExpiry
      ) {
        setEmployees(cachedData);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        if (!isAuthenticated) {
          throw new Error("Not authenticated");
        }

        const response = await apiClient.get("/employees");

        let employeesData = response.data;

        if (employeesData?.status === "success") {
          employeesData = employeesData.data;
        }

        if (!Array.isArray(employeesData)) {
          throw new Error("Invalid data format received from server");
        }

        setEmployees(employeesData);
        secureStore.set("employees_data", employeesData);
        secureStore.set("employees_timestamp", Date.now());
      } catch (err) {
        console.error(err);

        setError(err.message || "Failed to fetch employees");

        const fallback = secureStore.get("employees_data");

        if (fallback) {
          setEmployees(fallback);
        }
      } finally {
        setLoading(false);
      }
    },
    [apiClient, isAuthenticated]
  );

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const handleDelete = useCallback(
    async (employee) => {
      const confirmed = window.confirm(
        `Are you sure you want to permanently delete ${employee.email}?`
      );

      if (!confirmed) return;

      try {
        await apiClient.delete(`/employees/${employee.id}`);
        fetchEmployees(true);
      } catch (err) {
        console.error("Delete failed:", err);
        alert(`Failed to delete employee: ${err.message}`);
      }
    },
    [apiClient, fetchEmployees]
  );

  const exportToExcel = useCallback(() => {
    if (!employees.length) {
      alert("No data to export");
      return;
    }

    const dataToExport = employees.map((emp) => ({
      ID: emp.id,
      "Full Name": emp.full_name || "N/A",
      Email: emp.email,
      "Phone Number": emp.phone_number || "N/A",
      Department: emp.department || "N/A",
      "Job Title": emp.job_title || "N/A",
      Salary: formatCurrency(emp.salary),
      Status: emp.status || "N/A",
      "Access Level": getAccessLevelDisplay(emp.accessLevel),
      "Hire Date": formatDate(emp.hired_on),
      "National ID": emp.national_id || "N/A",
      "NSSF Number": emp.nssf_number || "N/A",
      "KRA Pin": emp.kra_pin || "N/A",
      "NHIF Number": emp.nhif_number || "N/A",
      "Bank Account": emp.bank_account || "N/A",
      "Bank Name": emp.bank_name || "N/A",
      "Bank Branch": emp.bank_branch || "N/A",
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(wb, ws, "Employees");
    XLSX.writeFile(wb, "employees_data.xlsx");
  }, [employees]);

  const handleColumnVisibilityChange = useCallback((newModel) => {
    const finalModel = {
      ...newModel,
      actions: true,
    };

    setColumnVisibilityModel(finalModel);
    secureStore.set(VISIBILITY_STORAGE_KEY, finalModel);
  }, []);

  const columns = useMemo(
    () => [
      {
        field: "id",
        headerName: "ID",
        width: 70,
        hideable: false,
      },
      {
        field: "full_name",
        headerName: "Full Name",
        width: 210,
        renderCell: (params) => (
          <Box
            component={RouterLink}
            to={`/hrm/employee-profile/${params.row.id}`}
            sx={styles.nameLink}
          >
            {params.value || "Unknown"}
          </Box>
        ),
      },
      {
        field: "email",
        headerName: "Email",
        width: 220,
      },
      {
        field: "phone_number",
        headerName: "Phone",
        width: 135,
      },
      {
        field: "department",
        headerName: "Department",
        width: 160,
      },
      {
        field: "job_title",
        headerName: "Job Title",
        width: 170,
      },
      {
        field: "salary",
        headerName: "Salary",
        width: 125,
        type: "number",
        valueGetter: (params) =>
          params?.row?.salary ? Number(params.row.salary) || 0 : 0,
        valueFormatter: (params) => formatCurrency(params.value),
      },
      {
        field: "status",
        headerName: "Status",
        width: 125,
        renderCell: (params) => {
          const isActive = params?.row?.status === "active";

          return (
            <Chip
              label={(params?.row?.status || "N/A").toUpperCase()}
              size="small"
              sx={styles.statusChip(isActive)}
            />
          );
        },
      },
      {
        field: "accessLevel",
        headerName: "Access Role",
        width: 150,
        valueGetter: (params) => getAccessLevelDisplay(params?.row?.accessLevel),
        renderCell: (params) => {
          const access = params?.value || "user";

          let icon = <LockOpenOutlinedIcon />;

          if (access === "admin") {
            icon = <AdminPanelSettingsOutlinedIcon />;
          } else if (access === "manager") {
            icon = <SecurityOutlinedIcon />;
          }

          return (
            <Chip
              icon={icon}
              label={access.toUpperCase()}
              size="small"
              sx={styles.accessChip(access)}
            />
          );
        },
      },
      {
        field: "hired_on",
        headerName: "Hire Date",
        width: 125,
        valueFormatter: (params) => formatDate(params?.row?.hired_on),
      },
      {
        field: "national_id",
        headerName: "National ID",
        width: 130,
      },
      {
        field: "nssf_number",
        headerName: "NSSF No",
        width: 120,
      },
      {
        field: "kra_pin",
        headerName: "KRA Pin",
        width: 120,
      },
      {
        field: "nhif_number",
        headerName: "NHIF No",
        width: 120,
      },
      {
        field: "bank_account",
        headerName: "Bank Account",
        width: 145,
      },
      {
        field: "bank_name",
        headerName: "Bank Name",
        width: 135,
      },
      {
        field: "bank_branch",
        headerName: "Bank Branch",
        width: 135,
      },
      {
        field: "actions",
        headerName: "Actions",
        width: 105,
        hideable: false,
        sortable: false,
        renderCell: (params) => (
          <Box sx={styles.rowActionStack}>
            <Tooltip title="Edit Employee">
              <IconButton
                size="small"
                onClick={() => navigate(`/hrm/edit-employee/${params.row.id}`)}
                sx={styles.rowActionButton(theme.palette.info.main)}
              >
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            <Tooltip title="Delete Employee">
              <IconButton
                size="small"
                onClick={() => handleDelete(params.row)}
                sx={styles.rowActionButton(theme.palette.error.main)}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        ),
      },
    ],
    [handleDelete, navigate, styles, theme.palette.error.main, theme.palette.info.main]
  );

  const dataGridColumns = useMemo(
    () => columns.filter((col) => columnVisibilityModel[col.field] !== false),
    [columns, columnVisibilityModel]
  );

  const summaryStats = useMemo(
    () => [
      {
        title: "Total Headcount",
        value: employees.length,
        icon: <GroupOutlinedIcon />,
        color: theme.palette.info.main,
      },
      {
        title: "Active Employees",
        value: employees.filter((emp) => emp.status === "active").length,
        icon: <VerifiedUserOutlinedIcon />,
        color: theme.palette.success.main,
      },
      {
        title: "Inactive / Suspended",
        value: employees.filter((emp) => emp.status !== "active").length,
        icon: <PersonOffOutlinedIcon />,
        color: theme.palette.error.main,
      },
    ],
    [employees, theme.palette.error.main, theme.palette.info.main, theme.palette.success.main]
  );

  const CustomToolbar = useCallback(
    () => (
      <GridToolbarContainer sx={styles.toolbar}>
        <GridToolbarQuickFilter sx={styles.quickFilter} />
      </GridToolbarContainer>
    ),
    [styles.toolbar, styles.quickFilter]
  );

  const printEmployees = useCallback(() => {
    if (!employees.length) {
      alert("No data to print");
      return;
    }

    const printableColumns = columns.filter(
      (column) =>
        column.field !== "actions" &&
        columnVisibilityModel[column.field] !== false
    );

    const company = {
      name: user?.company?.name || "",
      tagline: user?.company?.tagline || "",
      logoUrl: user?.company?.logoUrl || "",
      tel: user?.company?.tel || "",
      email: user?.company?.email || "",
      poBox: user?.company?.poBox || "",
    };

    const contactInfo = [
      company.poBox ? `P.O. Box: ${company.poBox}` : "",
      company.tel ? `Tel: ${company.tel}` : "",
      company.email ? `Email: ${company.email}` : "",
    ]
      .filter(Boolean)
      .join(" | ");

    const headerHtml = `
      <div style="text-align: center; padding-bottom: 10px; font-family: Helvetica, Arial, sans-serif;">
        ${
          company.logoUrl
            ? `<img src="${company.logoUrl}" alt="Logo" style="width: 70px; height: 70px; object-fit: contain; margin-bottom: 5px;" />`
            : ""
        }
        ${
          company.name
            ? `<h2 style="margin: 0; font-size: 20px; color: #1a1a1a;">${company.name.toUpperCase()}</h2>`
            : ""
        }
        ${
          company.tagline
            ? `<p style="margin: 2px 0; font-size: 11px; color: #666;">${company.tagline}</p>`
            : ""
        }
        ${
          contactInfo
            ? `<p style="margin: 6px 0; font-size: 12px; color: #444;">${contactInfo}</p>`
            : ""
        }
        <hr style="margin: 15px 0 10px; border: none; border-top: 1px solid #ddd;" />
        <h3 style="margin: 5px 0 0; font-size: 16px; color: #333;">EMPLOYEE DIRECTORY REPORT</h3>
      </div>
    `;

    const printStyles = `
      table { width: 100%; border-collapse: collapse; font-family: Helvetica, Arial, sans-serif; font-size: 10px; margin-top: 10px; }
      th, td { border: 1px solid #ececec; padding: 8px 6px; text-align: left; }
      th { background-color: #f8f9fa !important; font-weight: bold; color: #333; }
      tr:nth-child(even) { background-color: #fdfdfd; }
      .status-active { color: #2e7d32; font-weight: bold; }
      .status-inactive { color: #c62828; font-weight: bold; }
    `;

    const tableHtml = `
      <table>
        <thead>
          <tr>
            ${printableColumns
              .map((column) => `<th>${column.headerName}</th>`)
              .join("")}
          </tr>
        </thead>
        <tbody>
          ${employees
            .map(
              (employee) => `
                <tr>
                  ${printableColumns
                    .map((column) => {
                      let value;

                      if (column.field === "salary") {
                        value = formatCurrency(employee.salary);
                      } else if (column.field === "hired_on") {
                        value = formatDate(employee.hired_on);
                      } else if (column.field === "accessLevel") {
                        value = getAccessLevelDisplay(employee.accessLevel);
                      } else if (column.field === "status") {
                        const cls =
                          employee.status === "active"
                            ? "status-active"
                            : "status-inactive";

                        return `<td><span class="${cls}">${(
                          employee.status || "N/A"
                        ).toUpperCase()}</span></td>`;
                      } else {
                        value = employee[column.field] ?? "N/A";
                      }

                      return `<td>${String(value)
                        .replace(/&/g, "&amp;")
                        .replace(/</g, "&lt;")
                        .replace(/>/g, "&gt;")}</td>`;
                    })
                    .join("")}
                </tr>
              `
            )
            .join("")}
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
  }, [employees, columns, columnVisibilityModel, user]);

  return (
    <Box sx={styles.shell}>
      <Paper elevation={0} sx={styles.headerCard}>
        <Header
          title="TEAM DIRECTORY"
          subtitle="Manage employees, roles, and enterprise access levels"
        />
      </Paper>

      {error && (
        <Alert severity="warning" sx={styles.errorAlert}>
          {error}
        </Alert>
      )}

      <Box sx={styles.summaryGrid}>
        {summaryStats.map((stat) => (
          <Paper
            key={stat.title}
            elevation={0}
            sx={styles.summaryCard(stat.color)}
          >
            <Box minWidth={0}>
              <Typography sx={styles.summaryTitle}>{stat.title}</Typography>
              <Typography sx={styles.summaryValue}>{stat.value}</Typography>
            </Box>

            <Box sx={styles.summaryIcon(stat.color)}>{stat.icon}</Box>
          </Paper>
        ))}
      </Box>

      <Paper elevation={0} sx={styles.tableWrapper}>
        <Box sx={styles.actionBar}>
          <Box>
            <Typography sx={styles.tableTitle}>Employee Roster</Typography>
            <Typography sx={styles.tableSubtitle}>
              Search, filter, export, and manage staff records.
            </Typography>
          </Box>

          <Box sx={styles.actionStack}>
            <Button
              variant="contained"
              startIcon={<RefreshIcon />}
              onClick={() => fetchEmployees(true)}
              sx={styles.primaryActionButton}
            >
              Sync Data
            </Button>

            <Button
              variant="outlined"
              startIcon={<GetAppIcon />}
              onClick={exportToExcel}
              sx={styles.secondaryActionButton}
            >
              Excel
            </Button>

            <Button
              variant="outlined"
              startIcon={<PrintIcon />}
              onClick={printEmployees}
              sx={styles.secondaryActionButton}
            >
              Print
            </Button>

            <Button
              variant="outlined"
              startIcon={<ViewColumnIcon />}
              onClick={(event) => setColumnMenuAnchor(event.currentTarget)}
              sx={styles.secondaryActionButton}
            >
              Columns
            </Button>
          </Box>
        </Box>

        <Box sx={styles.gridViewport}>
          <DataGrid
            rows={employees}
            columns={dataGridColumns}
            loading={loading}
            getRowId={(row) => row.id}
            density="compact"
            pageSizeOptions={[20, 50, 100]}
            disableRowSelectionOnClick
            slots={{ toolbar: CustomToolbar }}
            initialState={{
              pagination: {
                paginationModel: {
                  pageSize: 20,
                },
              },
            }}
            sx={styles.dataGrid}
          />
        </Box>
      </Paper>

      <Menu
        anchorEl={columnMenuAnchor}
        open={Boolean(columnMenuAnchor)}
        onClose={() => setColumnMenuAnchor(null)}
        PaperProps={{
          sx: styles.columnMenuPaper,
        }}
      >
        <Box sx={styles.columnMenuHeader}>
          <Typography sx={styles.columnMenuTitle}>Toggle Columns</Typography>
        </Box>

        <Divider />

        {columns
          .filter((column) => column.hideable !== false)
          .map((column) => (
            <MenuItem key={column.field} sx={styles.columnMenuItem}>
              <FormControlLabel
                control={
                  <Checkbox
                    size="small"
                    checked={columnVisibilityModel[column.field] !== false}
                    onChange={(event) =>
                      handleColumnVisibilityChange({
                        ...columnVisibilityModel,
                        [column.field]: event.target.checked,
                      })
                    }
                    sx={styles.columnCheckbox}
                  />
                }
                label={
                  <Typography sx={styles.columnLabel}>
                    {column.headerName}
                  </Typography>
                }
              />
            </MenuItem>
          ))}
      </Menu>
    </Box>
  );
};

export default Team;