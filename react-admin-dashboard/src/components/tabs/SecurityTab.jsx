import React, { useState } from 'react';
import { Box, Typography, Button, Stack, TextField, InputAdornment, IconButton, CircularProgress, Divider, Card, CardContent, Stepper, Step, StepLabel, StepContent, Dialog, DialogTitle, DialogContent, DialogActions, Grid, Paper, Alert } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { Formik } from 'formik';
import * as yup from 'yup';

import VpnKeyOutlinedIcon from '@mui/icons-material/VpnKeyOutlined';
import SecurityOutlinedIcon from '@mui/icons-material/SecurityOutlined';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import FingerprintIcon from '@mui/icons-material/Fingerprint';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import DownloadIcon from '@mui/icons-material/Download';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';

const securitySchema = yup.object().shape({
  currentPassword: yup.string().required("Current password is required"),
  newPassword: yup.string()
    .min(8, "Password must be at least 8 characters")
    .matches(/[A-Z]/, "Must contain at least one uppercase letter")
    .required("New password is required"),
  confirmPassword: yup.string()
    .oneOf([yup.ref('newPassword'), null], "Passwords must match")
    .required("Confirm your new password"),
});

const SecurityTab = ({ onPasswordSave, onDeleteAccount, isSaving, labelColor, inputSx }) => {
  const theme = useTheme();
  
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [twoFactorDialog, setTwoFactorDialog] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [backupCodes, setBackupCodes] = useState([]);
  
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState(false);

  const handleEnable2FA = async () => {
    const codes = Array.from({ length: 8 }, () => Math.random().toString(36).substring(2, 8).toUpperCase());
    setBackupCodes(codes);
    setShowBackupCodes(true);
  };

  return (
    <Box>
      <Typography variant="h5" fontWeight={800} color="text.primary" mb={1}>Change Password</Typography>
      <Typography variant="body2" color={labelColor} mb={4}>Ensure your enterprise account is secured with a robust, unique password.</Typography>

      <Formik
        initialValues={{ currentPassword: "", newPassword: "", confirmPassword: "" }}
        validationSchema={securitySchema}
        onSubmit={onPasswordSave}
      >
        {({ values, errors, touched, handleChange, handleBlur, handleSubmit }) => (
          <form onSubmit={handleSubmit}>
            <Stack spacing={3} sx={{ maxWidth: { xs: '100%', md: '550px' } }}>
              <Box>
                <Typography variant="caption" color={labelColor} fontWeight={800} mb={1} display="block">Current Password</Typography>
                <TextField
                  fullWidth size="small" type={showPassword ? "text" : "password"} variant="outlined" name="currentPassword"
                  value={values.currentPassword} onChange={handleChange} onBlur={handleBlur}
                  error={!!touched.currentPassword && !!errors.currentPassword} helperText={touched.currentPassword && errors.currentPassword}
                  InputProps={{ 
                    startAdornment: <InputAdornment position="start"><VpnKeyOutlinedIcon sx={{color: labelColor}} /></InputAdornment>,
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" sx={{color: labelColor}}>
                          {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                  sx={inputSx}
                />
              </Box>
              
              <Box>
                <Typography variant="caption" color={labelColor} fontWeight={800} mb={1} display="block">New Password</Typography>
                <TextField
                  fullWidth size="small" type={showNewPassword ? "text" : "password"} variant="outlined" name="newPassword"
                  value={values.newPassword} onChange={handleChange} onBlur={handleBlur}
                  error={!!touched.newPassword && !!errors.newPassword} helperText={touched.newPassword && errors.newPassword}
                  InputProps={{ 
                    startAdornment: <InputAdornment position="start"><SecurityOutlinedIcon sx={{color: labelColor}} /></InputAdornment>,
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowNewPassword(!showNewPassword)} edge="end" sx={{color: labelColor}}>
                          {showNewPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                  sx={inputSx}
                />
              </Box>
              
              <Box>
                <Typography variant="caption" color={labelColor} fontWeight={800} mb={1} display="block">Confirm New Password</Typography>
                <TextField
                  fullWidth size="small" type={showConfirmPassword ? "text" : "password"} variant="outlined" name="confirmPassword"
                  value={values.confirmPassword} onChange={handleChange} onBlur={handleBlur}
                  error={!!touched.confirmPassword && !!errors.confirmPassword} helperText={touched.confirmPassword && errors.confirmPassword}
                  InputProps={{ 
                    startAdornment: <InputAdornment position="start"><SecurityOutlinedIcon sx={{color: labelColor}} /></InputAdornment>,
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowConfirmPassword(!showConfirmPassword)} edge="end" sx={{color: labelColor}}>
                          {showConfirmPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                  sx={inputSx}
                />
              </Box>

              <Button type="submit" variant="contained" disableElevation disabled={isSaving} sx={{ py: 1.5, borderRadius: '8px', fontWeight: 700, mt: 2, width: { xs: '100%', sm: 'fit-content' }, minWidth: { sm: 200 }, color: '#fff' }}>
                {isSaving ? <CircularProgress size={24} color="inherit" /> : "Update Password"}
              </Button>
            </Stack>
          </form>
        )}
      </Formik>
      
      <Divider sx={{ my: 4, borderColor: theme.palette.divider }} />
      
      {/* Two-Factor Authentication Section */}
      <Box mb={4}>
        <Typography variant="h5" fontWeight={800} color="text.primary" mb={1}>Two-Factor Authentication (2FA)</Typography>
        <Typography variant="body2" color={labelColor} mb={3}>Add an extra layer of security to your enterprise account to prevent unauthorized access.</Typography>
        
        <Card variant="outlined" sx={{ borderRadius: '16px', backgroundColor: alpha(theme.palette.background.default, 0.4), borderColor: theme.palette.divider }}>
          <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2}>
              <Box display="flex" alignItems="center" gap={2}>
                <Box sx={{ p: 1.5, borderRadius: '12px', backgroundColor: alpha(theme.palette.primary.main, 0.1), color: theme.palette.primary.main }}>
                  <FingerprintIcon sx={{ fontSize: 32 }} />
                </Box>
                <Box>
                  <Typography variant="body1" fontWeight={700} color="text.primary">Authenticator App</Typography>
                  <Typography variant="body2" color={labelColor}>Use Google Authenticator, Microsoft Authenticator, or Authy</Typography>
                </Box>
              </Box>
              <Button variant="outlined" onClick={() => setTwoFactorDialog(true)} sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 700, width: { xs: '100%', sm: 'auto' } }}>
                Configure 2FA
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Box>

      {/* Account Management Section */}
      <Box>
        <Typography variant="h5" fontWeight={800} color="text.primary" mb={1}>Account Management</Typography>
        <Typography variant="body2" color={labelColor} mb={3}>Manage your core account lifecycle and data</Typography>
        
        <Card variant="outlined" sx={{ borderRadius: '16px', borderColor: alpha(theme.palette.error.main, 0.3), backgroundColor: alpha(theme.palette.error.main, 0.02) }}>
          <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2}>
              <Box>
                <Typography variant="body1" fontWeight={700} color={theme.palette.error.main}>Delete Account</Typography>
                <Typography variant="body2" color={labelColor}>Permanently delete your account and all associated operational data</Typography>
              </Box>
              <Button variant="outlined" color="error" onClick={() => setDeleteConfirmDialog(true)} startIcon={<DeleteForeverIcon />} sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 700, width: { xs: '100%', sm: 'auto' } }}>
                Delete Account
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Box>

      {/* 2FA Dialog */}
      <Dialog open={twoFactorDialog} onClose={() => setTwoFactorDialog(false)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: '20px', background: theme.palette.background.paper, m: { xs: 2, sm: 4 } } }}>
        <DialogTitle sx={{ pb: 1 }}><Typography variant="h5" fontWeight={800} color="text.primary">Set Up Two-Factor Authentication</Typography></DialogTitle>
        <DialogContent>
          <Stepper activeStep={activeStep} orientation="vertical" sx={{ mt: 2 }}>
            <Step>
              <StepLabel>Download an authenticator app</StepLabel>
              <StepContent><Typography variant="body2" color={labelColor}>Download Google Authenticator, Microsoft Authenticator, or Authy from your app store.</Typography></StepContent>
            </Step>
            <Step>
              <StepLabel>Scan the QR code</StepLabel>
              <StepContent>
                <Box display="flex" flexDirection="column" gap={2}>
                  <Box sx={{ p: 2, backgroundColor: '#fff', borderRadius: '12px', display: 'inline-block', border: '1px solid #e0e0e0', maxWidth: '100%', overflow: 'hidden' }}>
                    <QrCodeScannerIcon sx={{ fontSize: { xs: 120, sm: 180 }, color: '#000' }} />
                  </Box>
                  <Typography variant="body2" color={labelColor}>Or enter this code manually: <strong style={{ color: theme.palette.text.primary }}>ABC123DEF456</strong></Typography>
                </Box>
              </StepContent>
            </Step>
            <Step>
              <StepLabel>Enter verification code</StepLabel>
              <StepContent>
                <TextField placeholder="Enter 6-digit code" variant="outlined" size="small" sx={{ width: '100%', maxWidth: 250, ...inputSx, mt: 1 }} inputProps={{ maxLength: 6 }} />
              </StepContent>
            </Step>
          </Stepper>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0, flexDirection: { xs: 'column-reverse', sm: 'row' }, gap: { xs: 1, sm: 0 } }}>
          <Button onClick={() => setTwoFactorDialog(false)} sx={{ fontWeight: 600, color: labelColor, width: { xs: '100%', sm: 'auto' } }}>Cancel</Button>
          <Button variant="contained" disableElevation onClick={() => { if (activeStep < 2) setActiveStep(activeStep + 1); else { handleEnable2FA(); setTwoFactorDialog(false); setActiveStep(0); } }} sx={{ borderRadius: '8px', fontWeight: 700, width: { xs: '100%', sm: 'auto' }, color: '#fff' }}>
            {activeStep === 2 ? "Enable 2FA" : "Continue"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Backup Codes Dialog */}
      <Dialog open={showBackupCodes} onClose={() => setShowBackupCodes(false)} PaperProps={{ sx: { borderRadius: '20px', background: theme.palette.background.paper, m: { xs: 2, sm: 4 } } }}>
        <DialogTitle><Typography variant="h5" fontWeight={800} color="text.primary">Backup Codes</Typography></DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 3, borderRadius: '8px' }}>Save these backup codes in a secure place. You can use them to access your account if you lose your device.</Alert>
          <Grid container spacing={1.5}>
            {backupCodes.map((code, idx) => (
              <Grid item xs={12} sm={6} key={idx}>
                <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center', fontFamily: 'monospace', fontWeight: 800, color: 'text.primary', bgcolor: alpha(theme.palette.background.default, 0.5) }}>{code}</Paper>
              </Grid>
            ))}
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 3, flexDirection: { xs: 'column-reverse', sm: 'row' }, gap: { xs: 1, sm: 0 } }}>
          <Button startIcon={<DownloadIcon />} sx={{ fontWeight: 700, width: { xs: '100%', sm: 'auto' } }}>Download</Button>
          <Button variant="contained" disableElevation sx={{ borderRadius: '8px', fontWeight: 700, width: { xs: '100%', sm: 'auto' }, color: '#fff' }} onClick={() => setShowBackupCodes(false)}>Done</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Account Dialog */}
      <Dialog open={deleteConfirmDialog} onClose={() => setDeleteConfirmDialog(false)} PaperProps={{ sx: { borderRadius: '20px', background: theme.palette.background.paper, m: { xs: 2, sm: 4 } } }}>
        <DialogTitle><Typography variant="h5" fontWeight={800} color={theme.palette.error.main}>Delete Account</Typography></DialogTitle>
        <DialogContent>
          <Typography variant="body2" color={labelColor} mb={2} mt={1}>This action cannot be undone. This will permanently remove your user context from the system.</Typography>
          <TextField fullWidth placeholder="Type 'DELETE' to confirm" variant="outlined" size="small" sx={{ ...inputSx, mt: 1 }} />
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0, flexDirection: { xs: 'column-reverse', sm: 'row' }, gap: { xs: 1, sm: 0 } }}>
          <Button onClick={() => setDeleteConfirmDialog(false)} sx={{ fontWeight: 600, color: labelColor, width: { xs: '100%', sm: 'auto' } }}>Cancel</Button>
          <Button variant="contained" color="error" disableElevation onClick={() => onDeleteAccount(() => setDeleteConfirmDialog(false))} disabled={isSaving} sx={{ fontWeight: 700, borderRadius: '8px', width: { xs: '100%', sm: 'auto' } }}>
            {isSaving ? <CircularProgress size={24} color="inherit" /> : "Confirm Deletion"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default React.memo(SecurityTab);