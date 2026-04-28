import React, { useState } from 'react';
import { Box, Typography, Grid, Paper, Card, CardContent, Button, TableContainer, Table, TableHead, TableRow, TableCell, TableBody, Chip, Tooltip, IconButton, CircularProgress } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';

const PayslipsStatutoryTab = ({ employeeData, payslips = [], labelColor }) => {
  const theme = useTheme();
  const [downloadingP9, setDownloadingP9] = useState(false);

  // Fallback to mock data if employeeData doesn't have statutory info yet
  const statutory = {
    kraPin: employeeData?.kra_pin || "A012345678Z",
    nssf: employeeData?.nssf_number || "102345678",
    nhif: employeeData?.nhif_number || "807654321",
    bankDetails: employeeData?.bank_details || "KCB Bank - Kitale Branch (A/C: ****4567)"
  };

  const handleDownloadP9 = async () => {
    setDownloadingP9(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1200));
    setDownloadingP9(false);
  };

  return (
    <Box>
      <Typography variant="h5" fontWeight={800} color="text.primary" mb={1}>Statutory Details & Payroll</Typography>
      <Typography variant="body2" color={labelColor} mb={4}>View your KRA, NSSF, NHIF records and download monthly payslips.</Typography>
      
      {/* Statutory Grid */}
      <Grid container spacing={2} mb={4}>
        {[
          { label: "KRA PIN", value: statutory.kraPin },
          { label: "NSSF Number", value: statutory.nssf },
          { label: "NHIF Number", value: statutory.nhif },
          { label: "Payment Account", value: statutory.bankDetails, noWrap: true }
        ].map((item, idx) => (
          <Grid item xs={12} sm={6} md={3} key={idx}>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: '12px', bgcolor: alpha(theme.palette.background.default, 0.4) }}>
              <Typography variant="caption" color={labelColor} fontWeight={700}>{item.label}</Typography>
              <Typography variant="body1" fontWeight={800} color="text.primary" mt={0.5} noWrap={item.noWrap} title={item.value}>{item.value}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* P9 Form Banner */}
      <Card variant="outlined" sx={{ mb: 4, borderRadius: '16px', borderColor: theme.palette.primary.main, bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
        <CardContent sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', gap: 2 }}>
          <Box>
            <Typography variant="h6" fontWeight={800} color="text.primary">Annual Tax Return (P9 Form)</Typography>
            <Typography variant="body2" color={labelColor}>Download your P9 form for the previous financial year to file your KRA returns.</Typography>
          </Box>
          <Button 
            variant="contained" 
            disableElevation
            startIcon={downloadingP9 ? <CircularProgress size={20} color="inherit" /> : <FileDownloadOutlinedIcon />}
            onClick={handleDownloadP9}
            disabled={downloadingP9}
            sx={{ borderRadius: '8px', fontWeight: 700, textTransform: 'none', whiteSpace: 'nowrap', color: '#fff' }}
          >
            {downloadingP9 ? "Generating..." : "Download P9 Form"}
          </Button>
        </CardContent>
      </Card>

      {/* Payslips List */}
      <Typography variant="h6" fontWeight={800} color="text.primary" mb={2}>Recent Payslips</Typography>
      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: '12px', bgcolor: alpha(theme.palette.background.default, 0.4) }}>
        <Table aria-label="payslips table" size="small">
          <TableHead sx={{ bgcolor: alpha(theme.palette.text.primary, 0.05) }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 800 }}>Period</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>Gross Pay</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>Net Pay</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
              <TableCell align="right" sx={{ fontWeight: 800 }}>Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {payslips.length > 0 ? payslips.map((row) => (
              <TableRow key={row.id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                <TableCell component="th" scope="row" sx={{ fontWeight: 600 }}>{row.month}</TableCell>
                <TableCell>{row.gross}</TableCell>
                <TableCell sx={{ fontWeight: 700, color: theme.palette.success.main }}>{row.net}</TableCell>
                <TableCell>
                  <Chip label={row.status} size="small" sx={{ fontWeight: 700, fontSize: '0.7rem', bgcolor: alpha(theme.palette.success.main, 0.15), color: theme.palette.success.main }} />
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="Download Payslip">
                    <IconButton color="primary" size="small">
                      <FileDownloadOutlinedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 3, color: labelColor }}>No payslips available for this period.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default React.memo(PayslipsStatutoryTab);