import React, { useState } from 'react';
import { Box, Stack, Typography, Button, Grid, Card, CardContent, LinearProgress, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';

const LeaveMgmtTab = ({ leaveBalances, leaveHistory, onSubmitRequest, safeColors, labelColor }) => {
  const theme = useTheme();

  return (
    <Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" mb={4}>
        <Box>
          <Typography variant="h5" fontWeight={800}>Leave Management</Typography>
          <Typography variant="body2" color={labelColor}>Track your leave balances and submit time-off requests.</Typography>
        </Box>
        <Button variant="contained" color="primary" startIcon={<AddCircleOutlineIcon />} onClick={() => {/* Open Dialog Logic */}} sx={{ borderRadius: '8px' }}>
          Request Leave
        </Button>
      </Stack>

      {/* Balances Grid */}
      <Grid container spacing={2} mb={5}>
        {leaveBalances.map((balance, idx) => {
          const colorsArr = [safeColors.blueAccent.main, safeColors.orangeAccent.main, safeColors.purpleAccent.main, safeColors.greenAccent.main];
          const colorCode = colorsArr[idx % colorsArr.length];
          return (
            <Grid item xs={12} sm={4} key={idx}>
              <Card variant="outlined" sx={{ borderRadius: '16px', bgcolor: alpha(theme.palette.background.default, 0.4) }}>
                <CardContent>
                  <Typography variant="caption" fontWeight={800} color={labelColor} textTransform="uppercase">{balance.type}</Typography>
                  <Stack direction="row" alignItems="baseline" spacing={1} mt={1} mb={2}>
                    <Typography variant="h4" fontWeight={800}>{balance.total - balance.used}</Typography>
                    <Typography variant="body2" color={labelColor} fontWeight={600}>days remaining</Typography>
                  </Stack>
                  <LinearProgress variant="determinate" value={(balance.used / balance.total) * 100} sx={{ height: 6, borderRadius: 3, bgcolor: alpha(colorCode, 0.2), '& .MuiLinearProgress-bar': { bgcolor: colorCode } }} />
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* History Table */}
      <Typography variant="h6" fontWeight={800} mb={2}>Leave History</Typography>
      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: '12px' }}>
        <Table>
          <TableHead sx={{ bgcolor: alpha(theme.palette.text.primary, 0.05) }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 800 }}>Leave Type</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>Dates</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {leaveHistory.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.type}</TableCell>
                <TableCell>{row.start} to {row.end}</TableCell>
                <TableCell><Chip label={row.status} size="small" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default React.memo(LeaveMgmtTab);