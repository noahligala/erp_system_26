// src/scenes/accounting/reports/ArchivedReportsList.jsx

import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Paper,
  CircularProgress,
  IconButton,
  Tooltip,
  Chip,
} from "@mui/material";
import { Visibility, Archive, Refresh } from "@mui/icons-material";
import { apiClient } from "../../../api/apiClient";
import { toast } from "react-toastify";
import Header from "../../../components/Header";
import { useNavigate } from "react-router-dom"; 
import { DateTime } from "luxon"; // ⬅️ FIX: Added missing import

const formatCurrency = (amount) => {
  return (amount ?? 0).toLocaleString("en-US", {
    style: "currency",
    currency: "KES",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const ArchivedReportsList = () => {
  const [archives, setArchives] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchArchives();
  }, []);

  const fetchArchives = async () => {
    setLoading(true);
    try {
      // Assuming the backend route for listArchivedReports is '/accounting/archived-reports'
      const res = await apiClient.get("/accounting/archived-reports");
      // The backend returns paginated data, so we grab the 'data' array
      setArchives(res.data.data || []);
    } catch (e) {
      console.error("Error fetching archives:", e);
      toast.error("Failed to fetch archived reports.");
      setArchives([]);
    } finally {
      setLoading(false);
    }
  };

  const handleView = (id) => {
    // Navigate to the viewer component route
    navigate(`/accounting/reports/archive/${id}`);
  };

  return (
    <Box m={3}>
      <Header
        title="Archived Financial Reports"
        subtitle="Immutable records of finalized P&L and Balance Sheet statements."
      />

      <Box display="flex" justifyContent="flex-end" mb={2}>
        <Tooltip title="Refresh Archive List">
          <IconButton onClick={fetchArchives} disabled={loading}>
            <Refresh />
          </IconButton>
        </Tooltip>
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" mt={5}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Report ID</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Period/Date</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Archived Date</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {archives.length > 0 ? (
                archives.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>{a.id}</TableCell>
                    <TableCell>{a.report_type}</TableCell>
                    <TableCell>
                      {a.start_date ? `${a.start_date} to ` : 'As of '}
                      {a.end_date}
                    </TableCell>
                    <TableCell>
                      <Chip label={a.status} size="small" color="success" />
                    </TableCell>
                    <TableCell>
                      {DateTime.fromISO(a.created_at).toFormat('MMM d, yyyy h:mm a')}
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="View Immutable Report">
                        <IconButton color="primary" onClick={() => handleView(a.id)}>
                          <Visibility />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    No archived reports found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default ArchivedReportsList;