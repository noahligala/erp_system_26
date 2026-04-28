import React from 'react';
import { Box, Typography, List, ListItem, ListItemIcon, ListItemText, Stack, Chip, Button, alpha, useTheme } from '@mui/material';
import DeviceHubIcon from '@mui/icons-material/DeviceHub';
import BackupIcon from '@mui/icons-material/Backup';

const SessionsTab = ({ sessionHistory = [], onRevokeSession, labelColor }) => {
  const theme = useTheme();

  return (
    <Box>
      <Typography variant="h5" fontWeight={800} color="text.primary" mb={1}>Active Sessions</Typography>
      <Typography variant="body2" color={labelColor} mb={4}>
        Monitor and manage devices currently authenticated to your account.
      </Typography>

      <List sx={{ width: '100%' }}>
        {sessionHistory.map((session) => (
          <ListItem
            key={session.id}
            sx={{
              borderRadius: '12px', mb: 2,
              backgroundColor: session.current ? alpha(theme.palette.primary.main, 0.05) : theme.palette.background.paper,
              border: `1px solid ${session.current ? theme.palette.primary.main : theme.palette.divider}`,
              transition: 'all 0.2s ease', alignItems: 'flex-start',
              flexDirection: { xs: 'column', sm: 'row' }, px: { xs: 2, sm: 3 }, py: 2,
              '&:hover': {
                backgroundColor: alpha(theme.palette.action.hover, 0.2),
                transform: 'translateY(-2px)',
                boxShadow: theme.shadows[1]
              }
            }}
          >
            <Box display="flex" width="100%" alignItems="center">
              <ListItemIcon sx={{ minWidth: 40 }}>
                <DeviceHubIcon sx={{ color: session.current ? theme.palette.primary.main : labelColor }} />
              </ListItemIcon>
              <ListItemText
                primary={
                  <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
                    <Typography fontWeight={700} color="text.primary">{session.device}</Typography>
                    {session.current && (
                      <Chip label="Current Session" size="small" sx={{ backgroundColor: theme.palette.primary.main, color: '#fff', fontWeight: 700, fontSize: '0.65rem', height: 20 }} />
                    )}
                  </Stack>
                }
                secondary={
                  <>
                    <Typography variant="caption" color={labelColor} display="block" mt={0.5} sx={{ wordBreak: 'break-word' }}>
                      {session.location} • IP: {session.ip}
                    </Typography>
                    <Typography variant="caption" color={labelColor}>Last active: {session.date}</Typography>
                  </>
                }
                sx={{ pr: { xs: 0, sm: 8 }, m: 0 }}
              />
            </Box>
            
            {!session.current && (
              <Box mt={{ xs: 2, sm: 0 }} ml={{ xs: 5, sm: 'auto' }} display="flex" alignItems="center">
                <Button size="small" color="error" variant="outlined" onClick={() => onRevokeSession(session.id)} sx={{ borderRadius: '6px', textTransform: 'none', fontWeight: 600, width: { xs: '100%', sm: 'auto' } }}>
                  Revoke
                </Button>
              </Box>
            )}
          </ListItem>
        ))}
      </List>

      <Box mt={4} p={{ xs: 2, sm: 3 }} sx={{ backgroundColor: alpha(theme.palette.background.default, 0.6), borderRadius: '16px', border: `1px solid ${theme.palette.divider}` }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', sm: 'center' }}>
          <Box display="flex" gap={2} alignItems="center">
            <BackupIcon sx={{ color: theme.palette.primary.main }} />
            <Box flex={1}>
              <Typography variant="body2" fontWeight={700} color="text.primary">Unrecognized activity?</Typography>
              <Typography variant="caption" color={labelColor}>Immediately revoke unknown sessions to protect your account.</Typography>
            </Box>
          </Box>
          <Button variant="contained" color="error" disableElevation size="small" sx={{ borderRadius: '6px', fontWeight: 700, width: { xs: '100%', sm: 'auto' }, ml: { sm: 'auto' } }}>
            Revoke All Other
          </Button>
        </Stack>
      </Box>
    </Box>
  );
};

export default React.memo(SessionsTab);