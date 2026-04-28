import React from 'react';
import { Box, Typography, List, ListItem, ListItemText, ListItemSecondaryAction, Switch, Divider, Grid, Card, CardContent } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';

const PreferencesTab = ({ labelColor }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <Box>
      <Typography variant="h5" fontWeight={800} color="text.primary" mb={1}>Notification Settings</Typography>
      <Typography variant="body2" color={labelColor} mb={4}>Configure alert rules and operational notifications.</Typography>

      <List sx={{ width: '100%' }}>
        {[
          { title: "System Alerts (Email)", description: "Critical system errors and downtimes", enabled: true },
          { title: "Push Notifications", description: "Real-time updates on active deployments", enabled: true },
          { title: "Security Events", description: "Login from new IP or failed authentication", enabled: true },
          { title: "Weekly Reports", description: "Aggregated performance and usage summaries", enabled: false },
        ].map((setting, idx) => (
          <ListItem key={idx} sx={{ borderRadius: '12px', mb: 1.5, border: `1px solid transparent`, '&:hover': { backgroundColor: alpha(theme.palette.action.hover, 0.05), border: `1px solid ${theme.palette.divider}` } }}>
            <ListItemText
              primary={<Typography fontWeight={700} color="text.primary">{setting.title}</Typography>}
              secondary={<Typography variant="body2" color={labelColor}>{setting.description}</Typography>}
              sx={{ pr: 7 }}
            />
            <ListItemSecondaryAction>
              <Switch edge="end" defaultChecked={setting.enabled} color="primary" />
            </ListItemSecondaryAction>
          </ListItem>
        ))}
      </List>

      <Divider sx={{ my: 4, borderColor: theme.palette.divider }} />

      <Typography variant="h5" fontWeight={800} color="text.primary" mb={1}>Interface Appearance</Typography>
      <Typography variant="body2" color={labelColor} mb={3}>Customize your workspace theme environment.</Typography>

      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <Card variant="outlined" sx={{ cursor: 'pointer', borderRadius: '12px', borderWidth: 2, borderColor: !isDark ? theme.palette.primary.main : theme.palette.divider, backgroundColor: !isDark ? alpha(theme.palette.primary.main, 0.05) : theme.palette.background.paper }}>
            <CardContent sx={{ textAlign: 'center', py: 4 }}>
              <LightModeIcon sx={{ fontSize: 40, color: theme.palette.warning.main, mb: 1.5 }} />
              <Typography fontWeight={700} color="text.primary">Light Workspace</Typography>
              <Typography variant="caption" color={labelColor}>Optimal for well-lit environments</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Card variant="outlined" sx={{ cursor: 'pointer', borderRadius: '12px', borderWidth: 2, borderColor: isDark ? theme.palette.primary.main : theme.palette.divider, backgroundColor: isDark ? alpha(theme.palette.primary.main, 0.05) : theme.palette.background.paper }}>
            <CardContent sx={{ textAlign: 'center', py: 4 }}>
              <DarkModeIcon sx={{ fontSize: 40, color: theme.palette.primary.main, mb: 1.5 }} />
              <Typography fontWeight={700} color="text.primary">Dark Workspace</Typography>
              <Typography variant="caption" color={labelColor}>Reduced eye strain in low light</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default React.memo(PreferencesTab);