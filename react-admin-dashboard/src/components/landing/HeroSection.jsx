import React from "react";
import {
  Avatar,
  Box,
  Button,
  Chip,
  Container,
  Grid,
  Paper,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";
import { alpha } from "@mui/material/styles";

import BoltRounded from "@mui/icons-material/BoltRounded";
import CheckCircleRounded from "@mui/icons-material/CheckCircleRounded";
import CloudDoneRounded from "@mui/icons-material/CloudDoneRounded";
import DashboardRounded from "@mui/icons-material/DashboardRounded";
import GroupsRounded from "@mui/icons-material/GroupsRounded";
import Inventory2Rounded from "@mui/icons-material/Inventory2Rounded";
import LockRounded from "@mui/icons-material/LockRounded";
import PlayCircleRounded from "@mui/icons-material/PlayCircleRounded";
import RocketLaunchRounded from "@mui/icons-material/RocketLaunchRounded";
import TrendingUpRounded from "@mui/icons-material/TrendingUpRounded";

const HeroSection = ({
  stats = [],
  selectedPlanName = "No plan",
  trial = true,
  scrollToRegistration,
  scrollToPlans,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const surface = isDark ? "#0f172a" : "#ffffff";
  const elevated = isDark ? "#111827" : "#ffffff";
  const border = alpha(theme.palette.divider, isDark ? 0.8 : 1);
  const muted = isDark ? "#94a3b8" : "#64748b";

  return (
    <Box
      id="top"
      component="section"
      sx={{
        position: "relative",
        overflow: "hidden",
        pt: { xs: 5, md: 9 },
        pb: { xs: 5, md: 8 },
        scrollMarginTop: 90,
        "&::before": {
          content: '""',
          position: "absolute",
          inset: 0,
          background: isDark
            ? `radial-gradient(circle at 15% 18%, ${alpha(
                theme.palette.primary.main,
                0.28
              )}, transparent 34%),
               radial-gradient(circle at 90% 8%, ${alpha(
                 theme.palette.info.main,
                 0.16
               )}, transparent 28%),
               linear-gradient(180deg, ${alpha("#020617", 0)} 0%, #020617 100%)`
            : `radial-gradient(circle at 15% 18%, ${alpha(
                theme.palette.primary.main,
                0.16
              )}, transparent 34%),
               radial-gradient(circle at 90% 8%, ${alpha(
                 theme.palette.info.main,
                 0.1
               )}, transparent 28%),
               linear-gradient(180deg, ${alpha("#ffffff", 0)} 0%, #f8fafc 100%)`,
          pointerEvents: "none",
        },
      }}
    >
      <Container maxWidth="xl" sx={{ position: "relative" }}>
        <Grid container spacing={{ xs: 4, lg: 7 }} alignItems="center">
          <Grid item xs={12} lg={6.4}>
            <Stack spacing={3}>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip
                  icon={<CloudDoneRounded />}
                  label="ERP SaaS API"
                  sx={{
                    borderRadius: 999,
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                    color: "primary.main",
                    fontWeight: 850,
                    border: `1px solid ${alpha(theme.palette.primary.main, 0.18)}`,
                  }}
                />

                <Chip
                  icon={<BoltRounded />}
                  label="Register · Test · Subscribe"
                  sx={{
                    borderRadius: 999,
                    bgcolor: alpha(theme.palette.success.main, 0.1),
                    color: "success.main",
                    fontWeight: 850,
                    border: `1px solid ${alpha(theme.palette.success.main, 0.18)}`,
                  }}
                />
              </Stack>

              <Box>
                <Typography
                  component="h1"
                  sx={{
                    fontSize: {
                      xs: "2.35rem",
                      sm: "3.1rem",
                      md: "4.15rem",
                      xl: "5rem",
                    },
                    lineHeight: 0.96,
                    fontWeight: 950,
                    letterSpacing: "-0.075em",
                    maxWidth: 880,
                  }}
                >
                  Launch a complete ERP workspace for any company in minutes.
                </Typography>

                <Typography
                  sx={{
                    mt: 2.5,
                    maxWidth: 720,
                    color: "text.secondary",
                    fontSize: { xs: "0.98rem", md: "1.08rem" },
                    lineHeight: 1.8,
                  }}
                >
                  A modern SaaS ERP platform for companies that need finance,
                  HRM, payroll, inventory, sales, purchasing, recruitment, leave
                  management, and analytics in one streamlined system.
                </Typography>
              </Box>

              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1.25}
                alignItems={{ xs: "stretch", sm: "center" }}
              >
                <Button
                  variant="contained"
                  size="large"
                  onClick={scrollToRegistration}
                  endIcon={<RocketLaunchRounded />}
                  sx={{
                    borderRadius: 3,
                    py: 1.25,
                    px: 2.4,
                    textTransform: "none",
                    fontWeight: 900,
                    boxShadow: `0 18px 45px ${alpha(
                      theme.palette.primary.main,
                      0.24
                    )}`,
                    "&:hover": { boxShadow: "none" },
                  }}
                >
                  Create Workspace
                </Button>

                <Button
                  variant="outlined"
                  size="large"
                  startIcon={<PlayCircleRounded />}
                  onClick={scrollToPlans}
                  sx={{
                    borderRadius: 3,
                    py: 1.25,
                    px: 2.4,
                    textTransform: "none",
                    fontWeight: 850,
                    bgcolor: alpha(surface, 0.55),
                  }}
                >
                  Compare Plans
                </Button>
              </Stack>

              <Grid container spacing={1.5}>
                {stats.map((stat) => (
                  <Grid item xs={6} sm={3} key={stat.label}>
                    <Paper
                      sx={{
                        p: 1.6,
                        borderRadius: 3,
                        border: `1px solid ${border}`,
                        bgcolor: alpha(surface, 0.78),
                        boxShadow: "none",
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: "1.35rem",
                          fontWeight: 950,
                          letterSpacing: "-0.05em",
                        }}
                      >
                        {stat.value}
                      </Typography>

                      <Typography
                        sx={{
                          fontSize: "0.72rem",
                          color: "text.secondary",
                        }}
                      >
                        {stat.label}
                      </Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </Stack>
          </Grid>

          <Grid item xs={12} lg={5.6}>
            <Paper
              elevation={0}
              sx={{
                position: "relative",
                p: { xs: 2, md: 2.5 },
                borderRadius: 6,
                bgcolor: alpha(elevated, isDark ? 0.9 : 0.94),
                border: `1px solid ${border}`,
                boxShadow: isDark
                  ? `0 32px 90px ${alpha("#000", 0.38)}`
                  : `0 32px 90px ${alpha("#64748b", 0.2)}`,
                overflow: "hidden",
              }}
            >
              <Box
                sx={{
                  position: "absolute",
                  width: 240,
                  height: 240,
                  borderRadius: "50%",
                  top: -100,
                  right: -90,
                  bgcolor: alpha(theme.palette.primary.main, 0.14),
                }}
              />

              <Stack spacing={2.2} sx={{ position: "relative" }}>
                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                >
                  <Box>
                    <Typography
                      sx={{
                        color: "primary.main",
                        fontSize: "0.74rem",
                        fontWeight: 800,
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                      }}
                    >
                      Live platform preview
                    </Typography>

                    <Typography
                      component="h2"
                      sx={{
                        mt: 0.5,
                        fontSize: "1.32rem",
                        fontWeight: 950,
                        letterSpacing: "-0.04em",
                      }}
                    >
                      Enterprise command center
                    </Typography>
                  </Box>

                  <Avatar
                    variant="rounded"
                    sx={{
                      bgcolor: alpha(theme.palette.primary.main, 0.12),
                      color: "primary.main",
                      borderRadius: 3,
                    }}
                  >
                    <DashboardRounded />
                  </Avatar>
                </Stack>

                <Grid container spacing={1.5}>
                  {[
                    {
                      label: "Revenue YTD",
                      value: "KES 8.4M",
                      icon: TrendingUpRounded,
                      color: theme.palette.success.main,
                    },
                    {
                      label: "Active Staff",
                      value: "128",
                      icon: GroupsRounded,
                      color: theme.palette.info.main,
                    },
                    {
                      label: "Inventory Value",
                      value: "KES 2.1M",
                      icon: Inventory2Rounded,
                      color: theme.palette.warning.main,
                    },
                    {
                      label: "Tenant Security",
                      value: "Scoped",
                      icon: LockRounded,
                      color: theme.palette.primary.main,
                    },
                  ].map((item) => {
                    const Icon = item.icon;

                    return (
                      <Grid item xs={6} key={item.label}>
                        <Paper
                          sx={{
                            p: 1.5,
                            borderRadius: 3,
                            bgcolor: alpha(item.color, 0.08),
                            border: `1px solid ${alpha(item.color, 0.18)}`,
                            boxShadow: "none",
                          }}
                        >
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Avatar
                              variant="rounded"
                              sx={{
                                width: 34,
                                height: 34,
                                borderRadius: 2,
                                bgcolor: alpha(item.color, 0.12),
                                color: item.color,
                              }}
                            >
                              <Icon fontSize="small" />
                            </Avatar>

                            <Box sx={{ minWidth: 0 }}>
                              <Typography
                                sx={{
                                  fontSize: "0.68rem",
                                  color: "text.secondary",
                                }}
                              >
                                {item.label}
                              </Typography>

                              <Typography
                                sx={{
                                  fontSize: "0.92rem",
                                  fontWeight: 950,
                                  letterSpacing: "-0.03em",
                                }}
                              >
                                {item.value}
                              </Typography>
                            </Box>
                          </Stack>
                        </Paper>
                      </Grid>
                    );
                  })}
                </Grid>

                <Paper
                  sx={{
                    p: 1.6,
                    borderRadius: 3,
                    bgcolor: isDark ? alpha("#020617", 0.55) : "#f8fafc",
                    border: `1px solid ${border}`,
                    boxShadow: "none",
                  }}
                >
                  <Stack spacing={1.2}>
                    {[
                      "Company registration and subscription setup",
                      "Role-aware modules and secure company scoping",
                      "Finance, HRM, stock, sales, and purchasing dashboards",
                    ].map((item) => (
                      <Stack
                        direction="row"
                        spacing={1}
                        alignItems="center"
                        key={item}
                      >
                        <CheckCircleRounded
                          sx={{ fontSize: 18, color: "success.main" }}
                        />
                        <Typography
                          sx={{
                            fontSize: "0.78rem",
                            color: "text.secondary",
                          }}
                        >
                          {item}
                        </Typography>
                      </Stack>
                    ))}
                  </Stack>
                </Paper>

                <Paper
                  sx={{
                    p: 1.5,
                    borderRadius: 3,
                    bgcolor: alpha(theme.palette.primary.main, 0.075),
                    border: `1px solid ${alpha(
                      theme.palette.primary.main,
                      0.16
                    )}`,
                    boxShadow: "none",
                  }}
                >
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1.5}
                    alignItems={{ xs: "flex-start", sm: "center" }}
                    justifyContent="space-between"
                  >
                    <Box>
                      <Typography sx={{ fontWeight: 900, fontSize: "0.86rem" }}>
                        Selected plan
                      </Typography>

                      <Typography sx={{ fontSize: "0.74rem", color: muted }}>
                        {selectedPlanName} ·{" "}
                        {trial ? "Trial mode" : "Subscription mode"}
                      </Typography>
                    </Box>

                    <Button
                      size="small"
                      variant="contained"
                      onClick={scrollToRegistration}
                      sx={{
                        borderRadius: 2,
                        textTransform: "none",
                        fontWeight: 850,
                        boxShadow: "none",
                      }}
                    >
                      Continue
                    </Button>
                  </Stack>
                </Paper>
              </Stack>
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default HeroSection;