import React from 'react';
import { Box, Typography, Stack, Chip, Avatar, Badge, Tooltip, IconButton, Divider, Grid, useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import CameraAltOutlinedIcon from '@mui/icons-material/CameraAltOutlined';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import PhoneOutlinedIcon from '@mui/icons-material/PhoneOutlined';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import AssignmentIndOutlinedIcon from '@mui/icons-material/AssignmentIndOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

// Standard import - Do not use React.lazy for basic styled components
import { GlassPaper } from './GlassPaper'; 

// Helper to extract user initials
const getInitials = (name) => {
    if (!name) return "U";
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
        return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return parts[0][0].toUpperCase();
};

const ProfileSidebar = ({ currentUser, safeColors, theme, labelColor, isDark }) => {

    const employeeData = currentUser; 
    
    const displayStatus = employeeData?.status || 'Active';
    const displayRole = employeeData?.company_role || employeeData?.accessLevel || 'Employee';
    const isRoleAdmin = displayRole.toUpperCase() === 'ADMIN' || displayRole.toUpperCase() === 'OWNER';
    const isActive = displayStatus.toLowerCase() === 'active';

    const userName = employeeData?.name || employeeData?.full_name || "System User";
    const userInitials = getInitials(userName);

    return (
        // Replaced <Box> with <GlassPaper> to apply the border and blur
        <GlassPaper isdark={isDark} elevation={0} sx={{ position: { lg: 'sticky' }, top: 24 }}>
            
            {/* Header Background */}
            <Box sx={{ height: 110, background: `linear-gradient(135deg, ${safeColors.blueAccent.dark} 0%, ${theme.palette.primary.dark} 100%)`, borderRadius: '24px 24px 0 0' }} />
            
            <Box sx={{ px: 3, pb: 3, mt: -5, textAlign: 'center' }}>
                <Badge
                    overlap="circular"
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                    badgeContent={
                        <Tooltip title="Change Photo">
                            <IconButton size="small" onClick={() => console.log('Avatar Clicked')} sx={{ bgcolor: theme.palette.primary.main, color: '#fff', '&:hover': { bgcolor: theme.palette.primary.dark }, width: 32, height: 32, border: `2px solid ${theme.palette.background.paper}` }}>
                                <CameraAltOutlinedIcon sx={{ fontSize: '1rem' }} />
                            </IconButton>
                        </Tooltip>
                    }
                >
                    <Avatar 
                        src={employeeData?.avatar || undefined} 
                        sx={{ 
                            width: 90, 
                            height: 90, 
                            border: `2px solid ${theme.palette.background.paper}`, 
                            boxShadow: theme.shadows[3],
                            bgcolor: theme.palette.primary.main,
                            color: '#ffffff',
                            fontSize: '2rem',
                            fontWeight: 'bold'
                        }} 
                    >
                        {!employeeData?.avatar && userInitials}
                    </Avatar>
                </Badge>

                <Typography variant="h5" fontWeight="800" color="text.primary" mt={1.5} sx={{ wordBreak: 'break-word' }}>
                    {userName}
                    {isRoleAdmin && <VerifiedUserIcon sx={{ color: theme.palette.primary.main, ml: 0.5, fontSize: '1rem', verticalAlign: 'middle' }} />}
                </Typography>
                
                <Typography variant="body2" color="text.secondary" fontWeight="600" mt={0.25}>
                    {employeeData?.job_title || "LigcoSync Staff"}
                </Typography>

                <Stack direction="row" flexWrap="wrap" gap={1} justifyContent="center" mt={2}>
                    <Chip label={displayStatus.toUpperCase()} size="small" sx={{ fontWeight: 700, fontSize: '0.65rem', height: 22, borderRadius: '6px', backgroundColor: isActive ? alpha(safeColors.greenAccent.main, 0.15) : alpha(safeColors.redAccent.main, 0.15), color: isActive ? safeColors.greenAccent.main : safeColors.redAccent.main }} />
                    <Chip label={displayRole.toUpperCase()} size="small" sx={{ fontWeight: 700, fontSize: '0.65rem', height: 22, borderRadius: '6px', backgroundColor: alpha(theme.palette.primary.main, 0.1), color: theme.palette.primary.main }} />
                    <Chip icon={<AccessTimeIcon sx={{ fontSize: 12 }} />} label="Online" size="small" sx={{ fontWeight: 600, fontSize: '0.65rem', height: 22, borderRadius: '6px', backgroundColor: alpha(theme.palette.text.primary, 0.05), color: 'text.secondary' }} />
                </Stack>
            </Box>

            <Divider sx={{ borderColor: theme.palette.divider }} />

            <Box sx={{ p: 2.5 }}>
                <Typography variant="caption" color={labelColor} fontWeight={800} textTransform="uppercase" letterSpacing={0.5}>Contact & Employment</Typography>
                <Stack spacing={2} mt={1.5}>
                    {/* Work Email Row */}
                    <Box display="flex" alignItems="center" gap={1.5}>
                        <Box sx={{ p: 0.75, borderRadius: '8px', backgroundColor: alpha(theme.palette.text.primary, 0.04), color: 'text.secondary', display: 'flex' }}><EmailOutlinedIcon sx={{ fontSize: '1.1rem' }} /></Box>
                        <Box flex={1} sx={{ minWidth: 0 }}>
                            <Typography variant="caption" color={labelColor} display="block" fontWeight={600} sx={{ fontSize: '0.65rem' }}>Work Email</Typography>
                            <Typography variant="body2" color="text.primary" fontWeight={600} sx={{ fontSize: '0.8rem' }}>{employeeData?.email || "Not Provided"}</Typography>
                        </Box>
                        <CheckCircleIcon sx={{ color: safeColors.greenAccent.main, fontSize: 14 }} />
                    </Box>
                    
                    {/* Phone Row */}
                    <Box display="flex" alignItems="center" gap={1.5}>
                        <Box sx={{ p: 0.75, borderRadius: '8px', backgroundColor: alpha(theme.palette.text.primary, 0.04), color: 'text.secondary', display: 'flex' }}><PhoneOutlinedIcon sx={{ fontSize: '1.1rem' }} /></Box>
                        <Box flex={1}>
                            <Typography variant="caption" color={labelColor} display="block" fontWeight={600} sx={{ fontSize: '0.65rem' }}>Phone Number</Typography>
                            <Typography variant="body2" color="text.primary" fontWeight={600} sx={{ fontSize: '0.8rem' }}>{employeeData?.phone_number || employeeData?.phone || "Not Provided"}</Typography>
                        </Box>
                    </Box>

                    {/* Location Row */}
                    <Box display="flex" alignItems="center" gap={1.5}>
                        <Box sx={{ p: 0.75, borderRadius: '8px', backgroundColor: alpha(theme.palette.text.primary, 0.04), color: 'text.secondary', display: 'flex' }}><LocationOnOutlinedIcon sx={{ fontSize: '1.1rem' }} /></Box>
                        <Box flex={1}>
                            <Typography variant="caption" color={labelColor} display="block" fontWeight={600} sx={{ fontSize: '0.65rem' }}>Office Location</Typography>
                            <Typography variant="body2" color="text.primary" fontWeight={600} sx={{ fontSize: '0.8rem' }}>{employeeData?.location || "Not Provided"}</Typography>
                        </Box>
                    </Box>

                    {/* Contract Type Row */}
                    <Box display="flex" alignItems="center" gap={1.5}>
                        <Box sx={{ p: 0.75, borderRadius: '8px', backgroundColor: alpha(theme.palette.text.primary, 0.04), color: 'text.secondary', display: 'flex' }}>
                            <AssignmentIndOutlinedIcon sx={{ fontSize: '1.1rem' }} />
                        </Box>
                        <Box flex={1} sx={{ minWidth: 0 }}>
                            <Typography variant="caption" color={labelColor} display="block" fontWeight={600} sx={{ fontSize: '0.65rem' }}>Contract Type</Typography>
                            <Typography variant="body2" color="text.primary" fontWeight={600} sx={{ wordBreak: 'break-word', fontSize: '0.8rem' }}>
                                {employeeData?.employment_type || "Full-Time"}
                            </Typography>
                        </Box>
                    </Box>
                </Stack>
            </Box>

            {/* Bottom Stats Section */}
            <Box sx={{ p: 2.5, pt: 0 }}>
                <Divider sx={{ mb: 2, borderColor: theme.palette.divider }} />
                <Grid container spacing={2} justifyContent="center">
                    <Grid item xs={4} textAlign="center">
                        <Typography variant="subtitle1" fontWeight={800} color="text.primary">2</Typography>
                        <Typography variant="caption" color={labelColor} fontWeight={600} sx={{ fontSize: '0.65rem', lineHeight: 1.1, display: 'block' }}>Active<br/>Sessions</Typography>
                    </Grid>
                    <Grid item xs={4} textAlign="center">
                        <Typography variant="subtitle1" fontWeight={800} color="text.primary">145</Typography>
                        <Typography variant="caption" color={labelColor} fontWeight={600} sx={{ fontSize: '0.65rem', lineHeight: 1.1, display: 'block' }}>Login<br/>Days</Typography>
                    </Grid>
                    <Grid item xs={4} textAlign="center">
                        <Typography variant="subtitle1" fontWeight={800} color="text.primary">98%</Typography>
                        <Typography variant="caption" color={labelColor} fontWeight={600} sx={{ fontSize: '0.65rem', lineHeight: 1.1, display: 'block' }}>Security<br/>Score</Typography>
                    </Grid>
                </Grid>
            </Box>
        </GlassPaper>
    );
};

export default React.memo(ProfileSidebar);