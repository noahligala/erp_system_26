// import React, { useState, useEffect, useCallback } from 'react';
// import {
//   Box, Button, Typography, useTheme, Chip, IconButton,
//   Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle,
//   TextField, Grid, Select, MenuItem, FormControl, InputLabel
// } from '@mui/material';
// import { DataGrid, GridToolbar } from '@mui/x-data-grid';
// import { tokens } from '../../theme';
// import { apiClient } from '../../api/apiClient'; // Import your apiClient
// import { toast, ToastContainer } from 'react-toastify'; // Import toast
// import Header from '../../components/Header';
// import { useNavigate } from 'react-router-dom';

// // Icons for actions
// import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
// import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
// import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';

// const Expenses = () => {
//   const theme = useTheme();
//   const colors = tokens(theme.palette.mode);
//   const navigate = useNavigate();

//   // --- State Management ---
//   const [expenses, setExpenses] = useState([]);
//   const [loading, setLoading] = useState(true); // Loading state
//   const [openDialog, setOpenDialog] = useState(null); // 'view', 'edit', 'delete'
//   const [selectedExpense, setSelectedExpense] = useState(null);
//   const [editFormData, setEditFormData] = useState({
//     id: '', date: '', vendor: '', category: '', amount: 0, status: 'Pending'
//   });

//   // --- API: Fetch Expenses ---
//   const fetchExpenses = useCallback(async () => {
//     setLoading(true);
//     try {
//       const { data } = await apiClient.get('/expenses');
//       setExpenses(data || []);
//     } catch (err) {
//       toast.error('Failed to fetch expenses.');
//       console.error(err);
//     } finally {
//       setLoading(false);
//     }
//   }, []);

//   useEffect(() => {
//     fetchExpenses();
//   }, [fetchExpenses]);


//   // --- Dialog Open Handlers ---
//   const handleOpenView = (expense) => {
//     setSelectedExpense(expense);
//     setOpenDialog('view');
//   };

//   const handleOpenEdit = (expense) => {
//     // Format date for the input[type="date"]
//     const formattedDate = expense.date ? new Date(expense.date).toISOString().split('T')[0] : '';
//     setSelectedExpense(expense);
//     setEditFormData({ ...expense, date: formattedDate }); // Pre-populate form
//     setOpenDialog('edit');
//   };

//   const handleOpenDelete = (expense) => {
//     setSelectedExpense(expense);
//     setOpenDialog('delete');
//   };

//   const handleCloseDialog = () => {
//     setOpenDialog(null);
//     setSelectedExpense(null);
//     // Reset form data
//     setEditFormData({ id: '', date: '', vendor: '', category: '', amount: 0, status: 'Pending' });
//   };

//   // --- Form & Action Handlers ---
//   const handleEditFormChange = (e) => {
//     const { name, value } = e.target;
//     setEditFormData(prev => ({ ...prev, [name]: value }));
//   };

//   // --- API: Update Expense ---
//   const handleEditSubmit = async (e) => {
//     e.preventDefault();
//     if (!selectedExpense) return;

//     try {
//       // Send the PUT request to the API
//       await apiClient.put(`/api/expenses/${selectedExpense.id}`, {
//         ...editFormData,
//         amount: parseFloat(editFormData.amount) // Ensure amount is a number
//       });
//       toast.success('Expense updated successfully!');
//       handleCloseDialog();
//       fetchExpenses(); // Re-fetch data to show changes
//     } catch (err) {
//       toast.error(err.response?.data?.message || 'Failed to update expense.');
//       console.error(err);
//     }
//   };

//   // --- API: Delete Expense ---
//   const handleDeleteConfirm = async () => {
//     if (!selectedExpense) return;

//     try {
//       await apiClient.delete(`/api/expenses/${selectedExpense.id}`);
//       toast.success('Expense deleted successfully.');
//       handleCloseDialog();
//       fetchExpenses(); // Re-fetch data to show changes
//     } catch (err) {
//       toast.error(err.response?.data?.message || 'Failed to delete expense.');
//       console.error(err);
//     }
//   };


//   // --- DataGrid Columns (Unchanged, but now displays API data) ---
//   const columns = [
//     { field: 'id', headerName: 'Expense ID', width: 120 },
//     { field: 'date', headerName: 'Date', width: 120 },
//     { field: 'vendor', headerName: 'Vendor', flex: 1 },
//     { field: 'category', headerName: 'Category', flex: 1 },
//     {
//       field: 'amount',
//       headerName: 'Amount',
//       width: 150,
//       type: 'number',
//       renderCell: (params) => (
//         <Typography color={colors.grey[100]}>
//           {/* Assuming KES, change as needed */}
//           KES {Number(params.value).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
//         </Typography>
//       )
//     },
//     {
//       field: 'status',
//       headerName: 'Status',
//       width: 150,
//       renderCell: (params) => {
//         const status = params.value;
//         let chipColor;
//         let chipTextColor = colors.grey[100];

