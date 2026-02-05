import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  useTheme,
  Grid,
  TextField,
  Button,
  CircularProgress,
  Divider,
  IconButton,
  Tooltip,
  Stack,
  Autocomplete,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
} from '@mui/material';
import { AddCircleOutline, RemoveCircleOutline, PrintOutlined } from '@mui/icons-material';
import { tokens } from '../../../theme';
import Header from '../../../components/Header';
import {apiClient} from '../../../api/apiClient';
import { toast } from 'react-toastify';
import { useAuth } from '../../../api/AuthProvider';
import { useReactToPrint } from 'react-to-print';

// --- Helper Functions ---
const formatCurrency = (amount) => {
  const numericAmount = Number(amount);
  if (isNaN(numericAmount)) {
    return ''; // Return empty for invalid numbers
  }
  return numericAmount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
        const date = new Date(dateString + 'T00:00:00'); // Ensure local date
        if (isNaN(date.getTime())) return dateString;
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch { return dateString; }
};

const todayDate = new Date().toISOString().split('T')[0];

// --- Printable Voucher Component ---
const VoucherView = React.forwardRef(({ voucherData, colors }, ref) => {
  if (!voucherData) return null;

  const totalAmount = voucherData.lines.reduce((sum, line) => sum + Number(line.amount || 0), 0);
  const paymentAccountLabel = voucherData.paymentAccountLabel || 'N/A';
  const generatedMeta = voucherData.metadata || {}; // Get metadata

  return (
    <Box ref={ref} sx={{ p: 4, fontFamily: 'sans-serif', color: '#000' }}>
      {/* Header */}
      <Box textAlign="center" mb={4}>
        <Typography variant="h4" fontWeight="bold" sx={{ color: '#000' }}>Ligco Technologies</Typography>
        <Typography variant="h5" sx={{ color: '#000' }}>PAYMENT VOUCHER</Typography>
        <Typography variant="body2" sx={{ color: '#555' }}>PV No: {generatedMeta.serial || 'N/A'}</Typography>
      </Box>

      {/* Voucher Details */}
      <Grid container spacing={1} mb={3}>
        <Grid item xs={6}>
          <Typography variant="body2"><strong>Date:</strong> {formatDate(voucherData.transaction_date)}</Typography>
        </Grid>
        <Grid item xs={6}>
          <Typography variant="body2" sx={{textAlign: 'right'}}><strong>Paid To:</strong> {voucherData.payee}</Typography>
        </Grid>
        <Grid item xs={12}>
          <Typography variant="body2"><strong>Description:</strong> {voucherData.description || 'N/A'}</Typography>
        </Grid>
         <Grid item xs={12}>
          <Typography variant="body2"><strong>Paid From:</strong> {paymentAccountLabel}</Typography>
        </Grid>
      </Grid>

      {/* Expense Lines Table */}
      <TableContainer component={Paper} elevation={0} variant="outlined" sx={{ mb: 2 }}>
        <Table size="small">
          <thead>
            <TableRow sx={{ backgroundColor: '#eee' }}>
              <TableCell sx={{ fontWeight: 'bold' }}>Account Code</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Account Name</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Description</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold' }}>Amount (KES)</TableCell>
            </TableRow>
          </thead>
          <TableBody>
            {voucherData.lines.map((line, index) => (
              <TableRow key={index}>
                <TableCell>{line.accountCode || 'N/A'}</TableCell>
                <TableCell>{line.accountLabel || 'N/A'}</TableCell>
                <TableCell>{line.description}</TableCell>
                <TableCell align="right">{formatCurrency(line.amount)}</TableCell>
              </TableRow>
            ))}
             {/* Total Row */}
             <TableRow sx={{ backgroundColor: '#eee' }}>
               <TableCell colSpan={3} align="right" sx={{ fontWeight: 'bold' }}>TOTAL:</TableCell>
               <TableCell align="right" sx={{ fontWeight: 'bold' }}>{formatCurrency(totalAmount)}</TableCell>
             </TableRow>
          </TableBody>
        </Table>
      </TableContainer>

      {/* Approval / Footer Section (Customize as needed) */}
      <Grid container spacing={2} mt={4} sx={{ fontSize: '0.8rem', color: '#333' }}>
        <Grid item xs={4} sx={{ borderTop: '1px solid #ccc', pt: 1 }}>Prepared By: {generatedMeta.generatedBy || 'N/A'}</Grid>
        <Grid item xs={4} sx={{ borderTop: '1px solid #ccc', pt: 1 }}>Checked By: ...........................</Grid>
        <Grid item xs={4} sx={{ borderTop: '1px solid #ccc', pt: 1 }}>Approved By: .........................</Grid>
         <Grid item xs={12} sx={{ textAlign: 'center', color: '#777', mt: 1, fontSize: '0.7rem' }}>
            Generated At: {generatedMeta.generatedAt || 'N/A'}
         </Grid>
      </Grid>
    </Box>
  );
});

