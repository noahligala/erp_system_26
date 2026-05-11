import React from "react";
import {
  Avatar,
  Card,
  CardContent,
  Container,
  Grid,
  Typography,
  useTheme,
} from "@mui/material";
import { alpha } from "@mui/material/styles";

import RocketLaunchRounded from "@mui/icons-material/RocketLaunchRounded";
import SecurityRounded from "@mui/icons-material/SecurityRounded";
import DashboardRounded from "@mui/icons-material/DashboardRounded";

const icons = {
  RocketLaunchRounded,
  SecurityRounded,
  DashboardRounded,
};

const BenefitsSection = ({ benefits = [] }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const surface = isDark ? "#0f172a" : "#ffffff";
  const border = alpha(theme.palette.divider, isDark ? 0.8 : 1);

  return (
    <Container component="section" maxWidth="xl" sx={{ py: { xs: 4, md: 7 } }}>
      <Grid container spacing={2}>
        {benefits.map((benefit) => {
          const Icon = icons[benefit.icon] || RocketLaunchRounded;

          return (
            <Grid item xs={12} md={4} key={benefit.title}>
              <Card
                elevation={0}
                sx={{
                  height: "100%",
                  borderRadius: 4,
                  border: `1px solid ${border}`,
                  bgcolor: surface,
                  transition:
                    "transform 160ms ease, border-color 160ms ease, box-shadow 160ms ease",
                  "&:hover": {
                    transform: "translateY(-4px)",
                    borderColor: alpha(theme.palette.primary.main, 0.35),
                    boxShadow: `0 18px 50px ${alpha(
                      theme.palette.primary.main,
                      isDark ? 0.12 : 0.1
                    )}`,
                  },
                }}
              >
                <CardContent sx={{ p: 2.5 }}>
                  <Avatar
                    variant="rounded"
                    sx={{
                      width: 44,
                      height: 44,
                      borderRadius: 3,
                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                      color: "primary.main",
                      mb: 2,
                    }}
                  >
                    <Icon />
                  </Avatar>

                  <Typography
                    component="h2"
                    sx={{
                      fontSize: "1rem",
                      fontWeight: 900,
                      letterSpacing: "-0.025em",
                    }}
                  >
                    {benefit.title}
                  </Typography>

                  <Typography
                    sx={{
                      mt: 1,
                      fontSize: "0.82rem",
                      lineHeight: 1.65,
                      color: "text.secondary",
                    }}
                  >
                    {benefit.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Container>
  );
};

export default BenefitsSection;