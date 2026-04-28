import React, { useState } from 'react';
import { Box, Typography, Button, List, ListItem, ListItemIcon, ListItemText, ListItemSecondaryAction, Tooltip, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Stack, alpha, useTheme } from '@mui/material';
import KeyIcon from '@mui/icons-material/Key';
import ApiIcon from '@mui/icons-material/Api';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import WebhookIcon from '@mui/icons-material/Webhook';

const ApiAccessTab = ({ labelColor, inputSx }) => {
  const theme = useTheme();
  const [apiKeysDialog, setApiKeysDialog] = useState(false);

  const mockApiKeys = [
    { name: "ERP Sync Service", key: "pk_live_••••••••••••", created: "2025-01-15", lastUsed: "2026-04-25" },
    { name: "SMS Gateway Webhook", key: "pk_test_••••••••••••", created: "2025-02-20", lastUsed: "2026-04-26" },
  ];

  return (
    <Box>
      <Typography variant="h5" fontWeight={800} color="text.primary" mb={1}>API Keys & Integrations</Typography>
      <Typography variant="body2" color={labelColor} mb={4}>Manage secure tokens for third-party microservices and POS integrations.</Typography>

      <Button
        variant="contained" disableElevation startIcon={<KeyIcon />}
        onClick={() => setApiKeysDialog(true)}
        sx={{ mb: 4, borderRadius: '8px', textTransform: 'none', fontWeight: 700, color: '#fff', width: { xs: '100%', sm: 'auto' } }}
      >
        Generate New Token
      </Button>

      <List sx={{ width: '100%' }}>
        {mockApiKeys.map((apiKey, idx) => (
          <ListItem key={idx} sx={{ borderRadius: '12px', mb: 2, backgroundColor: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}`, '&:hover': { backgroundColor: alpha(theme.palette.action.hover, 0.05) } }}>
            <ListItemIcon sx={{ display: { xs: 'none', sm: 'inline-flex' } }}>
              <ApiIcon sx={{ color: theme.palette.primary.main }} />
            </ListItemIcon>
            <ListItemText
              primary={<Typography fontWeight={800} color="text.primary">{apiKey.name}</Typography>}
              secondary={
                <Box mt={0.5}>
                  <Typography variant="caption" sx={{ fontFamily: 'monospace', bgcolor: alpha(theme.palette.text.primary, 0.05), px: 1, py: 0.5, borderRadius: '4px', wordBreak: 'break-all' }} color="text.primary" display="inline-block">
                    {apiKey.key}
                  </Typography>
                  <Typography variant="caption" color={labelColor} display="block" mt={1}>
                    Created: {apiKey.created} • Last used: {apiKey.lastUsed}
                  </Typography>
                </Box>
              }
              sx={{ pr: { xs: 4, sm: 6 } }}
            />
            <ListItemSecondaryAction>
              <Tooltip title="Revoke Key">
                <IconButton edge="end" color="error" size="small"><DeleteForeverIcon /></IconButton>
              </Tooltip>
            </ListItemSecondaryAction>
          </ListItem>
        ))}
      </List>

      <Box mt={4} p={{ xs: 2, sm: 3 }} sx={{ backgroundColor: alpha(theme.palette.background.default, 0.6), borderRadius: '16px', border: `1px solid ${theme.palette.divider}` }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', sm: 'center' }}>
          <Box display="flex" gap={2} alignItems="center">
            <WebhookIcon sx={{ color: theme.palette.secondary.main || '#9c27b0' }} />
            <Box>
              <Typography variant="body2" fontWeight={700} color="text.primary">Developer Documentation</Typography>
              <Typography variant="caption" color={labelColor}>Explore endpoints for full REST API integration.</Typography>
            </Box>
          </Box>
          <Button variant="text" sx={{ ml: { sm: 'auto' }, mt: { xs: 1, sm: 0 }, color: theme.palette.primary.main, fontWeight: 700 }}>
            View Docs →
          </Button>
        </Stack>
      </Box>

      {/* Generate API Key Dialog */}
      <Dialog open={apiKeysDialog} onClose={() => setApiKeysDialog(false)} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: '20px', background: theme.palette.background.paper, m: { xs: 2, sm: 4 } } }}>
        <DialogTitle><Typography variant="h5" fontWeight={800} color="text.primary">Generate API Token</Typography></DialogTitle>
        <DialogContent>
          <Typography variant="body2" color={labelColor} mb={2} mt={1}>Assign a descriptive name to this token to easily identify its integration scope later.</Typography>
          <TextField fullWidth placeholder="e.g., POS Webhook Gateway" variant="outlined" size="small" sx={{ ...inputSx, mt: 1 }} />
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0, flexDirection: { xs: 'column-reverse', sm: 'row' }, gap: { xs: 1, sm: 0 } }}>
          <Button onClick={() => setApiKeysDialog(false)} sx={{ fontWeight: 600, color: labelColor, width: { xs: '100%', sm: 'auto' } }}>Cancel</Button>
          <Button variant="contained" disableElevation onClick={() => setApiKeysDialog(false)} sx={{ fontWeight: 700, borderRadius: '8px', width: { xs: '100%', sm: 'auto' }, color: '#fff' }}>
            Generate Token
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default React.memo(ApiAccessTab);