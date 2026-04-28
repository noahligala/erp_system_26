import React, { useState } from 'react';
import { Box, Typography, Stack, Button, Grid, Card, CardContent, LinearProgress, TableContainer, Paper, Table, TableHead, TableRow, TableCell, TableBody, Chip, Dialog, DialogTitle, DialogContent, DialogActions, FormControl, InputLabel, Select, MenuItem, TextField, CircularProgress } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';

const LeaveManagementTab = ({ leaveBalances = [], leaveHistory = [], onLeaveSubmit, isSaving, labelColor, inputSx }) => {
  const theme = useTheme();
  const [leaveRequestDialog, setLeaveRequestDialog] = useState(false);

  // Fallback UI colors if none provided
  const colors = [theme.palette.primary.main, theme.palette.warning.main, theme.palette.secondary.main];

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    onLeaveSubmit(data, () => setLeaveRequestDialog(false));
  };

  return (
    <Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} mb={4} spacing={2}>
        <Box>
          <Typography variant="h5" fontWeight={800} color="text.primary">Leave Management</Typography>
          <Typography variant="body2" color={labelColor} mt={0.5}>Track your leave balances and submit new time-off requests.</Typography>
        </Box>
        <Button 
          variant="contained" 
          startIcon={<AddCircleOutlineIcon />}
          onClick={() => setLeaveRequestDialog(true)}
          disableElevation
          sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 700, px: 3, color: '#fff' }}
        >
          Request Leave
        </Button>
      </Stack>

      {/* Leave Balances Grid */}
      <Grid container spacing={2} mb={5}>
        {leaveBalances.map((balance, idx) => {
          const barColor = balance.color || colors[idx % colors.length];
          return (
            <Grid item xs={12} sm={4} key={idx}>
              <Card variant="outlined" sx={{ borderRadius: '16px', bgcolor: alpha(theme.palette.background.default, 0.4) }}>
                <CardContent>
                  <Typography variant="caption" fontWeight={800} color={labelColor} textTransform="uppercase">{balance.type}</Typography>
                  <Stack direction="row" alignItems="baseline" spacing={1} mt={1} mb={2}>
                    <Typography variant="h4" fontWeight={800} color="text.primary">{balance.total - balance.used}</Typography>
                    <Typography variant="body2" color={labelColor} fontWeight={600}>days remaining</Typography>
                  </Stack>
                  <Box display="flex" justifyContent="space-between" mb={0.5}>
                    <Typography variant="caption" color={labelColor} fontWeight={600}>Used: {balance.used}</Typography>
                    <Typography variant="caption" color={labelColor} fontWeight={600}>Total: {balance.total}</Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={(balance.used / balance.total) * 100} 
                    sx={{ height: 6, borderRadius: 3, bgcolor: alpha(barColor, 0.2), '& .MuiLinearProgress-bar': { bgcolor: barColor } }} 
                  />
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* Leave History Table */}
      <Typography variant="h6" fontWeight={800} color="text.primary" mb={2}>Leave History</Typography>
      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: '12px', bgcolor: alpha(theme.palette.background.default, 0.4) }}>
        <Table aria-label="leave history table" size="small">
          <TableHead sx={{ bgcolor: alpha(theme.palette.text.primary, 0.05) }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 800 }}>Leave Type</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>Start Date</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>End Date</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>Days</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {leaveHistory.length > 0 ? leaveHistory.map((row) => (
              <TableRow key={row.id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                <TableCell component="th" scope="row" sx={{ fontWeight: 600 }}>{row.type}</TableCell>
                <TableCell>{row.start}</TableCell>
                <TableCell>{row.end}</TableCell>
                <TableCell>{row.days}</TableCell>
                <TableCell>
                  <Chip 
                    label={row.status} 
                    size="small" 
                    sx={{ 
                      fontWeight: 700, fontSize: '0.7rem', 
                      bgcolor: row.status === 'Approved' ? alpha(theme.palette.success.main, 0.15) : alpha(theme.palette.warning.main, 0.15), 
                      color: row.status === 'Approved' ? theme.palette.success.main : theme.palette.warning.main 
                    }} 
                  />
                </TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 3, color: labelColor }}>No leave history found.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Request Leave Modal */}
      <Dialog open={leaveRequestDialog} onClose={() => setLeaveRequestDialog(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '20px', background: theme.palette.background.paper, m: { xs: 2, sm: 4 } } }}>
        <DialogTitle sx={{ pb: 1 }}>
          <Typography variant="h5" fontWeight={800} color="text.primary">Request Leave</Typography>
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <Typography variant="body2" color={labelColor} mb={3}>Submit a new time-off request. It will be routed to your department manager for approval.</Typography>
            <Stack spacing={3}>
              <FormControl fullWidth variant="outlined" sx={inputSx} size="small">
                <InputLabel sx={{ fontWeight: 600 }}>Leave Type</InputLabel>
                <Select name="type" label="Leave Type" defaultValue="" required>
                  <MenuItem value="Annual Leave">Annual Leave</MenuItem>
                  <MenuItem value="Sick Leave">Sick Leave</MenuItem>
                  <MenuItem value="Compassionate Leave">Compassionate Leave</MenuItem>
                  <MenuItem value="Maternity/Paternity Leave">Maternity/Paternity Leave</MenuItem>
                </Select>
              </FormControl>
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Box>
                    <Typography variant="caption" color={labelColor} fontWeight={800} mb={1} display="block">Start Date</Typography>
                    <TextField fullWidth name="start" type="date" variant="outlined" size="small" required sx={inputSx} />
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box>
                    <Typography variant="caption" color={labelColor} fontWeight={800} mb={1} display="block">End Date</Typography>
                    <TextField fullWidth name="end" type="date" variant="outlined" size="small" required sx={inputSx} />
                  </Box>
                </Grid>
              </Grid>

              <Box>
                <Typography variant="caption" color={labelColor} fontWeight={800} mb={1} display="block">Reason (Optional)</Typography>
                <TextField fullWidth name="reason" multiline rows={3} variant="outlined" placeholder="Briefly describe your request..." sx={inputSx} />
              </Box>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 3, pt: 0, flexDirection: { xs: 'column-reverse', sm: 'row' }, gap: { xs: 1, sm: 0 } }}>
            <Button onClick={() => setLeaveRequestDialog(false)} sx={{ fontWeight: 600, color: labelColor, width: { xs: '100%', sm: 'auto' } }}>Cancel</Button>
            <Button type="submit" variant="contained" disableElevation disabled={isSaving} sx={{ borderRadius: '8px', fontWeight: 700, width: { xs: '100%', sm: 'auto' }, color: '#fff' }}>
              {isSaving ? <CircularProgress size={24} color="inherit" /> : "Submit Request"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default React.memo(LeaveManagementTab);