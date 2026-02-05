import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  useTheme,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress 
} from '@mui/material';
import { tokens } from '../../theme'; // Corrected path
import Header from '../../components/Header'; // Corrected path
import { useAuth } from '../../api/AuthProvider'; // Corrected path
import { toast } from 'react-toastify'; 

const ChartOfAccounts = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const { apiClient } = useAuth(); // Get the authenticated API client

  // State for accounts data and loading status
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch data from the backend when the component mounts
  useEffect(() => {
    if (apiClient) {
      setLoading(true);
      apiClient.get('/accounting/chart-of-accounts')
        .then(response => {
          setAccounts(response.data || []);
        })
        .catch(error => {
          console.error("Failed to fetch chart of accounts:", error);
          toast.error("Failed to load chart of accounts.");
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [apiClient]); // Re-run if apiClient changes

  // Helper to format currency
  const formatCurrency = (amount) => {
    return (amount || 0).toLocaleString('en-KE', { 
      style: 'currency', 
      currency: 'KES', 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
  };

  return (
    <Box m="20px">
      <Header title="CHART OF ACCOUNTS" subtitle="List of all financial accounts" />
      <Box mb={2} display="flex" justifyContent="flex-end">
        <Button variant="contained" color="secondary">
          Add New Account
        </Button>
      </Box>
      <Box
        height="75vh"
        sx={{
          // Custom cell styling for account types
          "& .account-type--asset": { color: colors.greenAccent[300] },
          "& .account-type--liability": { color: colors.redAccent[300] },
          "& .account-type--equity": { color: colors.blueAccent[300] },
          "& .account-type--revenue": { color: colors.greenAccent[200] },
          "& .account-type--expense": { color: colors.redAccent[200] },
          
          // Table styling
          "& .MuiPaper-root": {
            backgroundColor: colors.primary[400],
          },
          "& .MuiTableHead-root": {
            backgroundColor: colors.blueAccent[700],
          },
          "& .MuiTableCell-root": {
            borderBottom: `1px solid ${colors.grey[700]}`,
          },
        }}
      >
        <TableContainer component={Paper} sx={{ height: '100%' }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Account Code</TableCell>
                <TableCell>Account Name</TableCell>
                <TableCell>Account Type</TableCell>
                <TableCell>Balance</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 5 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : (
                accounts.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.account_code}</TableCell>
                    <TableCell>{row.account_name}</TableCell>
                    <TableCell className={`account-type--${row.account_type.toLowerCase()}`}>
                      {row.account_type}
                    </TableCell>
                    <TableCell>
                      <Typography color={row.balance >= 0 ? colors.greenAccent[500] : colors.redAccent[500]}>
                        {formatCurrency(row.balance)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Box>
  );
};

export default ChartOfAccounts;