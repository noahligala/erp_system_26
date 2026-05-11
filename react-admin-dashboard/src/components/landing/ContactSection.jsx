import React, { useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Container,
  Grid,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
  useTheme,
} from "@mui/material";
import { alpha } from "@mui/material/styles";

import ArrowForwardRounded from "@mui/icons-material/ArrowForwardRounded";
import CloseRounded from "@mui/icons-material/CloseRounded";
import EmailRounded from "@mui/icons-material/EmailRounded";
import LocalPhoneRounded from "@mui/icons-material/LocalPhoneRounded";
import LocationOnRounded from "@mui/icons-material/LocationOnRounded";
import PublicRounded from "@mui/icons-material/PublicRounded";

import { sectionLabelSx } from "../../utils/landing/landingData";

const initialContactForm = {
  name: "",
  email: "",
  phone: "",
  company: "",
  message: "",
};

const ContactSection = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const surface = isDark ? "#0f172a" : "#ffffff";
  const border = alpha(theme.palette.divider, isDark ? 0.8 : 1);
  const muted = isDark ? "#94a3b8" : "#64748b";

  const [contactForm, setContactForm] = useState(initialContactForm);
  const [contactStatus, setContactStatus] = useState(null);

  const handleContactChange = (event) => {
    const { name, value } = event.target;
    setContactForm((prev) => ({ ...prev, [name]: value }));
    if (contactStatus) setContactStatus(null);
  };

  const handleContactSubmit = (event) => {
    event.preventDefault();

    if (!contactForm.name || !contactForm.email || !contactForm.message) {
      setContactStatus({
        type: "error",
        message: "Please provide your name, email, and message.",
      });
      return;
    }

    const subject = encodeURIComponent(
      `LigcoSync ERP inquiry from ${contactForm.name}`
    );

    const body = encodeURIComponent(
      [
        `Name: ${contactForm.name}`,
        `Email: ${contactForm.email}`,
        `Phone: ${contactForm.phone || "-"}`,
        `Company: ${contactForm.company || "-"}`,
        "",
        contactForm.message,
      ].join("\n")
    );

    window.location.href = `mailto:info@ligco.tech?subject=${subject}&body=${body}`;

    setContactStatus({
      type: "success",
      message:
        "Your email client has been opened. Send the message to contact LigcoSync.",
    });
  };

  return (
    <Box
      id="contact"
      component="section"
      sx={{
        py: { xs: 5, md: 8 },
        bgcolor: isDark ? "#020617" : "#ffffff",
        scrollMarginTop: 90,
      }}
    >
      <Container maxWidth="xl">
        <Grid container spacing={{ xs: 3, md: 5 }} alignItems="stretch">
          <Grid item xs={12} md={5}>
            <Stack spacing={2.5}>
              <Typography sx={sectionLabelSx}>Contact us</Typography>

              <Typography
                component="h2"
                sx={{
                  fontSize: { xs: "1.8rem", md: "2.55rem" },
                  lineHeight: 1.05,
                  fontWeight: 950,
                  letterSpacing: "-0.06em",
                }}
              >
                Need help testing, onboarding, or customizing the ERP?
              </Typography>

              <Typography
                sx={{
                  color: "text.secondary",
                  fontSize: "0.92rem",
                  lineHeight: 1.8,
                }}
              >
                Reach out for implementation support, API integration, module
                setup, subscription guidance, or custom ERP workflows for your
                business.
              </Typography>

              <Stack spacing={1.25}>
                {[
                  { icon: EmailRounded, title: "Email", value: "info@ligco.tech" },
                  { icon: LocalPhoneRounded, title: "Phone", value: "+254 700 000 000" },
                  { icon: LocationOnRounded, title: "Location", value: "Kenya" },
                  { icon: PublicRounded, title: "Website", value: "ligco.tech" },
                ].map((item) => {
                  const Icon = item.icon;

                  return (
                    <Paper
                      key={item.title}
                      sx={{
                        p: 1.5,
                        borderRadius: 3,
                        bgcolor: surface,
                        border: `1px solid ${border}`,
                        boxShadow: "none",
                      }}
                    >
                      <Stack direction="row" spacing={1.25} alignItems="center">
                        <Avatar
                          variant="rounded"
                          sx={{
                            width: 36,
                            height: 36,
                            borderRadius: 2,
                            bgcolor: alpha(theme.palette.primary.main, 0.1),
                            color: "primary.main",
                          }}
                        >
                          <Icon fontSize="small" />
                        </Avatar>

                        <Box>
                          <Typography sx={{ fontSize: "0.72rem", color: muted }}>
                            {item.title}
                          </Typography>

                          <Typography sx={{ fontWeight: 850, fontSize: "0.84rem" }}>
                            {item.value}
                          </Typography>
                        </Box>
                      </Stack>
                    </Paper>
                  );
                })}
              </Stack>
            </Stack>
          </Grid>

          <Grid item xs={12} md={7}>
            <Paper
              component="form"
              onSubmit={handleContactSubmit}
              sx={{
                height: "100%",
                p: { xs: 2, md: 3 },
                borderRadius: 5,
                bgcolor: surface,
                border: `1px solid ${border}`,
                boxShadow: isDark
                  ? `0 22px 60px ${alpha("#000", 0.24)}`
                  : `0 22px 60px ${alpha("#64748b", 0.12)}`,
              }}
            >
              <Stack spacing={2.2}>
                <Box>
                  <Typography
                    sx={{
                      fontSize: "1.35rem",
                      fontWeight: 950,
                      letterSpacing: "-0.04em",
                    }}
                  >
                    Send an inquiry
                  </Typography>

                  <Typography
                    sx={{ mt: 0.5, fontSize: "0.8rem", color: "text.secondary" }}
                  >
                    This opens your email client with the message prepared.
                  </Typography>
                </Box>

                {contactStatus && (
                  <Alert
                    severity={contactStatus.type}
                    sx={{ borderRadius: 3 }}
                    action={
                      <IconButton size="small" onClick={() => setContactStatus(null)}>
                        <CloseRounded fontSize="small" />
                      </IconButton>
                    }
                  >
                    {contactStatus.message}
                  </Alert>
                )}

                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      required
                      label="Your name"
                      name="name"
                      value={contactForm.name}
                      onChange={handleContactChange}
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      required
                      type="email"
                      label="Email address"
                      name="email"
                      value={contactForm.email}
                      onChange={handleContactChange}
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Phone number"
                      name="phone"
                      value={contactForm.phone}
                      onChange={handleContactChange}
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Company"
                      name="company"
                      value={contactForm.company}
                      onChange={handleContactChange}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      required
                      multiline
                      minRows={5}
                      label="Message"
                      name="message"
                      value={contactForm.message}
                      onChange={handleContactChange}
                      placeholder="Tell us what you want to test, integrate, or customize..."
                    />
                  </Grid>
                </Grid>

                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={1.2}
                  justifyContent="space-between"
                  alignItems={{ xs: "stretch", sm: "center" }}
                >
                  <Typography sx={{ fontSize: "0.74rem", color: muted }}>
                    For backend/API support, include the endpoint or module name.
                  </Typography>

                  <Button
                    type="submit"
                    variant="contained"
                    endIcon={<ArrowForwardRounded />}
                    sx={{
                      borderRadius: 3,
                      textTransform: "none",
                      fontWeight: 900,
                      py: 1.1,
                      px: 2.4,
                      boxShadow: "none",
                    }}
                  >
                    Contact Us
                  </Button>
                </Stack>
              </Stack>
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default ContactSection;