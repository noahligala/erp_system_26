import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, TextField, Grid, Paper, IconButton, Autocomplete, useTheme } from '@mui/material';
import { tokens } from '../../theme';
import Header from '../../components/Header';
import { mockChartOfAccounts } from '../../data/mockData';
import AddCircleOutlineOutlinedIcon from '@mui/icons-material/AddCircleOutlineOutlined';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import { useNavigate } from 'react-router-dom';

// Get account names for autocomplete
const accountOptions = mockChartOfAccounts.map(acc => ({
    id: acc.id,
    label: `${acc.id} - ${acc.name} (${acc.type})`
}));

const NewJournalEntry = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const navigate = useNavigate();

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [lines, setLines] = useState([
    { id: 1, account: null, debit: '', credit: '' },
    { id: 2, account: null, debit: '', credit: '' },
  ]);
  const [totals, setTotals] = useState({ debit: 0, credit: 0 });
  const [isBalanced, setIsBalanced] = useState(false);

  // Recalculate totals whenever lines change
  useEffect(() => {
    let debitTotal = 0;
    let creditTotal = 0;
    lines.forEach(line => {
      debitTotal += parseFloat(line.debit) || 0;
      creditTotal += parseFloat(line.credit) || 0;
    });
    setTotals({ debit: debitTotal, credit: creditTotal });
    setIsBalanced(debitTotal === creditTotal && debitTotal > 0);
  }, [lines]);

  const handleLineChange = (index, field, value) => {
    const newLines = [...lines];
    newLines[index][field] = value;

    // Ensure only debit or credit is filled, not both
    if (field === 'debit' && value !== '') {
      newLines[index]['credit'] = '';
    } else if (field === 'credit' && value !== '') {
      newLines[index]['debit'] = '';
    }
    setLines(newLines);
  };

  const addLine = () => {
    setLines([...lines, { id: lines.length + 1, account: null, debit: '', credit: '' }]);
  };

  const removeLine = (index) => {
    const newLines = lines.filter((_, i) => i !== index);
    setLines(newLines);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isBalanced) {
      alert("Journal entry is not balanced. Debits must equal Credits.");
      return;
    }
    const journalEntry = {
      date,
      description,
      lines: lines.filter(line => line.account && (line.debit || line.credit)), // Filter empty lines
    };
    console.log("Submitting Journal Entry:", journalEntry);
    alert("Journal Entry Submitted (See console)");
    navigate('/accounts/journal-entries');
  };

  return (
    <Box m="20px">
      <Header title="NEW JOURNAL ENTRY" subtitle="Create a manual general ledger entry" />
      
      <Paper elevation={3} sx={{ p: 3, backgroundColor: colors.primary[400] }}>
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                type="date"
                label="Date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>
            <Grid item xs={12} md={9}>
              <TextField
                fullWidth
                label="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., To record monthly rent expense"
                required
              />
            </Grid>
          </Grid>
          
          {/* Entry Lines */}
          <Box mt={4}>
            <Grid container spacing={2} alignItems="center" sx={{ mb: 1, borderBottom: `1px solid ${colors.grey[700]}`, pb: 1 }}>
              <Grid item xs={5}><Typography fontWeight="bold">Account</Typography></Grid>
              <Grid item xs={3}><Typography fontWeight="bold" textAlign="right">Debit</Typography></Grid>
              <Grid item xs={3}><Typography fontWeight="bold" textAlign="right">Credit</Typography></Grid>
              <Grid item xs={1}></Grid>
            </Grid>
            
            {lines.map((line, index) => (
              <Grid container spacing={2} key={line.id} alignItems="center" sx={{ mb: 1 }}>
                <Grid item xs={5}>
                  <Autocomplete
                    options={accountOptions}
                    value={line.account}
                    onChange={(e, newValue) => handleLineChange(index, 'account', newValue)}
                    renderInput={(params) => <TextField {...params} label="Select Account" variant="standard" />}
                  />
                </Grid>
                <Grid item xs={3}>
                  <TextField
                    fullWidth
                    type="number"
                    variant="standard"
                    value={line.debit}
                    onChange={(e) => handleLineChange(index, 'debit', e.target.value)}
                    InputProps={{ startAdornment: '$', inputProps: { min: 0, step: 0.01, style: { textAlign: 'right' } } }}
                  />
                </Grid>
                <Grid item xs={3}>
                  <TextField
                    fullWidth
                    type="number"
                    variant="standard"
                    value={line.credit}
                    onChange={(e) => handleLineChange(index, 'credit', e.target.value)}
                    InputProps={{ startAdornment: '$', inputProps: { min: 0, step: 0.01, style: { textAlign: 'right' } } }}
                  />
                </Grid>
                <Grid item xs={1}>
                  {lines.length > 2 && (
                    <IconButton onClick={() => removeLine(index)} color="error">
                      <DeleteOutlinedIcon />
                    </IconButton>
                  )}
                </Grid>
              </Grid>
            ))}

            <Button
              startIcon={<AddCircleOutlineOutlinedIcon />}
              onClick={addLine}
              sx={{ mt: 1 }}
            >
              Add Line
            </Button>
          </Box>

          {/* Totals & Submit */}
          <Box mt={4} p={2} sx={{ backgroundColor: colors.primary[900], borderRadius: '4px' }}>
            <Grid container spacing={2} alignItems="center">
                <Grid item xs={5}>
                    <Typography variant="h5" fontWeight="600">Totals</Typography>
                </Grid>
                <Grid item xs={3}>
                    <Typography variant="h5" fontWeight="600" textAlign="right">
                        ${totals.debit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Typography>
                </Grid>
                <Grid item xs={3}>
                    <Typography variant="h5" fontWeight="600" textAlign="right">
                        ${totals.credit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Typography>
                </Grid>
                <Grid item xs={1}></Grid>
            </Grid>
            {!isBalanced && totals.debit + totals.credit > 0 && (
                <Typography color="error" textAlign="center" mt={1}>
                    Totals do not balance.
                </Typography>
            )}
          </Box>

          <Box mt={3} display="flex" justifyContent="flex-end">
            <Button type="submit" variant="contained" color="secondary" size="large" disabled={!isBalanced}>
              Post Entry
            </Button>
          </Box>
        </form>
      </Paper>
    </Box>
  );
};

export default NewJournalEntry;