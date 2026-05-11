import React from "react";
import {
  Avatar,
  Container,
  Grid,
  Paper,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";
import { alpha } from "@mui/material/styles";

import AutoGraphRounded from "@mui/icons-material/AutoGraphRounded";
import BusinessRounded from "@mui/icons-material/BusinessRounded";
import CreditCardRounded from "@mui/icons-material/CreditCardRounded";
import PlayCircleRounded from "@mui/icons-material/PlayCircleRounded";

import { sectionLabelSx } from "../../utils/landing/landingData";

const icons = {
  AutoGraphRounded,
  BusinessRounded,
  CreditCardRounded,
  PlayCircleRounded,
};

const WorkflowSection = ({ workflow = [] }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const surface = isDark ? "#0f172a" : "#ffffff";
  const border = alpha(theme.palette.divider, isDark ? 0.8 : 1);

  return (
    <Container
      id="workflow"
      component="section"
      maxWidth="xl"
      sx={{ py: { xs: 5, md: 8 }, scrollMarginTop: 90 }}
    >
      <Stack spacing={1.4} alignItems="center" sx={{ textAlign: "center", mb: 4 }}>
        <Typography sx={sectionLabelSx}>How it works</Typography>

        <Typography
          component="h2"
          sx={{
            fontSize: { xs: "1.8rem", md: "2.55rem" },
            fontWeight: 950,
            letterSpacing: "-0.06em",
            lineHeight: 1.05,
            maxWidth: 780,
          }}
        >
          A simple path from registration to a working ERP workspace.
        </Typography>
      </Stack>

      <Grid container spacing={2}>
        {workflow.map((step, index) => {
          const Icon = icons[step.icon] || BusinessRounded;

          return (
            <Grid item xs={12} md={3} key={step.title}>
              <Paper
                sx={{
                  height: "100%",
                  p: 2.5,
                  borderRadius: 4,
                  bgcolor: surface,
                  border: `1px solid ${border}`,
                  boxShadow: "none",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <Typography
                  sx={{
                    position: "absolute",
                    right: 16,
                    top: 10,
                    fontSize: "2.8rem",
                    lineHeight: 1,
                    fontWeight: 950,
                    color: alpha(theme.palette.primary.main, 0.08),
                  }}
                >
                  {String(index + 1).padStart(2, "0")}
                </Typography>

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
                  component="h3"
                  sx={{ fontSize: "0.96rem", fontWeight: 900 }}
                >
                  {step.title}
                </Typography>

                <Typography
                  sx={{
                    mt: 1,
                    fontSize: "0.78rem",
                    color: "text.secondary",
                    lineHeight: 1.65,
                  }}
                >
                  {step.description}
                </Typography>
              </Paper>
            </Grid>
          );
        })}
      </Grid>
    </Container>
  );
};

export default WorkflowSection;