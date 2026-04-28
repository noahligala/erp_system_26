import { useMemo } from 'react';
import { IconButton, Chip } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

// Exported as a hook so it can access theme/colors if needed, 
// but keeps the array stable via useMemo.
export const useTeamColumns = (onEdit, onDelete) => {
  return useMemo(() => [
    { field: 'id', headerName: 'ID', width: 90 },
    { field: 'name', headerName: 'Full Name', flex: 1 },
    { field: 'email', headerName: 'Email', flex: 1 },
    { 
      field: 'status', 
      headerName: 'Status', 
      width: 120,
      renderCell: (params) => (
        <Chip 
          label={params.value} 
          color={params.value === 'active' ? 'success' : 'default'} 
          size="small" 
        />
      )
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      sortable: false,
      renderCell: (params) => (
        <>
          <IconButton onClick={() => onEdit(params.row)} size="small">
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton onClick={() => onDelete(params.row)} size="small" color="error">
            <DeleteIcon fontSize="small" />
          </IconButton>
        </>
      ),
    },
  ], [onEdit, onDelete]); // Only recreates if handlers change
};