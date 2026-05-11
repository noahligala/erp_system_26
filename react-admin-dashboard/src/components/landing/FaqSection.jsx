import React from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Container,
  Grid,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";
import { alpha } from "@mui/material/styles";

import ExpandMoreRounded from "@mui/icons-material/ExpandMoreRounded";

import { sectionLabelSx } from "../../utils/landing/landingData";

const FaqSection = ({ faqItems = [] }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const surface = isDark ? "#0f172a" : "#ffffff";
  const border = alpha(theme.palette.divider, isDark ? 0.8 : 1);

  return (
    <Container component="section" maxWidth="xl" sx={{ py: { xs: 5, md: 7 } }}>
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Typography sx={sectionLabelSx}>FAQ</Typography>

          <Typography
            component="h2"
            sx={{
              mt: 1,
              fontSize: { xs: "1.65rem", md: "2.15rem" },
              fontWeight: 950,
              letterSpacing: "-0.055em",
              lineHeight: 1.08,
            }}
          >
            Common questions before registration.
          </Typography>

          <Typography
            sx={{
              mt: 1.5,
              color: "text.secondary",
              fontSize: "0.86rem",
              lineHeight: 1.7,
            }}
          >
            The landing page is designed for companies evaluating the ERP and
            for internal demos during development.
          </Typography>
        </Grid>

        <Grid item xs={12} md={8}>
          <Stack spacing={1.25}>
            {faqItems.map((item, index) => (
              <Accordion
                key={item.q}
                disableGutters
                elevation={0}
                defaultExpanded={index === 0}
                sx={{
                  borderRadius: "16px !important",
                  border: `1px solid ${border}`,
                  bgcolor: surface,
                  overflow: "hidden",
                  "&::before": { display: "none" },
                }}
              >
                <AccordionSummary expandIcon={<ExpandMoreRounded />}>
                  <Typography sx={{ fontWeight: 900, fontSize: "0.9rem" }}>
                    {item.q}
                  </Typography>
                </AccordionSummary>

                <AccordionDetails>
                  <Typography
                    sx={{
                      color: "text.secondary",
                      fontSize: "0.8rem",
                      lineHeight: 1.7,
                    }}
                  >
                    {item.a}
                  </Typography>
                </AccordionDetails>
              </Accordion>
            ))}
          </Stack>
        </Grid>
      </Grid>
    </Container>
  );
};

export default FaqSection;