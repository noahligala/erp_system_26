import React, { useState, useCallback } from 'react';
import { Box, Typography, Snackbar, Alert, Dialog, DialogTitle, DialogActions, Button } from '@mui/material';
import { useEmployees } from '../../hooks/useEmployees';
import { useTeamColumns } from '../../config/teamColumns';
import TeamTable from './components/TeamTable';
import TeamSummaryCards from './components/TeamSummaryCards';
import TeamToolbar from './components/TeamToolbar';
// import { exportToExcel } from '../../utils/exportEmployees';

const TeamPage = () => {
  // 1. State Management
  const { 
    data, loading, error, paginationModel, setPaginationModel, totalRowCount, deleteEmployee 
  } = useEmployees();
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [toast, setToast] = useState({ open: false, message: '', type: 'info' });

  // 2. Handlers (Memoized)
  const handleEdit = useCallback((row) => {
    // Open edit modal logic
    console.log("Edit user", row);
  }, []);

  const handleDeleteClick = useCallback((row) => {
    setSelectedUser(row);
    setDeleteDialogOpen(true); // Replaces window.confirm()
  }, []);

  const confirmDelete = useCallback(async () => {
    try {
      await deleteEmployee(selectedUser.id);
      setToast({ open: true, message: 'User deleted successfully', type: 'success' });
    } catch (err) {
      setToast({ open: true, message: 'Failed to delete user', type: 'error' });
    } finally {
      setDeleteDialogOpen(false);
      setSelectedUser(null);
    }
  }, [selectedUser, deleteEmployee]);

  // 3. Column Configuration
  const columns = useTeamColumns(handleEdit, handleDeleteClick);

  // 4. Render
  if (error) return <Typography color="error">Critical Error: {error}</Typography>;

  return (
    <Box p={3}>
      <Typography variant="h4" mb={3} fontWeight="bold">Team Management</Typography>
      
      {/* Decoupled sub-components */}
      <TeamSummaryCards total={totalRowCount} />
      <TeamToolbar onExport={() => { /* exportToExcel(data) */ }} />
      
      <TeamTable 
        data={data} 
        columns={columns} 
        loading={loading}
        paginationModel={paginationModel}
        setPaginationModel={setPaginationModel}
        totalRowCount={totalRowCount}
      />

      {/* Non-blocking UI for deletions */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Are you sure you want to delete {selectedUser?.name}?</DialogTitle>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={confirmDelete}>Delete</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={toast.open} autoHideDuration={4000} onClose={() => setToast({...toast, open: false})}>
        <Alert severity={toast.type}>{toast.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default TeamPage;