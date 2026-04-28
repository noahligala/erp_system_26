import React from 'react';
import { DataGrid } from '@mui/x-data-grid';
import { Box, LinearProgress } from '@mui/material';

const TeamTable = ({ 
  data, 
  columns, 
  loading, 
  paginationModel, 
  setPaginationModel, 
  totalRowCount 
}) => {
  return (
    <Box sx={{ height: 600, width: '100%', mt: 2 }}>
      <DataGrid
        rows={data}
        columns={columns}
        loading={loading}
        // Server-side pagination config
        paginationMode="server"
        rowCount={totalRowCount}
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
        pageSizeOptions={[10, 25, 50, 100]}
        // Virtualization tuning
        rowBuffer={5}
        rowThreshold={10}
        disableRowSelectionOnClick
        slots={{
          loadingOverlay: LinearProgress,
        }}
        sx={{
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
        }}
      />
    </Box>
  );
};

// Memoize the entire table so it only re-renders if its explicit props change
export default React.memo(TeamTable);