//         if (status === 'Pending') {
//           chipColor = colors.grey[500];
//         } else if (status === 'Approved') {
//           chipColor = colors.blueAccent[700];
//         } else if (status === 'Paid') {
//           chipColor = colors.greenAccent[700];
//         } else {
//           chipColor = colors.redAccent[500];
//         }
//         return <Chip label={status} size="small" sx={{ backgroundColor: chipColor, color: chipTextColor, fontWeight: '600', width: '80px' }} />;
//       },
//     },
//     {
//       field: 'actions',
//       headerName: 'Actions',
//       width: 150,
//       sortable: false,
//       disableColumnMenu: true,
//       renderCell: (params) => (
//         <Box>
//           <IconButton onClick={() => handleOpenView(params.row)} title="View Expense">
//             <VisibilityOutlinedIcon />
//           </IconButton>
//           <IconButton onClick={() => handleOpenEdit(params.row)} title="Edit Expense">
//             <EditOutlinedIcon />
//           </IconButton>
//           <IconButton onClick={() => handleOpenDelete(params.row)} color="error" title="Delete Expense">
//             <DeleteOutlinedIcon />
//           </IconButton>
//         </Box>
//       )
//     }
//   ];

//   return (
//     <Box m="20px">
//       {/* --- HEADER --- */}
//       <Box display="flex" justifyContent="space-between" alignItems="center">
//         <Header title="EXPENSES" subtitle="Track and manage all company expenses" />
//         <Button
//           variant="contained"
//           onClick={() => navigate('/accounts/expenses/new')} // Navigate to Add Expense form
//         >
//           Add New Expense
//         </Button>
//       </Box>

//       {/* --- DATA GRID --- */}
//       <Box
//         height="75vh"
//         sx={{
//           "& .MuiDataGrid-root": { border: "none" },
//           "& .MuiDataGrid-cell": { borderBottom: "none" },
//           "& .MuiDataGrid-columnHeaders": { backgroundColor: colors.blueAccent[700], borderBottom: "none" },
//           "& .MuiDataGrid-virtualScroller": { backgroundColor: colors.primary[400] },
//           "& .MuiDataGrid-footerContainer": { borderTop: "none", backgroundColor: colors.blueAccent[700] },
//           "& .MuiDataGrid-toolbarContainer .MuiButton-text": { color: `${colors.grey[100]} !important` },
//           "& .MuiIconButton-root:hover": { color: colors.greenAccent[400] }
//         }}
//       >
//         <DataGrid
//           rows={expenses} // Use state variable
//           columns={columns}
//           loading={loading} // Show loading overlay
//           components={{ Toolbar: GridToolbar }}
//         />
//       </Box>

//       {/* --- DIALOGS --- */}
      
//       {/* --- VIEW DIALOG --- */}
//       <Dialog open={openDialog === 'view'} onClose={handleCloseDialog} fullWidth maxWidth="sm">
//         <DialogTitle sx={{ backgroundColor: colors.primary[400], fontWeight: "bold" }}>View Expense Details</DialogTitle>
//         <DialogContent sx={{ backgroundColor: colors.primary[400] }}>
//           {selectedExpense && (
//             <Grid container spacing={2} sx={{ mt: 2 }}>
//               <Grid item xs={6}><Typography color={colors.grey[300]}>Expense ID:</Typography></Grid>
//               <Grid item xs={6}><Typography>{selectedExpense.id}</Typography></Grid>
              
//               <Grid item xs={6}><Typography color={colors.grey[300]}>Date:</Typography></Grid>
//               <Grid item xs={6}><Typography>{selectedExpense.date}</Typography></Grid>
              
//               <Grid item xs={6}><Typography color={colors.grey[300]}>Vendor:</Typography></Grid>
//               <Grid item xs={6}><Typography>{selectedExpense.vendor}</Typography></Grid>
              
//               <Grid item xs={6}><Typography color={colors.grey[300]}>Category (Expense Account):</Typography></Grid>
//               <Grid item xs={6}><Typography>{selectedExpense.category}</Typography></Grid>
              
//               <Grid item xs={6}><Typography color={colors.grey[300]}>Amount:</Typography></Grid>
//               <Grid item xs={6}><Typography fontWeight="bold">KES {Number(selectedExpense.amount).toLocaleString()}</Typography></Grid>
              
//               <Grid item xs={6}><Typography color={colors.grey[300]}>Status:</Typography></Grid>
//               <Grid item xs={6}><Chip label={selectedExpense.status} size="small" /></Grid>

