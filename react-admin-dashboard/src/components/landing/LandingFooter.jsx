import React from "react";
import {
  Avatar,
  Box,
  Button,
  Container,
  Divider,
  Grid,
  IconButton,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";
import { alpha } from "@mui/material/styles";

import DataObjectRounded from "@mui/icons-material/DataObjectRounded";
import LinkedIn from "@mui/icons-material/LinkedIn";
import PublicRounded from "@mui/icons-material/PublicRounded";
import X from "@mui/icons-material/X";

const LandingFooter = ({
  navItems = [],
  scrollToSection,
  scrollToRegistration,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  return (
    <Box
      component="footer"
      sx={{
        bgcolor: isDark ? "#020617" : "#0f172a",
        color: "#fff",
        position: "relative",
        overflow: "hidden",
        pt: { xs: 5, md: 7 },
        pb: 3,
        "&::before": {
          content: '""',
          position: "absolute",
          width: 420,
          height: 420,
          borderRadius: "50%",
          right: -180,
          top: -180,
          bgcolor: alpha(theme.palette.primary.main, 0.22),
        },
      }}
    >
      <Container maxWidth="xl" sx={{ position: "relative" }}>
        <Grid container spacing={4}>
          <Grid item xs={12} md={4}>
            <Stack spacing={2}>
              <Stack direction="row" spacing={1.25} alignItems="center">
                <Avatar
                  variant="rounded"
                  sx={{
                    width: 42,
                    height: 42,
                    borderRadius: 2,
                    bgcolor: alpha("#ffffff", 0.12),
                    color: "#fff",
                    border: `1px solid ${alpha("#ffffff", 0.18)}`,
                  }}
                >
                  <DataObjectRounded />
                </Avatar>

                <Box>
                  <Typography sx={{ fontWeight: 950, fontSize: "1rem" }}>
                    LigcoSync ERP
                  </Typography>

                  <Typography
                    sx={{
                      color: alpha("#fff", 0.68),
                      fontSize: "0.72rem",
                    }}
                  >
                    Enterprise SaaS Platform
                  </Typography>
                </Box>
              </Stack>

              <Typography
                sx={{
                  color: alpha("#fff", 0.72),
                  fontSize: "0.85rem",
                  lineHeight: 1.8,
                  maxWidth: 430,
                }}
              >
                A modern ERP platform for companies that need streamlined
                finance, HRM, payroll, inventory, sales, purchasing,
                recruitment, and analytics.
              </Typography>

              <Stack direction="row" spacing={1}>
                {[LinkedIn, X, PublicRounded].map((Icon, index) => (
                  <IconButton
                    key={index}
                    sx={{
                      color: "#fff",
                      border: `1px solid ${alpha("#fff", 0.18)}`,
                      bgcolor: alpha("#fff", 0.06),
                      "&:hover": { bgcolor: alpha("#fff", 0.12) },
                    }}
                  >
                    <Icon fontSize="small" />
                  </IconButton>
                ))}
              </Stack>
            </Stack>
          </Grid>

          <Grid item xs={12} sm={6} md={2}>
            <Typography sx={{ fontWeight: 900, mb: 1.5 }}>Platform</Typography>

            <Stack spacing={1}>
              {navItems.map(([label, id]) => (
                <Typography
                  key={id}
                  onClick={() => scrollToSection?.(id)}
                  sx={{
                    color: alpha("#fff", 0.68),
                    fontSize: "0.8rem",
                    cursor: "pointer",
                    "&:hover": { color: "#fff" },
                  }}
                >
                  {label}
                </Typography>
              ))}
            </Stack>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Typography sx={{ fontWeight: 900, mb: 1.5 }}>Modules</Typography>

            <Stack spacing={1}>
              {[
                "Finance",
                "HRM & Payroll",
                "Inventory",
                "Sales",
                "Recruitment",
              ].map((item) => (
                <Typography
                  key={item}
                  sx={{ color: alpha("#fff", 0.68), fontSize: "0.8rem" }}
                >
                  {item}
                </Typography>
              ))}
            </Stack>
          </Grid>

          <Grid item xs={12} md={3}>
            <Typography sx={{ fontWeight: 900, mb: 1.5 }}>
              Get started
            </Typography>

            <Typography
              sx={{
                color: alpha("#fff", 0.72),
                fontSize: "0.82rem",
                lineHeight: 1.7,
                mb: 2,
              }}
            >
              Register a company workspace and test the ERP with your selected
              subscription plan.
            </Typography>

            <Stack direction="row" spacing={1}>
              <Button
                variant="contained"
                onClick={scrollToRegistration}
                sx={{
                  borderRadius: 2,
                  textTransform: "none",
                  fontWeight: 900,
                  boxShadow: "none",
                }}
              >
                Register
              </Button>

              <Button
                variant="outlined"
                onClick={() => scrollToSection?.("contact")}
                sx={{
                  borderRadius: 2,
                  textTransform: "none",
                  color: "#fff",
                  borderColor: alpha("#fff", 0.28),
                  fontWeight: 850,
                  "&:hover": {
                    borderColor: "#fff",
                    bgcolor: alpha("#fff", 0.08),
                  },
                }}
              >
                Contact
              </Button>
            </Stack>
          </Grid>
        </Grid>

        <Divider sx={{ my: 4, borderColor: alpha("#fff", 0.14) }} />

        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          alignItems={{ xs: "flex-start", md: "center" }}
          justifyContent="space-between"
        >
          <Typography sx={{ color: alpha("#fff", 0.62), fontSize: "0.76rem" }}>
            © {new Date().getFullYear()} Ligco Technologies. All rights reserved.
          </Typography>

          <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
            {["Privacy", "Terms", "Security", "Support"].map((item) => (
              <Typography
                key={item}
                sx={{
                  color: alpha("#fff", 0.62),
                  fontSize: "0.76rem",
                  cursor: "pointer",
                  "&:hover": { color: "#fff" },
                }}
              >
                {item}
              </Typography>
            ))}
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
};

export default LandingFooter;