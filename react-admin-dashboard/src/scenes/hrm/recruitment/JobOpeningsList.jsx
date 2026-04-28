import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  Box,
  Typography,
  IconButton,
  Tooltip,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  useTheme,
  Alert,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
  WorkOutline as WorkOutlineIcon,
  CheckCircleOutline as CheckCircleOutlineIcon,
  PauseCircleOutline as PauseCircleOutlineIcon,
  ArchiveOutlined as ArchiveOutlinedIcon,
} from "@mui/icons-material";
import { DataGrid, GridToolbar } from "@mui/x-data-grid";
import { useNavigate } from "react-router-dom";
import Header from "../../../components/Header.jsx";
import { apiClient } from "../../../api/apiClient.js";

const JobOpeningsList = () => {
  const theme = useTheme();
  const navigate = useNavigate();

  const [openings, setOpenings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pageSize, setPageSize] = useState(10);
  const [error, setError] = useState("");

  const fetchOpenings = useCallback(async () => {
    setRefreshing(true);
    setError("");

    try {
      const response = await apiClient.get("/job-openings");

      if (response.data?.status === "success") {
        setOpenings(response.data?.data?.data || []);
      } else {
        setOpenings([]);
        setError("Unexpected response while loading job openings.");
      }
    } catch (err) {
      console.error("Error fetching job openings:", err);
      setError(err.response?.data?.message || "Failed to load job openings.");
      setOpenings([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchOpenings();
  }, [fetchOpenings]);

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to archive this job opening?")) return;

    try {
      await apiClient.delete(`/job-openings/${id}`);
      setOpenings((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      console.error("Error deleting job opening:", err);
      alert(err.response?.data?.message || "Failed to archive job opening.");
    }
  };

  const handleEdit = (id) => {
    navigate(`/recruitment/job-openings/${id}/edit`);
  };

  const stats = useMemo(() => {
    const total = openings.length;
    const open = openings.filter((item) => item.status === "open").length;
    const draft = openings.filter((item) => item.status === "draft").length;
    const onHold = openings.filter((item) => item.status === "on_hold").length;
    const closed = openings.filter((item) => item.status === "closed").length;

    return { total, open, draft, onHold, closed };
  }, [openings]);

  const statCardSx = {
    p: 2.2,
    borderRadius: "16px",
    border: `1px solid ${theme.palette.divider}`,
    backgroundColor: theme.palette.background.paper,
    height: "100%",
  };

  const columns = [
    {
      field: "id",
      headerName: "ID",
      width: 80,
    },
    {
      field: "title",
      headerName: "Job Title",
      flex: 1.3,
      minWidth: 220,
      renderCell: (params) => (
        <Box sx={{ py: 1 }}>
          <Typography sx={{ fontWeight: 500, color: theme.palette.text.primary }}>
            {params.value || "N/A"}
          </Typography>
        </Box>
      ),
    },
    {
      field: "department",
      headerName: "Department",
      flex: 1,
      minWidth: 150,
      valueGetter: (params) => {
        const dept = params?.row?.department;
        if (dept && typeof dept === "object" && dept.name) return dept.name;
        if (typeof dept === "string") return dept;
        return "N/A";
      },
    },
    {
      field: "jobTitle",
      headerName: "Internal Role",
      flex: 1,
      minWidth: 150,
      valueGetter: (params) => {
        const jt = params?.row?.jobTitle;
        if (jt && typeof jt === "object" && jt.name) return jt.name;
        if (typeof jt === "string") return jt;
        return "N/A";
      },
    },
    {
      field: "positions_to_fill",
      headerName: "Positions",
      width: 110,
      align: "center",
      headerAlign: "center",
      valueGetter: (params) => params?.row?.positions_to_fill ?? "N/A",
    },
    {
      field: "status",
      headerName: "Status",
      width: 140,
      renderCell: (params) => {
        const value = params.value;
        
        // Lightweight translucent semantic mapping
        const sxMap = {
          draft: {
            backgroundColor: alpha(theme.palette.text.secondary, 0.1),
            color: theme.palette.text.secondary,
          },
          open: {
            backgroundColor: alpha(theme.palette.success.main, 0.12),
            color: theme.palette.success.main,
          },
          on_hold: {
            backgroundColor: alpha(theme.palette.warning.main, 0.12),
            color: theme.palette.warning.main,
          },
          closed: {
            backgroundColor: alpha(theme.palette.error.main, 0.12),
            color: theme.palette.error.main,
          },
        };

        return (
          <Chip
            label={value ? value.replace("_", " ").toUpperCase() : "N/A"}
            size="small"
            sx={{
              fontWeight: 500,
              borderRadius: "6px",
              ...sxMap[value],
            }}
          />
        );
      },
    },
    {
      field: "posted_date",
      headerName: "Posted Date",
      width: 140,
      valueGetter: (params) =>
        params?.row?.posted_date
          ? new Date(params.row.posted_date).toLocaleDateString()
          : "N/A",
    },
    {
      field: "closing_date",
      headerName: "Closing Date",
      width: 140,
      valueGetter: (params) =>
        params?.row?.closing_date
          ? new Date(params.row.closing_date).toLocaleDateString()
          : "N/A",
    },
    {
      field: "actions",
      headerName: "Actions",
      width: 140,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <Stack direction="row" spacing={0.5} alignItems="center">
          <Tooltip title="Edit opening">
            <IconButton
              size="small"
              onClick={() => handleEdit(params.row.id)}
              sx={{
                color: theme.palette.primary.main,
                backgroundColor: alpha(theme.palette.primary.main, 0.08),
                "&:hover": {
                  backgroundColor: alpha(theme.palette.primary.main, 0.15),
                },
              }}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          <Tooltip title="Archive opening">
            <IconButton
              size="small"
              onClick={() => handleDelete(params.row.id)}
              sx={{
                color: theme.palette.error.main,
                backgroundColor: alpha(theme.palette.error.main, 0.08),
                "&:hover": {
                  backgroundColor: alpha(theme.palette.error.main, 0.15),
                },
              }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      ),
    },
  ];

  return (
    <Box m={{ xs: "12px", md: "20px" }}>
      {/* Banner */}
      <Paper
        elevation={0}
        sx={{
          mb: 3,
          p: { xs: 2, md: 3 },
          borderRadius: "16px",
          // Modern vibrant gradient utilizing your new primary colors
          background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${alpha(theme.palette.primary.main, 0.8)} 100%)`,
          color: "#fff",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            opacity: 0.1,
            backgroundImage:
              "radial-gradient(circle at 20% 20%, white 0, transparent 22%), radial-gradient(circle at 80% 30%, white 0, transparent 18%)",
          }}
        />
        <Box sx={{ position: "relative", zIndex: 1, "& .MuiTypography-root": { color: "#fff" } }}>
          <Header
            title="JOB OPENINGS"
            subtitle="Manage, review, edit, and track all recruitment openings"
          />

          <Box
            display="flex"
            justifyContent="space-between"
            alignItems={{ xs: "stretch", md: "center" }}
            flexDirection={{ xs: "column", md: "row" }}
            gap={2}
            mt={2}
          >
            <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => navigate("/recruitment/job-openings/new-opening")}
                sx={{
                  backgroundColor: theme.palette.success.main,
                  color: "#fff",
                  "&:hover": {
                    backgroundColor: theme.palette.success.dark || theme.palette.success.main,
                  },
                }}
              >
                New Opening
              </Button>

              <Button
                variant="outlined"
                startIcon={refreshing ? <CircularProgress size={18} color="inherit" /> : <RefreshIcon />}
                onClick={fetchOpenings}
                disabled={refreshing}
                sx={{
                  color: "#fff",
                  borderColor: "rgba(255,255,255,0.3)",
                  backgroundColor: "rgba(255,255,255,0.08)",
                  "&:hover": {
                    borderColor: "rgba(255,255,255,0.5)",
                    backgroundColor: "rgba(255,255,255,0.15)",
                  },
                }}
              >
                Refresh
              </Button>
            </Stack>

            <Typography sx={{ color: "rgba(255,255,255,0.9)", fontWeight: 500 }}>
              Total openings: {stats.total}
            </Typography>
          </Box>
        </Box>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: "12px" }}>
          {error}
        </Alert>
      )}

      {/* Stats Grid */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, minmax(0, 1fr))",
            lg: "repeat(4, minmax(0, 1fr))",
          },
          gap: 2,
          mb: 3,
        }}
      >
        <Paper elevation={0} sx={statCardSx}>
          <Stack spacing={1}>
            <WorkOutlineIcon sx={{ color: theme.palette.primary.main }} />
            <Typography variant="body2" sx={{ color: theme.palette.text.secondary, fontWeight: 500 }}>
              Total Openings
            </Typography>
            <Typography variant="h4" sx={{ color: theme.palette.text.primary, fontWeight: 600 }}>
              {stats.total}
            </Typography>
          </Stack>
        </Paper>

        <Paper elevation={0} sx={statCardSx}>
          <Stack spacing={1}>
            <CheckCircleOutlineIcon sx={{ color: theme.palette.success.main }} />
            <Typography variant="body2" sx={{ color: theme.palette.text.secondary, fontWeight: 500 }}>
              Open
            </Typography>
            <Typography variant="h4" sx={{ color: theme.palette.text.primary, fontWeight: 600 }}>
              {stats.open}
            </Typography>
          </Stack>
        </Paper>

        <Paper elevation={0} sx={statCardSx}>
          <Stack spacing={1}>
            <PauseCircleOutlineIcon sx={{ color: theme.palette.warning.main }} />
            <Typography variant="body2" sx={{ color: theme.palette.text.secondary, fontWeight: 500 }}>
              On Hold
            </Typography>
            <Typography variant="h4" sx={{ color: theme.palette.text.primary, fontWeight: 600 }}>
              {stats.onHold + stats.draft}
            </Typography>
          </Stack>
        </Paper>

        <Paper elevation={0} sx={statCardSx}>
          <Stack spacing={1}>
            <ArchiveOutlinedIcon sx={{ color: theme.palette.error.main }} />
            <Typography variant="body2" sx={{ color: theme.palette.text.secondary, fontWeight: 500 }}>
              Closed
            </Typography>
            <Typography variant="h4" sx={{ color: theme.palette.text.primary, fontWeight: 600 }}>
              {stats.closed}
            </Typography>
          </Stack>
        </Paper>
      </Box>

      {/* DataGrid */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 1, sm: 2 },
          borderRadius: "16px",
          backgroundColor: theme.palette.background.paper,
          border: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Box
          height="72vh"
          sx={{
            "& .MuiDataGrid-root": {
              border: "none",
            },
            "& .MuiDataGrid-columnHeaders": {
              borderBottom: `1px solid ${theme.palette.divider}`,
              backgroundColor: alpha(theme.palette.background.default, 0.4), // Very subtle contrast
            },
            "& .MuiDataGrid-columnHeaderTitle": {
              fontWeight: 600,
            },
            "& .MuiDataGrid-cell": {
              borderBottom: `1px solid ${theme.palette.divider}`,
            },
            "& .MuiDataGrid-row:hover": {
              backgroundColor: theme.palette.action.hover,
            },
            "& .MuiDataGrid-footerContainer": {
              borderTop: `1px solid ${theme.palette.divider}`,
              backgroundColor: "transparent",
            },
          }}
        >
          <DataGrid
            rows={openings}
            columns={columns}
            pageSizeOptions={[5, 10, 20, 50]}
            paginationModel={{ pageSize, page: 0 }}
            onPaginationModelChange={(model) => setPageSize(model.pageSize)}
            slots={{ toolbar: GridToolbar }}
            loading={loading}
            disableRowSelectionOnClick
          />
        </Box>
      </Paper>
    </Box>
  );
};

export default JobOpeningsList;