//               <Grid item xs={6}><Typography color={colors.grey[300]}>Submitted By:</Typography></Grid>
//               <Grid item xs={6}><Typography>{selectedExpense.user?.name || 'N/A'}</Typography></Grid>
              
//               <Grid item xs={6}><Typography color={colors.grey[300]}>Approved By:</Typography></Grid>
//               <Grid item xs={6}><Typography>{selectedExpense.approver?.name || 'N/A'}</Typography></Grid>
//             </Grid>
//           )}
//         </DialogContent>
//         <DialogActions sx={{ backgroundColor: colors.primary[400] }}>
//           <Button onClick={handleCloseDialog} color="secondary">Close</Button>
//         </DialogActions>
//       </Dialog>

//       {/* --- EDIT DIALOG --- */}
//       <Dialog open={openDialog === 'edit'} onClose={handleCloseDialog} fullWidth maxWidth="sm">
//         <DialogTitle sx={{ backgroundColor: colors.primary[400], fontWeight: "bold" }}>Edit Expense</DialogTitle>
//         <Box component="form" onSubmit={handleEditSubmit}>
//           <DialogContent sx={{ backgroundColor: colors.primary[400] }}>
//             <Grid container spacing={2} sx={{ mt: 1 }}>
//               <Grid item xs={12} sm={6}>
//                 <TextField
//                   fullWidth
//                   label="Date"
//                   type="date"
//                   name="date"
//                   value={editFormData.date}
//                   onChange={handleEditFormChange}
//                   InputLabelProps={{ shrink: true }}
//                 />
//               </Grid>
//               <Grid item xs={12} sm={6}>
//                 <TextField
//                   fullWidth
//                   label="Vendor"
//                   name="vendor"
//                   value={editFormData.vendor}
//                   onChange={handleEditFormChange}
//                 />
//               </Grid>
//               <Grid item xs={12} sm={6}>
//                 <TextField
//                   fullWidth
//                   label="Category (Expense Account)"
//                   name="category"
//                   value={editFormData.category}
//                   onChange={handleEditFormChange}
//                   helperText="Must match an existing Chart of Account name (e.g., 'Fuel')"
//                 />
//               </Grid>
//               <Grid item xs={12} sm={6}>
//                 <TextField
//                   fullWidth
//                   label="Amount"
//                   type="number"
//                   name="amount"
//                   value={editFormData.amount}
//                   onChange={handleEditFormChange}
//                   InputProps={{ inputProps: { min: 0, step: 0.01 } }}
//                 />
//               </Grid>
//               <Grid item xs={12}>
//                 <FormControl fullWidth>
//                   <InputLabel id="status-select-label">Status</InputLabel>
//                   <Select
//                     labelId="status-select-label"
//                     label="Status"
//                     name="status"
//                     value={editFormData.status}
//                     onChange={handleEditFormChange}
//                   >
//                     <MenuItem value="Pending">Pending</MenuItem>
//                     <MenuItem value="Approved">Approved</MenuItem>
//                     <MenuItem value="Paid">Paid</MenuItem>
//                     <MenuItem value="Rejected">Rejected</MenuItem>
//                   </Select>
//                 </FormControl>
//               </Grid>
//             </Grid>
//           </DialogContent>
//           <DialogActions sx={{ backgroundColor: colors.primary[400] }}>
//             <Button onClick={handleCloseDialog} color="secondary">Cancel</Button>
//             <Button type="submit" variant="contained" color="secondary">Save Changes</Button>
//           </DialogActions>
//         </Box>
//       </Dialog>

//       {/* --- DELETE DIALOG --- */}
//       <Dialog open={openDialog === 'delete'} onClose={handleCloseDialog}>
//         <DialogTitle sx={{ backgroundColor: colors.primary[400], fontWeight: "bold" }}>Confirm Delete</DialogTitle>
//         <DialogContent sx={{ backgroundColor: colors.primary[400] }}>
//           <DialogContentText color={colors.grey[100]}>
//             Are you sure you want to delete expense ID: <strong>{selectedExpense?.id}</strong>?
//             This action cannot be undone.
//           </DialogContentText>
//         </DialogContent>
//         <DialogActions sx={{ backgroundColor: colors.primary[400] }}>
//           <Button onClick={handleCloseDialog} color="secondary">Cancel</Button>
//           <Button onClick={handleDeleteConfirm} variant="contained" color="error">
//             Delete
//           </Button>
//         </DialogActions>
//       </Dialog>
      
//       {/* --- Toast Notification Container --- */}
//       <ToastContainer
//         position="bottom-right"
//         autoClose={3000}
//         theme={theme.palette.mode}
//       />
//     </Box>
//   );
// };

// export default Expenses;