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
import { tokens } from "../../../theme";

const JobOpeningsList = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
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
    borderRadius: "18px",
    border: `1px solid ${theme.palette.mode === "dark" ? colors.grey[700] : colors.grey[800]}`,
    backgroundColor:
      theme.palette.mode === "dark" ? colors.primary[400] : colors.primary[100],
    boxShadow:
      theme.palette.mode === "dark"
        ? "0 10px 22px rgba(0,0,0,0.18)"
        : "0 10px 22px rgba(15,23,42,0.06)",
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
          <Typography sx={{ fontWeight: 700, color: colors.grey[100] }}>
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
        const sxMap = {
          draft: {
            backgroundColor:
              theme.palette.mode === "dark" ? colors.grey[700] : colors.grey[800],
            color: colors.grey[100],
          },
          open: {
            backgroundColor: colors.greenAccent[500],
            color: theme.palette.mode === "dark" ? colors.primary[900] : "#fff",
          },
          on_hold: {
            backgroundColor: colors.yellowAccent[500],
            color: colors.primary[900],
          },
          closed: {
            backgroundColor: colors.redAccent[500],
            color: "#fff",
          },
        };

        return (
          <Chip
            label={value ? value.replace("_", " ").toUpperCase() : "N/A"}
            size="small"
            sx={{
              fontWeight: 800,
              borderRadius: "999px",
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
                color: colors.blueAccent[500],
                backgroundColor:
                  theme.palette.mode === "dark"
                    ? "rgba(104,112,250,0.10)"
                    : "rgba(104,112,250,0.10)",
                "&:hover": {
                  backgroundColor:
                    theme.palette.mode === "dark"
                      ? "rgba(104,112,250,0.18)"
                      : "rgba(104,112,250,0.18)",
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
                color: colors.redAccent[500],
                backgroundColor:
                  theme.palette.mode === "dark"
                    ? "rgba(219,79,74,0.10)"
                    : "rgba(219,79,74,0.10)",
                "&:hover": {
                  backgroundColor:
                    theme.palette.mode === "dark"
                      ? "rgba(219,79,74,0.18)"
                      : "rgba(219,79,74,0.18)",
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
      <Paper
        elevation={0}
        sx={{
          mb: 3,
          p: { xs: 2, md: 3 },
          borderRadius: "20px",
          background:
            theme.palette.mode === "dark"
              ? `linear-gradient(135deg, ${colors.primary[400]} 0%, ${colors.primary[500]} 100%)`
              : `linear-gradient(135deg, ${colors.blueAccent[800]} 0%, ${colors.blueAccent[700]} 100%)`,
          color: "#fff",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            opacity: 0.08,
            backgroundImage:
              "radial-gradient(circle at 20% 20%, white 0, transparent 22%), radial-gradient(circle at 80% 30%, white 0, transparent 18%)",
          }}
        />
        <Box sx={{ position: "relative", zIndex: 1 }}>
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
                  borderRadius: "12px",
                  px: 2.5,
                  py: 1.1,
                  fontWeight: 800,
                  textTransform: "none",
                  backgroundColor: colors.greenAccent[500],
                  color: theme.palette.mode === "dark" ? colors.primary[900] : "#fff",
                  "&:hover": {
                    backgroundColor: colors.greenAccent[600],
                  },
                }}
              >
                New Opening
              </Button>

              <Button
                variant="outlined"
                startIcon={refreshing ? <CircularProgress size={18} /> : <RefreshIcon />}
                onClick={fetchOpenings}
                disabled={refreshing}
                sx={{
                  borderRadius: "12px",
                  px: 2.2,
                  py: 1.1,
                  fontWeight: 700,
                  textTransform: "none",
                  color: "#fff",
                  borderColor: "rgba(255,255,255,0.22)",
                  backgroundColor: "rgba(255,255,255,0.08)",
                  "&:hover": {
                    borderColor: "rgba(255,255,255,0.32)",
                    backgroundColor: "rgba(255,255,255,0.14)",
                  },
                }}
              >
                Refresh
              </Button>
            </Stack>

            <Typography sx={{ color: "rgba(255,255,255,0.88)", fontWeight: 600 }}>
              Total openings: {stats.total}
            </Typography>
          </Box>
        </Box>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 3 }}>
          {error}
        </Alert>
      )}

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
            <WorkOutlineIcon sx={{ color: colors.blueAccent[500] }} />
            <Typography variant="body2" sx={{ color: colors.grey[400], fontWeight: 700 }}>
              Total Openings
            </Typography>
            <Typography variant="h4" sx={{ color: colors.grey[100], fontWeight: 800 }}>
              {stats.total}
            </Typography>
          </Stack>
        </Paper>

        <Paper elevation={0} sx={statCardSx}>
          <Stack spacing={1}>
            <CheckCircleOutlineIcon sx={{ color: colors.greenAccent[500] }} />
            <Typography variant="body2" sx={{ color: colors.grey[400], fontWeight: 700 }}>
              Open
            </Typography>
            <Typography variant="h4" sx={{ color: colors.grey[100], fontWeight: 800 }}>
              {stats.open}
            </Typography>
          </Stack>
        </Paper>

        <Paper elevation={0} sx={statCardSx}>
          <Stack spacing={1}>
            <PauseCircleOutlineIcon sx={{ color: colors.yellowAccent[500] }} />
            <Typography variant="body2" sx={{ color: colors.grey[400], fontWeight: 700 }}>
              On Hold
            </Typography>
            <Typography variant="h4" sx={{ color: colors.grey[100], fontWeight: 800 }}>
              {stats.onHold + stats.draft}
            </Typography>
          </Stack>
        </Paper>

        <Paper elevation={0} sx={statCardSx}>
          <Stack spacing={1}>
            <ArchiveOutlinedIcon sx={{ color: colors.redAccent[500] }} />
            <Typography variant="body2" sx={{ color: colors.grey[400], fontWeight: 700 }}>
              Closed
            </Typography>
            <Typography variant="h4" sx={{ color: colors.grey[100], fontWeight: 800 }}>
              {stats.closed}
            </Typography>
          </Stack>
        </Paper>
      </Box>

      <Paper
        elevation={0}
        sx={{
          p: 1.5,
          borderRadius: "20px",
          backgroundColor:
            theme.palette.mode === "dark" ? colors.primary[400] : colors.primary[100],
          border: `1px solid ${
            theme.palette.mode === "dark" ? colors.grey[700] : colors.grey[800]
          }`,
          boxShadow:
            theme.palette.mode === "dark"
              ? "0 10px 24px rgba(0,0,0,0.18)"
              : "0 10px 24px rgba(15,23,42,0.06)",
        }}
      >
        <Box
          height="72vh"
          sx={{
            "& .MuiDataGrid-root": {
              border: "none",
              fontSize: "0.92rem",
              color: colors.grey[100],
            },
            "& .MuiDataGrid-columnHeaders": {
              borderBottom: "none",
              backgroundColor:
                theme.palette.mode === "dark" ? colors.primary[500] : colors.primary[200],
              borderRadius: "14px 14px 0 0",
            },
            "& .MuiDataGrid-columnHeaderTitle": {
              fontWeight: 800,
            },
            "& .MuiDataGrid-cell": {
              borderBottom: `1px solid ${
                theme.palette.mode === "dark" ? colors.grey[700] : colors.grey[800]
              }`,
              display: "flex",
              alignItems: "center",
            },
            "& .MuiDataGrid-row:hover": {
              backgroundColor:
                theme.palette.mode === "dark"
                  ? "rgba(255,255,255,0.03)"
                  : "rgba(15,23,42,0.03)",
            },
            "& .MuiDataGrid-toolbarContainer": {
              padding: "8px 8px 12px 8px",
              gap: "8px",
            },
            "& .MuiButton-text": {
              color: colors.grey[300],
            },
            "& .MuiDataGrid-footerContainer": {
              borderTop: "none",
              backgroundColor:
                theme.palette.mode === "dark" ? colors.primary[500] : colors.primary[200],
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