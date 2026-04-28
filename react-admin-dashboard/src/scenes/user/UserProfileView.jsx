import React, { useState, useMemo } from 'react';
import { Box, Grid, Fade, Tabs, Tab, Snackbar, Alert, useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import Header from '../../components/Header';
import { useAuth } from '../../api/AuthProvider';
import { tokens } from '../../theme';

// Hooks & Utilities
import { useUserProfile } from '../../utils/hooks/useUserProfile';
import { GlassPaper } from '../../components/GlassPaper';

// Sub-components (Ensure these paths match your project structure)
import ProfileSidebar from '../../components/ProfileSidebar';
import PersonalDetailsTab from '../../components/tabs/PersonalDetailsTab';
import PayslipsStatutoryTab from '../../components/tabs/PayslipsStatutoryTab';
import LeaveManagementTab from '../../components/tabs/LeaveManagementTab';
import SecurityTab from '../../components/tabs/SecurityTab';
import SessionsTab from '../../components/tabs/SessionsTab';
import PreferencesTab from '../../components/tabs/PreferencesTab';
import ApiAccessTab from '../../components/tabs/ApiAccessTab';

// Icons
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import EventAvailableOutlinedIcon from '@mui/icons-material/EventAvailableOutlined';
import SecurityOutlinedIcon from '@mui/icons-material/SecurityOutlined';
import DevicesOutlinedIcon from '@mui/icons-material/DevicesOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import ApiOutlinedIcon from '@mui/icons-material/ApiOutlined';

const UserProfileView = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const isDark = theme.palette.mode === 'dark';
  
  const auth = useAuth() || {};
  const currentUser = auth.user || {};

  const [activeTab, setActiveTab] = useState(0);

  // Extract EVERYTHING needed from the hook
  const { 
    employeeData,
    payslips,
    leaveBalances,
    leaveHistory,
    sessionHistory,
    isSaving, 
    toast, 
    setToast, 
    handleProfileUpdate,
    handlePasswordUpdate,
    handleLeaveSubmit,
    handleRevokeSession,
    handleDeleteAccount
  } = useUserProfile(); 

  // Use dynamic data if available, otherwise fallback to standard auth user
  const activeUser = employeeData || currentUser;

  const safeColors = useMemo(() => ({
    primary: { main: colors.primary?.[500] || '#1976d2', dark: colors.primary?.[600] || '#1565c0' },
    greenAccent: { main: colors.greenAccent?.[500] || '#2e7d32' },
    redAccent: { main: colors.redAccent?.[500] || '#d32f2f' },
    blueAccent: { main: colors.blueAccent?.[500] || '#1976d2', dark: colors.blueAccent?.[600] || '#1565c0' }
  }), [colors]);

  // Use MUI grey scale for guaranteed contrast across modes
  const labelColor = isDark ? theme.palette.grey[400] : theme.palette.grey[700];

  // Shared SX for all inputs across tabs
  const inputSx = useMemo(() => ({
    "& .MuiOutlinedInput-root": {
      borderRadius: "8px",
      backgroundColor: isDark ? alpha(theme.palette.common.black, 0.3) : theme.palette.common.white,
      transition: "all 0.2s ease",
      "& fieldset": {
        borderColor: isDark ? alpha(theme.palette.common.white, 0.2) : alpha(theme.palette.common.black, 0.2),
      },
      "&:hover fieldset": {
        borderColor: theme.palette.primary.main,
      },
    },
    "& .MuiInputBase-input": {
      color: theme.palette.text.primary,
      fontSize: "0.9rem",
    },
    "& .MuiInputLabel-root": {
      color: labelColor,
      fontSize: "0.85rem",
    }
  }), [isDark, theme, labelColor]);

  return (
    <Box m={{ xs: "8px", sm: "16px", md: "24px" }}>
      <Header title="USER PROFILE" subtitle="Manage your professional details, employment records, and security settings." />

      <Snackbar open={toast.open} autoHideDuration={4000} onClose={() => setToast({...toast, open: false})} anchorOrigin={{ vertical: 'top', horizontal: 'right' }}>
        <Alert severity={toast.type} sx={{ borderRadius: '8px', fontWeight: 600, color: theme.palette.text.primary }}>
          {toast.message}
        </Alert>
      </Snackbar>

      <Grid container spacing={{ xs: 2, md: 4 }}>
        {/* LEFT COLUMN: Profile Sidebar */}
        <Grid item xs={12} lg={4}>
          <Fade in={true} timeout={500}>
            <Box>
               <ProfileSidebar 
                  currentUser={activeUser} 
                  safeColors={safeColors} 
                  theme={theme} 
                  labelColor={labelColor} 
                  isDark={isDark} 
                />
            </Box>
          </Fade>
        </Grid>

        {/* RIGHT COLUMN: Tab Orchestration */}
        <Grid item xs={12} lg={8}>
          <Fade in={true} timeout={700}>
            <GlassPaper isdark={isDark ? 1 : 0} elevation={0} sx={{ minHeight: '100%', overflow: 'hidden' }}>
              
              <Box sx={{ borderBottom: 1, borderColor: theme.palette.divider, background: alpha(theme.palette.background.default, 0.6) }}>
                <Tabs 
                  value={activeTab} 
                  onChange={(e, val) => setActiveTab(val)} 
                  variant="scrollable" 
                  scrollButtons="auto"
                  textColor="primary"
                  indicatorColor="primary"
                  sx={{
                    minHeight: 48,
                    "& .MuiTab-root": {
                      minHeight: 48,
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      textTransform: 'none',
                      color: labelColor,
                      transition: 'color 0.2s',
                      "&.Mui-selected": {
                        color: theme.palette.primary.main,
                        fontWeight: 700,
                      },
                      "&:hover": {
                        color: theme.palette.text.primary,
                      }
                    }
                  }}
                >
                  <Tab icon={<BadgeOutlinedIcon />} iconPosition="start" label="Personal Details" />
                  <Tab icon={<ReceiptLongOutlinedIcon />} iconPosition="start" label="Statutory & Payslips" />
                  <Tab icon={<EventAvailableOutlinedIcon />} iconPosition="start" label="Leave" />
                  <Tab icon={<SecurityOutlinedIcon />} iconPosition="start" label="Security" />
                  <Tab icon={<DevicesOutlinedIcon />} iconPosition="start" label="Sessions" />
                  <Tab icon={<SettingsOutlinedIcon />} iconPosition="start" label="Preferences" />
                  <Tab icon={<ApiOutlinedIcon />} iconPosition="start" label="API Access" />
                </Tabs>
              </Box>

              <Box sx={{ p: { xs: 2, sm: 3, md: 5 } }}>
                {activeTab === 0 && (
                  <PersonalDetailsTab 
                    currentUser={activeUser} 
                    onSave={handleProfileUpdate} 
                    isSaving={isSaving} 
                    labelColor={labelColor} 
                    inputSx={inputSx} 
                  />
                )}
                {activeTab === 1 && (
                  <PayslipsStatutoryTab 
                    employeeData={activeUser} 
                    payslips={payslips} 
                    labelColor={labelColor} 
                  />
                )}
                {activeTab === 2 && (
                  <LeaveManagementTab 
                    leaveBalances={leaveBalances} 
                    leaveHistory={leaveHistory} 
                    onLeaveSubmit={handleLeaveSubmit} 
                    isSaving={isSaving} 
                    labelColor={labelColor} 
                    inputSx={inputSx} 
                  />
                )}
                {activeTab === 3 && (
                  <SecurityTab 
                    onPasswordSave={handlePasswordUpdate} 
                    onDeleteAccount={handleDeleteAccount} 
                    isSaving={isSaving} 
                    labelColor={labelColor} 
                    inputSx={inputSx} 
                  />
                )}
                {activeTab === 4 && (
                  <SessionsTab 
                    sessionHistory={sessionHistory} 
                    onRevokeSession={handleRevokeSession} 
                    labelColor={labelColor} 
                  />
                )}
                {activeTab === 5 && (
                  <PreferencesTab 
                    labelColor={labelColor} 
                  />
                )}
                {activeTab === 6 && (
                  <ApiAccessTab 
                    labelColor={labelColor} 
                    inputSx={inputSx} 
                  />
                )}
              </Box>

            </GlassPaper>
          </Fade>
        </Grid>
      </Grid>
    </Box>
  );
};

export default UserProfileView;