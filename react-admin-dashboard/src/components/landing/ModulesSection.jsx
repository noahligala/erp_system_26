import React from "react";
import {
  Avatar,
  Box,
  Container,
  Grid,
  Paper,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";
import { alpha } from "@mui/material/styles";

import AccountTreeRounded from "@mui/icons-material/AccountTreeRounded";
import AnalyticsRounded from "@mui/icons-material/AnalyticsRounded";
import BadgeRounded from "@mui/icons-material/BadgeRounded";
import CalendarMonthRounded from "@mui/icons-material/CalendarMonthRounded";
import GroupsRounded from "@mui/icons-material/GroupsRounded";
import Inventory2Rounded from "@mui/icons-material/Inventory2Rounded";
import PaymentsRounded from "@mui/icons-material/PaymentsRounded";
import ReceiptLongRounded from "@mui/icons-material/ReceiptLongRounded";

import { sectionLabelSx } from "../../utils/landing/landingData";

const icons = {
  AccountTreeRounded,
  AnalyticsRounded,
  BadgeRounded,
  CalendarMonthRounded,
  GroupsRounded,
  Inventory2Rounded,
  PaymentsRounded,
  ReceiptLongRounded,
};

const ModulesSection = ({ modules = [] }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const surface = isDark ? "#0f172a" : "#ffffff";
  const sectionBg = isDark
    ? alpha(theme.palette.primary.main, 0.045)
    : alpha("#64748b", 0.045);

  const border = isDark ? alpha("#94a3b8", 0.2) : alpha("#64748b", 0.2);

  const borderHover = isDark
    ? alpha("#94a3b8", 0.34)
    : alpha("#64748b", 0.36);

  return (
    <Box
      id="modules"
      component="section"
      sx={{
        width: "100%",
        py: { xs: 4.5, sm: 5.5, md: 7.5, lg: 8 },
        bgcolor: sectionBg,
        scrollMarginTop: { xs: 76, sm: 82, md: 92 },
        overflowX: "clip",
      }}
    >
      <Container
        maxWidth="xl"
        sx={{
          width: "100%",
          maxWidth: {
            xs: "100%",
            md: 1180,
            lg: 1240,
            xl: 1320,
          },
          mx: "auto",
          px: {
            xs: 2,
            sm: 3,
            md: 3.5,
            lg: 4,
          },
        }}
      >
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={{ xs: 1.75, md: 3 }}
          justifyContent="space-between"
          alignItems={{ xs: "center", md: "flex-end" }}
          sx={{
            mb: { xs: 3, md: 4 },
            textAlign: { xs: "center", md: "left" },
          }}
        >
          <Box
            sx={{
              width: "100%",
              maxWidth: { xs: 720, md: 780 },
            }}
          >
            <Typography
              sx={{
                ...sectionLabelSx,
                display: "inline-flex",
                justifyContent: "center",
              }}
            >
              ERP modules
            </Typography>

            <Typography
              component="h2"
              sx={{
                mt: 1,
                fontSize: {
                  xs: "1.5rem",
                  sm: "1.85rem",
                  md: "2.25rem",
                  lg: "2.5rem",
                },
                fontWeight: 900,
                letterSpacing: {
                  xs: "-0.045em",
                  md: "-0.055em",
                },
                lineHeight: 1.08,
                color: "text.primary",
                maxWidth: 780,
                mx: { xs: "auto", md: 0 },
              }}
            >
              One connected platform for daily operations and reporting.
            </Typography>
          </Box>

          <Typography
            sx={{
              width: "100%",
              maxWidth: { xs: 640, md: 500, lg: 560 },
              color: "text.secondary",
              fontSize: { xs: "0.8rem", sm: "0.84rem", md: "0.88rem" },
              lineHeight: 1.7,
              textAlign: { xs: "center", md: "left" },
            }}
          >
            Start with the modules your client needs now, then scale into a
            full ERP as operations mature.
          </Typography>
        </Stack>

        <Grid
          container
          spacing={{ xs: 1.5, sm: 2, md: 2.25 }}
          alignItems="stretch"
          justifyContent="center"
          sx={{
            width: "100%",
            m: "0 !important",
          }}
        >
          {modules.map((module) => {
            const Icon = icons[module.icon] || ReceiptLongRounded;

            return (
              <Grid
                item
                xs={12}
                sm={6}
                md={4}
                lg={3}
                key={module.title}
                sx={{
                  display: "flex",
                  pl: {
                    xs: "0 !important",
                  },
                }}
              >
                <Paper
                  elevation={0}
                  sx={{
                    width: "100%",
                    height: "100%",
                    minHeight: { xs: 148, sm: 170, md: 188 },
                    p: { xs: 1.75, sm: 2, md: 2.25 },
                    borderRadius: { xs: 1.5, md: 2 },
                    bgcolor: surface,
                    border: `1px solid ${border}`,
                    boxShadow: "none",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: { xs: "flex-start", sm: "flex-start" },
                    textAlign: "left",
                    overflow: "hidden",
                    transition:
                      "transform 160ms ease, border-color 160ms ease, background-color 160ms ease",
                    "&:hover": {
                      transform: { xs: "none", md: "translateY(-3px)" },
                      borderColor: borderHover,
                      bgcolor: isDark
                        ? alpha("#ffffff", 0.035)
                        : alpha("#ffffff", 0.96),
                    },
                  }}
                >
                  <Avatar
                    variant="rounded"
                    sx={{
                      width: { xs: 38, md: 42 },
                      height: { xs: 38, md: 42 },
                      borderRadius: { xs: 1.5, md: 2 },
                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                      color: "primary.main",
                      mb: { xs: 1.4, md: 1.75 },
                      flexShrink: 0,
                    }}
                  >
                    <Icon sx={{ fontSize: { xs: 20, md: 22 } }} />
                  </Avatar>

                  <Typography
                    component="h3"
                    sx={{
                      fontWeight: 850,
                      fontSize: { xs: "0.88rem", md: "0.95rem" },
                      lineHeight: 1.25,
                      color: "text.primary",
                      overflowWrap: "anywhere",
                    }}
                  >
                    {module.title}
                  </Typography>

                  <Typography
                    sx={{
                      mt: 0.85,
                      fontSize: { xs: "0.74rem", md: "0.78rem" },
                      color: "text.secondary",
                      lineHeight: 1.6,
                      overflowWrap: "anywhere",
                    }}
                  >
                    {module.text}
                  </Typography>
                </Paper>
              </Grid>
            );
          })}
        </Grid>
      </Container>
    </Box>
  );
};

export default ModulesSection;