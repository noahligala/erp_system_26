// src/scenes/hrm/JobOpenings.jsx

import React, { useEffect, useState, useCallback } from "react";
import {
  Box,
  Typography,
  IconButton,
  Tooltip,
  Button,
  Chip,
  CircularProgress,
} from "@mui/material";
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
} from "@mui/icons-material";
import { DataGrid, GridToolbar } from "@mui/x-data-grid";
import Header from "../../../components/Header.jsx";
import  {apiClient } from "../../../api/apiClient.js"; // Axios wrapper

const JobOpeningsList = () => {
  const [openings, setOpenings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pageSize, setPageSize] = useState(10);

  const fetchOpenings = useCallback(async () => {
    setRefreshing(true);
    try {
      const response = await apiClient.get("/job-openings");
      if (response.data.status === "success") {
        setOpenings(response.data.data.data || []); // Laravel pagination returns data.data
      } else {
        console.error("Unexpected response:", response.data);
      }
    } catch (err) {
      console.error("Error fetching job openings:", err);
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
      await {apiClient}.delete(`/job-openings/${id}`);
      setOpenings((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      console.error("Error deleting job opening:", err);
      alert("Failed to archive job opening.");
    }
  };

  const handleEdit = (id) => {
    // Example navigation — replace with your route system
    window.location.href = `/hrm/job-openings/${id}/edit`;
  };

  const columns = [
    { field: "id", headerName: "ID", width: 70 },

    {
      field: "title",
      headerName: "Job Title",
      flex: 1,
      minWidth: 180,
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
      width: 120,
      valueGetter: (params) => params?.row?.positions_to_fill ?? "N/A",
    },
    {
      field: "status",
      headerName: "Status",
      width: 140,
      renderCell: (params) => {
        const colorMap = {
          draft: "default",
          open: "success",
          on_hold: "warning",
          closed: "error",
        };
        return (
          <Chip
            label={params.value?.toUpperCase() || "N/A"}
            color={colorMap[params.value] || "default"}
            size="small"
          />
        );
      },
    },
    {
      field: "posted_date",
      headerName: "Posted Date",
      width: 150,
      valueGetter: (params) =>
        params?.row?.posted_date
          ? new Date(params.row.posted_date).toLocaleDateString()
          : "N/A",
    },
    {
      field: "closing_date",
      headerName: "Closing Date",
      width: 150,
      valueGetter: (params) =>
        params?.row?.closing_date
          ? new Date(params.row.closing_date).toLocaleDateString()
          : "N/A",
    },
    {
      field: "actions",
      headerName: "Actions",
      width: 130,
      sortable: false,
      renderCell: (params) => (
        <Box>
          <Tooltip title="Edit">
            <IconButton color="primary" onClick={() => handleEdit(params.row.id)}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Archive">
            <IconButton color="error" onClick={() => handleDelete(params.row.id)}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  return (
    <Box m="20px">
      <Header title="Job Openings" subtitle="Manage all available job openings" />

      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => (window.location.href = "/hrm/job-openings/new")}
        >
          New Opening
        </Button>

        <Tooltip title="Refresh">
          <IconButton onClick={fetchOpenings} disabled={refreshing}>
            {refreshing ? <CircularProgress size={20} /> : <RefreshIcon />}
          </IconButton>
        </Tooltip>
      </Box>

      <Box
        height="70vh"
        sx={{
          "& .MuiDataGrid-root": {
            border: "none",
            fontSize: "0.9rem",
          },
          "& .MuiDataGrid-cell": {
            borderBottom: "1px solid #f0f0f0",
          },
          "& .MuiDataGrid-columnHeaders": {
            backgroundColor: "#f4f6f8",
            fontWeight: "bold",
          },
        }}
      >
        <DataGrid
          rows={openings}
          columns={columns}
          pageSize={pageSize}
          onPageSizeChange={(newSize) => setPageSize(newSize)}
          pagination
          slots={{ toolbar: GridToolbar }}
          loading={loading}
          disableRowSelectionOnClick
        />
      </Box>
    </Box>
  );
};

export default JobOpeningsList;