// --- Main Component ---
export default function PaymentVoucher() {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const { user } = useAuth() || {};
  const printRef = useRef(); // Ref for the printable voucher view

  // --- State ---
  const [transactionDate, setTransactionDate] = useState(todayDate);
  const [payee, setPayee] = useState('');
  const [description, setDescription] = useState('');
  const [paymentAccount, setPaymentAccount] = useState(null); // { id, label, isAsset }
  const [lines, setLines] = useState([{ accountId: '', amount: '', description: '' }]);
  const [accountsList, setAccountsList] = useState([]); // All accounts
  const [assetAccountsList, setAssetAccountsList] = useState([]); // Only asset accounts
  const [expenseAssetAccountsList, setExpenseAssetAccountsList] = useState([]); // Expense or Asset accounts
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [createdVoucherData, setCreatedVoucherData] = useState(null); // Holds data for viewing/printing

  // --- Fetch Accounts ---
  useEffect(() => {
    const fetchAccounts = async () => {
      setLoadingAccounts(true);
      try {
        const res = await apiClient.get('/accounting/chart-of-accounts');
        // Include account_type and account_subtype if available
        const formattedAccounts = res.data.map((acc) => ({
          id: acc.id,
          label: `${acc.account_code} - ${acc.account_name}`,
          type: acc.account_type, // Store type
          subtype: acc.account_subtype // Store subtype
        }));
        setAccountsList(formattedAccounts);

        // Filter for Payment Account dropdown (Cash, Bank which are Assets)
        setAssetAccountsList(
            formattedAccounts.filter(acc => acc.type === 'Asset' && (acc.subtype === 'Cash' || acc.subtype === 'Bank' || acc.subtype === 'Current Asset')) // Adjust subtypes as needed
        );
         // Filter for Line Item dropdowns (Expenses or Assets typically debited in a PV)
        setExpenseAssetAccountsList(
            formattedAccounts.filter(acc => acc.type === 'Expense' || acc.type === 'Asset')
        );

      } catch (err) {
        console.error('Error fetching accounts list:', err);
        toast.error('Could not load accounts list.');
      } finally {
        setLoadingAccounts(false);
      }
    };
    fetchAccounts();
  }, []);

  // --- Line Item Management ---
  const handleAddLine = () => {
    setLines([...lines, { accountId: '', amount: '', description: '' }]);
  };

  const handleRemoveLine = (index) => {
    if (lines.length > 1) { // Keep at least one line
      const newLines = lines.filter((_, i) => i !== index);
      setLines(newLines);
    }
  };

  const handleLineChange = (index, field, value) => {
    const newLines = [...lines];
    newLines[index][field] = value;
    setLines(newLines);
  };

   // Find account details by ID - used for printing label/code
   const findAccountDetails = (id) => {
       return accountsList.find(acc => acc.id === id);
   }

  // --- Form Validation ---
  const validateForm = () => {
    if (!transactionDate || !payee || !paymentAccount) {
      toast.error('Please fill in Date, Payee, and Payment Account.');
      return false;
    }
    if (!paymentAccount.type === 'Asset') {
         toast.error('Payment Account must be an Asset (e.g., Cash or Bank).');
         return false;
    }
    if (lines.length === 0) {
      toast.error('Please add at least one expense line.');
      return false;
    }
    let totalAmount = 0;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.accountId || !line.amount) {
        toast.error(`Line ${i + 1}: Please select an Account and enter an Amount.`);
        return false;
      }
      const amount = parseFloat(line.amount);
      if (isNaN(amount) || amount <= 0) {
        toast.error(`Line ${i + 1}: Amount must be a positive number.`);
        return false;
      }
      totalAmount += amount;
    }
    if (totalAmount <= 0) {
        toast.error('Total voucher amount must be greater than zero.');
        return false;
    }
    return true;
  };

  // --- Form Submission ---
  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoadingSubmit(true);
    setCreatedVoucherData(null); // Clear previous voucher view
    toast.dismiss();

    // Prepare data for API
    const payload = {
      transaction_date: transactionDate,
      payee: payee,
      description: description,
      payment_account_id: paymentAccount.id,
      lines: lines.map(line => ({
        account_id: line.accountId,
        amount: parseFloat(line.amount),
        description: line.description || '', // Ensure description is a string
      })),
    };

    try {
      // --- !!! Make sure this route exists in your api.php !!! ---
      // Route::post('/accounting/payment-vouchers', [AccountingController::class, 'storePaymentVoucher']);
      const res = await apiClient.post('/accounting/payment-vouchers', payload);

       // --- Prepare data for viewing/printing ---
       const paymentAccDetails = findAccountDetails(paymentAccount.id);
       const viewData = {
           ...payload, // Include submitted data
           lines: payload.lines.map(line => {
               const accDetails = findAccountDetails(line.account_id);
               return {
                   ...line,
                   accountCode: accDetails?.label.split(' - ')[0] || 'N/A', // Extract code
                   accountLabel: accDetails?.label.split(' - ')[1] || 'N/A' // Extract name
               };
           }),
           paymentAccountLabel: paymentAccDetails?.label || 'N/A',
           // Add metadata for viewing
           metadata: {
               serial: `PV-${res.data?.data?.id || Date.now()}`, // Use ID from response if available
               generatedAt: new Date().toLocaleString(),
               generatedBy: user ? user.name : "N/A",
           }
       };
       setCreatedVoucherData(viewData); // Set data to display the voucher preview
       // --- End prepare data ---

      toast.success(res.data?.message || 'Payment Voucher created successfully!');

      // Reset form after successful submission
      setTransactionDate(todayDate);
      setPayee('');
      setDescription('');
      setPaymentAccount(null);
      setLines([{ accountId: '', amount: '', description: '' }]);

    } catch (err) {
      console.error('Error creating Payment Voucher:', err);
      toast.error(err.response?.data?.message || 'Failed to create voucher.');
    } finally {
      setLoadingSubmit(false);
    }
  };

   // --- Print Handler ---
   const triggerVoucherPrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: `Payment-Voucher-${createdVoucherData?.metadata?.serial || Date.now()}`,
    pageStyle: `@media print { body { margin: 0; padding: 0; } @page { size: A5; margin: 0.5cm; } }`, // A5 or adjust as needed
  });

  const handlePrintVoucher = () => {
    if (printRef.current) {
      triggerVoucherPrint();
    } else {
      toast.error("Voucher content not available for printing.");
    }
  };


  return (
    <Box m={{ xs: '10px', md: '20px' }}>
      <Header
        title="Payment Voucher"
        subtitle="Record cash or bank payments made"
      />

    <Grid container spacing={3}>
        {/* --- Left Column: Voucher Creation Form --- */}
         <Grid item xs={12} md={createdVoucherData ? 6 : 12}> {/* Take full width if no preview */}
           <Paper elevation={3} sx={{ p: { xs: 2, md: 3 }, backgroundColor: colors.primary[400] }}>
             <Typography variant="h5" sx={{ mb: 3, color: colors.grey[100] }}>Create New Voucher</Typography>

              {/* Top Section: Date, Payee, Payment Account */}
              <Grid container spacing={2} mb={2}>
                  <Grid item xs={12} sm={4}>
                     <TextField fullWidth label="Date" type="date" value={transactionDate}
                          onChange={(e) => setTransactionDate(e.target.value)}
                          InputLabelProps={{ shrink: true }} variant="outlined" required
                     />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                      <TextField fullWidth label="Paid To (Payee)" value={payee}
                          onChange={(e) => setPayee(e.target.value)}
                           variant="outlined" required
                      />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                     <Autocomplete
                          options={assetAccountsList}
                          loading={loadingAccounts}
                          value={paymentAccount}
                          onChange={(event, newValue) => setPaymentAccount(newValue)}
                          getOptionLabel={(option) => option.label || ""}
                          isOptionEqualToValue={(option, value) => option.id === value.id}
                          renderInput={(params) => (
                            <TextField {...params} label="Payment From Account" variant="outlined" required
                                InputProps={{ ...params.InputProps, endAdornment: (<>{loadingAccounts ? <CircularProgress color="inherit" size={20} /> : null}{params.InputProps.endAdornment}</>),}}
                            />
                          )}
                        />
                  </Grid>
                   <Grid item xs={12}>
                        <TextField fullWidth label="Overall Description (Optional)" value={description}
                            onChange={(e) => setDescription(e.target.value)}
                             variant="outlined" multiline rows={2}
                        />
                   </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />

              {/* Dynamic Expense Lines Section */}
              <Typography variant="h6" sx={{ mb: 1, color: colors.grey[200] }}>Expense Details</Typography>
              <Stack spacing={2} mb={2}>
                 {lines.map((line, index) => (
                    <Paper key={index} elevation={1} sx={{ p: 2, backgroundColor: colors.primary[500], display: 'flex', alignItems: 'center', gap: 1 }}>
                        {/* Account Selection */}
                        <Autocomplete
                            fullWidth
                            size="small"
                            options={expenseAssetAccountsList} // Use Expense/Asset list
                            loading={loadingAccounts}
                            value={accountsList.find(acc => acc.id === line.accountId) || null}
                             onChange={(event, newValue) => handleLineChange(index, 'accountId', newValue ? newValue.id : '')}
                            getOptionLabel={(option) => option.label || ""}
                            isOptionEqualToValue={(option, value) => option.id === value.id}
                            renderInput={(params) => (
                                <TextField {...params} label={`Line ${index + 1} Account`} variant="outlined" required
                                    InputProps={{ ...params.InputProps, endAdornment: (<>{loadingAccounts ? <CircularProgress color="inherit" size={18} /> : null}{params.InputProps.endAdornment}</>),}}
                                />
                            )}
                            sx={{ flexGrow: 3 }}
                        />
                         {/* Amount */}
                        <TextField
                            size="small" label="Amount" type="number"
                            value={line.amount}
                            onChange={(e) => handleLineChange(index, 'amount', e.target.value)}
                            variant="outlined" required sx={{ width: '120px' }}
                            InputProps={{ inputProps: { min: 0.01, step: 0.01 } }}
                         />
                          {/* Line Description */}
                         <TextField
                            size="small" label="Line Desc. (Optional)"
                            value={line.description}
                            onChange={(e) => handleLineChange(index, 'description', e.target.value)}
                            variant="outlined" sx={{ flexGrow: 2 }}
                         />
                         {/* Remove Button */}
                         <Tooltip title="Remove Line">
                            <span> {/* Span needed for Tooltip on disabled button */}
                            <IconButton onClick={() => handleRemoveLine(index)} disabled={lines.length <= 1} size="small" color="error">
                                <RemoveCircleOutline />
                            </IconButton>
                            </span>
                         </Tooltip>
                    </Paper>
                 ))}
              </Stack>

               {/* Add Line Button */}
              <Button startIcon={<AddCircleOutline />} onClick={handleAddLine} variant="outlined" size="small" sx={{ mb: 3 }}>
                Add Expense Line
              </Button>

               <Divider sx={{ my: 2 }} />

               {/* Submit Button */}
               <Box textAlign="right">
                    <Button
                        variant="contained" color="secondary"
                        onClick={handleSubmit} disabled={loadingSubmit || loadingAccounts}
                        sx={{ height: "48px", fontSize: "1rem", px: 4 }}
                    >
                        {loadingSubmit ? <CircularProgress size={24} /> : "Create Voucher"}
                    </Button>
               </Box>

           </Paper>
         </Grid>

         {/* --- Right Column: Voucher Preview --- */}
         {createdVoucherData && (
              <Grid item xs={12} md={6}>
                 <Paper elevation={3} sx={{ p: { xs: 2, md: 3 }, backgroundColor: colors.primary[400] }}>
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                           <Typography variant="h5" sx={{ color: colors.grey[100] }}>Voucher Preview</Typography>
                           <Tooltip title="Print Voucher">
                               <IconButton onClick={handlePrintVoucher} sx={{ color: colors.grey[100] }}>
                                    <PrintOutlined />
                               </IconButton>
                            </Tooltip>
                      </Box>
                      <Divider sx={{ mb: 2 }} />
                      {/* Render the printable component */}
                      <VoucherView ref={printRef} voucherData={createdVoucherData} colors={colors} />
                 </Paper>
              </Grid>
         )}

    </Grid>
    </Box>
  );
}