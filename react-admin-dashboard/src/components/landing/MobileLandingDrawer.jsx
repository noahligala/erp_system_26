import React from "react";
import {
  Avatar,
  Box,
  Button,
  Divider,
  Drawer,
  IconButton,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";
import { alpha } from "@mui/material/styles";

import CloseRounded from "@mui/icons-material/CloseRounded";
import DataObjectRounded from "@mui/icons-material/DataObjectRounded";
import ArrowForwardRounded from "@mui/icons-material/ArrowForwardRounded";

const MobileLandingDrawer = ({
  open = false,
  onClose,
  navItems = [],
  scrollToSection,
  scrollToRegistration,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const surface = isDark ? "#0f172a" : "#ffffff";
  const border = isDark ? alpha("#94a3b8", 0.22) : alpha("#64748b", 0.2);
  const drawerZIndex = 2200;

  const handleClose = () => {
    if (typeof onClose === "function") {
      onClose();
    }
  };

  const handleNavigate = (id) => {
    if (typeof scrollToSection === "function") {
      scrollToSection(id);
    }

    handleClose();
  };

  const handleRegister = () => {
    if (typeof scrollToRegistration === "function") {
      scrollToRegistration();
    }

    handleClose();
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={handleClose}
      variant="temporary"
      ModalProps={{
        keepMounted: true,
        disablePortal: false,
        sx: {
          zIndex: `${drawerZIndex} !important`,
        },
      }}
      slotProps={{
        root: {
          sx: {
            zIndex: `${drawerZIndex} !important`,
          },
        },
        backdrop: {
          sx: {
            zIndex: `${drawerZIndex - 1} !important`,
            bgcolor: alpha("#020617", isDark ? 0.72 : 0.42),
            backdropFilter: "blur(4px)",
            WebkitBackdropFilter: "blur(4px)",
          },
        },
      }}
      sx={{
        zIndex: `${drawerZIndex} !important`,
        "& .MuiModal-root": {
          zIndex: `${drawerZIndex} !important`,
        },
        "& .MuiBackdrop-root": {
          zIndex: `${drawerZIndex - 1} !important`,
        },
        "& .MuiDrawer-paper": {
          zIndex: `${drawerZIndex} !important`,
        },
      }}
      PaperProps={{
        sx: {
          zIndex: `${drawerZIndex} !important`,
          width: { xs: "86vw", sm: 340 },
          maxWidth: 360,
          bgcolor: surface,
          color: "text.primary",
          borderLeft: `1px solid ${border}`,
          boxShadow: isDark
            ? `-24px 0 70px ${alpha("#000", 0.48)}`
            : `-24px 0 70px ${alpha("#64748b", 0.22)}`,
          backgroundImage: "none",
        },
      }}
    >
      <Box
        sx={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          p: 2,
        }}
      >
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          spacing={1.5}
          sx={{ pb: 1.5 }}
        >
          <Stack direction="row" spacing={1.25} alignItems="center" minWidth={0}>
            <Avatar
              variant="rounded"
              sx={{
                width: 42,
                height: 42,
                borderRadius: 2,
                bgcolor: alpha(theme.palette.primary.main, 0.12),
                color: "primary.main",
                border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                flexShrink: 0,
              }}
            >
              <DataObjectRounded sx={{ fontSize: 23, display: "block" }} />
            </Avatar>

            <Box sx={{ minWidth: 0 }}>
              <Typography
                sx={{
                  fontSize: "0.98rem",
                  fontWeight: 900,
                  letterSpacing: "-0.035em",
                  lineHeight: 1.1,
                  whiteSpace: "nowrap",
                }}
              >
                LigcoSync ERP
              </Typography>

              <Typography
                sx={{
                  mt: 0.25,
                  fontSize: "0.68rem",
                  color: "text.secondary",
                  lineHeight: 1.2,
                  whiteSpace: "nowrap",
                }}
              >
                Enterprise SaaS Platform
              </Typography>
            </Box>
          </Stack>

          <IconButton
            onClick={handleClose}
            aria-label="Close navigation menu"
            sx={{
              width: 38,
              height: 38,
              borderRadius: 2,
              color: "text.secondary",
              bgcolor: alpha(theme.palette.text.primary, isDark ? 0.06 : 0.04),
              border: `1px solid ${border}`,
              "&:hover": {
                color: "primary.main",
                bgcolor: alpha(theme.palette.primary.main, 0.1),
              },
            }}
          >
            <CloseRounded sx={{ fontSize: 22, display: "block" }} />
          </IconButton>
        </Stack>

        <Divider sx={{ mb: 1.5, borderColor: border }} />

        <Stack
          component="nav"
          aria-label="Mobile landing navigation"
          spacing={0.5}
          sx={{ py: 1 }}
        >
          {navItems.map(([label, id]) => (
            <Button
              key={id}
              fullWidth
              onClick={() => handleNavigate(id)}
              sx={{
                justifyContent: "space-between",
                borderRadius: 2,
                px: 1.5,
                py: 1.15,
                textTransform: "none",
                fontSize: "0.84rem",
                fontWeight: 800,
                color: "text.primary",
                "&:hover": {
                  color: "primary.main",
                  bgcolor: alpha(theme.palette.primary.main, 0.08),
                },
              }}
              endIcon={
                <ArrowForwardRounded
                  sx={{
                    fontSize: "18px !important",
                    color: "text.disabled",
                    display: "block",
                  }}
                />
              }
            >
              {label}
            </Button>
          ))}
        </Stack>

        <Divider sx={{ my: 1.5, borderColor: border }} />

        <Box
          sx={{
            p: 1.5,
            borderRadius: 2,
            bgcolor: alpha(theme.palette.primary.main, isDark ? 0.12 : 0.08),
            border: `1px solid ${alpha(theme.palette.primary.main, 0.16)}`,
          }}
        >
          <Typography
            sx={{
              fontSize: "0.86rem",
              fontWeight: 900,
              letterSpacing: "-0.025em",
            }}
          >
            Start testing LigcoSync
          </Typography>

          <Typography
            sx={{
              mt: 0.5,
              fontSize: "0.74rem",
              color: "text.secondary",
              lineHeight: 1.6,
            }}
          >
            Register a company workspace, choose a plan, and test the ERP
            modules.
          </Typography>

          <Stack spacing={1} sx={{ mt: 1.5 }}>
            <Button
              fullWidth
              variant="contained"
              onClick={handleRegister}
              endIcon={
                <ArrowForwardRounded
                  sx={{
                    fontSize: "18px !important",
                    display: "block",
                  }}
                />
              }
              sx={{
                borderRadius: 1.75,
                textTransform: "none",
                fontWeight: 900,
                py: 1,
                boxShadow: "none",
                "&:hover": {
                  boxShadow: "none",
                },
              }}
            >
              Create Workspace
            </Button>

            <Button
              fullWidth
              href="/login"
              variant="outlined"
              sx={{
                borderRadius: 1.75,
                textTransform: "none",
                fontWeight: 850,
                py: 1,
              }}
            >
              Login
            </Button>
          </Stack>
        </Box>

        <Box sx={{ flexGrow: 1 }} />

        <Box sx={{ pt: 2 }}>
          <Divider sx={{ mb: 1.5, borderColor: border }} />

          <Typography
            sx={{
              fontSize: "0.72rem",
              color: "text.secondary",
              lineHeight: 1.6,
            }}
          >
            LigcoSync ERP helps companies manage finance, HRM, payroll,
            inventory, sales, purchasing, recruitment, and analytics from one
            secure platform.
          </Typography>

          <Typography
            sx={{
              mt: 1.25,
              fontSize: "0.68rem",
              color: "text.disabled",
            }}
          >
            © {new Date().getFullYear()} Ligco Technologies
          </Typography>
        </Box>
      </Box>
    </Drawer>
  );
};

export default MobileLandingDrawer;