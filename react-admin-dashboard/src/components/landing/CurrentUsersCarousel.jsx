import React from "react";
import {
  Avatar,
  Box,
  Button,
  Chip,
  Container,
  Grid,
  IconButton,
  Paper,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";
import { alpha } from "@mui/material/styles";

import ArrowBackIosNewRounded from "@mui/icons-material/ArrowBackIosNewRounded";
import ArrowForwardIosRounded from "@mui/icons-material/ArrowForwardIosRounded";
import ArrowForwardRounded from "@mui/icons-material/ArrowForwardRounded";

import { useCarousel } from "../../hooks/landing/useCarousel";
import { sectionLabelSx } from "../../utils/landing/landingData";

const CurrentUsersCarousel = ({ users = [], scrollToRegistration }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const surface = isDark ? "#0f172a" : "#ffffff";
  const border = alpha(theme.palette.divider, isDark ? 0.8 : 1);

  const { activeIndex, activeItem, setActiveIndex, previous, next } =
    useCarousel(users);

  if (!activeItem) return null;

  return (
    <Box
      id="users"
      component="section"
      sx={{
        py: { xs: 5, md: 8 },
        bgcolor: alpha(theme.palette.info.main, isDark ? 0.055 : 0.04),
        scrollMarginTop: 90,
      }}
    >
      <Container maxWidth="xl">
        <Grid container spacing={{ xs: 3, md: 5 }} alignItems="center">
          <Grid item xs={12} md={4}>
            <Typography sx={sectionLabelSx}>Current users</Typography>

            <Typography
              component="h2"
              sx={{
                mt: 1,
                fontSize: { xs: "1.8rem", md: "2.55rem" },
                fontWeight: 950,
                letterSpacing: "-0.06em",
                lineHeight: 1.05,
              }}
            >
              Built for real businesses across different industries.
            </Typography>

            <Typography
              sx={{
                mt: 1.5,
                color: "text.secondary",
                fontSize: "0.9rem",
                lineHeight: 1.75,
              }}
            >
              The ERP structure supports tenant-scoped organizations with
              different workflows, teams, locations, and reporting needs.
            </Typography>

            <Stack direction="row" spacing={1} sx={{ mt: 2.5 }}>
              <IconButton
                onClick={previous}
                sx={{
                  borderRadius: 2,
                  border: `1px solid ${border}`,
                  bgcolor: surface,
                }}
              >
                <ArrowBackIosNewRounded fontSize="small" />
              </IconButton>

              <IconButton
                onClick={next}
                sx={{
                  borderRadius: 2,
                  border: `1px solid ${border}`,
                  bgcolor: surface,
                }}
              >
                <ArrowForwardIosRounded fontSize="small" />
              </IconButton>
            </Stack>
          </Grid>

          <Grid item xs={12} md={8}>
            <Paper
              sx={{
                p: { xs: 2, md: 3 },
                borderRadius: 5,
                bgcolor: surface,
                border: `1px solid ${border}`,
                boxShadow: isDark
                  ? `0 22px 60px ${alpha("#000", 0.24)}`
                  : `0 22px 60px ${alpha("#64748b", 0.12)}`,
                overflow: "hidden",
              }}
            >
              <Grid container spacing={2} alignItems="stretch">
                <Grid item xs={12} md={5}>
                  <Paper
                    sx={{
                      height: "100%",
                      minHeight: 260,
                      p: 2.5,
                      borderRadius: 4,
                      bgcolor: alpha(theme.palette.primary.main, 0.08),
                      border: `1px solid ${alpha(theme.palette.primary.main, 0.16)}`,
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      boxShadow: "none",
                    }}
                  >
                    <Box>
                      <Avatar
                        variant="rounded"
                        sx={{
                          width: 58,
                          height: 58,
                          borderRadius: 3,
                          bgcolor: theme.palette.primary.main,
                          color: "#fff",
                          fontWeight: 950,
                          fontSize: "1.2rem",
                          mb: 2,
                        }}
                      >
                        {activeItem.name
                          .split(" ")
                          .slice(0, 2)
                          .map((x) => x[0])
                          .join("")}
                      </Avatar>

                      <Typography
                        component="h3"
                        sx={{
                          fontSize: "1.25rem",
                          fontWeight: 950,
                          letterSpacing: "-0.04em",
                        }}
                      >
                        {activeItem.name}
                      </Typography>

                      <Typography
                        sx={{
                          mt: 0.5,
                          fontSize: "0.8rem",
                          color: "text.secondary",
                        }}
                      >
                        {activeItem.industry} · {activeItem.location}
                      </Typography>
                    </Box>

                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      {activeItem.metrics.map((metric) => (
                        <Chip
                          key={metric}
                          label={metric}
                          size="small"
                          sx={{
                            borderRadius: 999,
                            fontWeight: 800,
                            bgcolor: alpha(theme.palette.primary.main, 0.12),
                            color: "primary.main",
                          }}
                        />
                      ))}
                    </Stack>
                  </Paper>
                </Grid>

                <Grid item xs={12} md={7}>
                  <Stack
                    sx={{
                      height: "100%",
                      minHeight: 260,
                      justifyContent: "space-between",
                    }}
                    spacing={3}
                  >
                    <Typography
                      sx={{
                        fontSize: { xs: "1.35rem", md: "1.75rem" },
                        lineHeight: 1.25,
                        fontWeight: 850,
                        letterSpacing: "-0.05em",
                      }}
                    >
                      “{activeItem.quote}”
                    </Typography>

                    <Box>
                      <Stack direction="row" spacing={0.75} sx={{ mb: 2 }}>
                        {users.map((user, index) => (
                          <Box
                            key={user.name}
                            onClick={() => setActiveIndex(index)}
                            sx={{
                              width: index === activeIndex ? 32 : 9,
                              height: 9,
                              borderRadius: 999,
                              cursor: "pointer",
                              bgcolor:
                                index === activeIndex
                                  ? theme.palette.primary.main
                                  : alpha(theme.palette.primary.main, 0.2),
                              transition: "width 180ms ease",
                            }}
                          />
                        ))}
                      </Stack>

                      <Button
                        variant="outlined"
                        onClick={scrollToRegistration}
                        endIcon={<ArrowForwardRounded />}
                        sx={{
                          borderRadius: 3,
                          textTransform: "none",
                          fontWeight: 850,
                        }}
                      >
                        Register a similar company
                      </Button>
                    </Box>
                  </Stack>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default CurrentUsersCarousel;