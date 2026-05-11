import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Stack,
  Switch,
  TextField,
  Typography,
  useTheme,
} from "@mui/material";
import { alpha } from "@mui/material/styles";

import ArrowForwardRounded from "@mui/icons-material/ArrowForwardRounded";
import BusinessRounded from "@mui/icons-material/BusinessRounded";
import CloseRounded from "@mui/icons-material/CloseRounded";
import CloudDoneRounded from "@mui/icons-material/CloudDoneRounded";
import FactoryRounded from "@mui/icons-material/FactoryRounded";
import LockRounded from "@mui/icons-material/LockRounded";
import SecurityRounded from "@mui/icons-material/SecurityRounded";
import SupportAgentRounded from "@mui/icons-material/SupportAgentRounded";
import VisibilityRounded from "@mui/icons-material/VisibilityRounded";
import VisibilityOffRounded from "@mui/icons-material/VisibilityOffRounded";

import { companySizes, industries } from "../../utils/landing/landingData";
import {
  formatCurrency,
  getPlanCycle,
  getPlanDescription,
  getPlanName,
  getPlanPrice,
} from "../../utils/landing/planUtils";

const initialForm = {
  company_name: "",
  company_email: "",
  company_phone: "",
  industry: "",
  company_size: "",
  owner_name: "",
  owner_email: "",
  owner_password: "",
  owner_password_confirmation: "",
  plan_id: "",
  trial: true,
};

const RegistrationForm = ({
  plans = [],
  selectedPlanId = "",
  setSelectedPlanId,
  apiAvailable = true,
  publicApi,
  onTrialChange,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const surface = isDark ? "#0f172a" : "#ffffff";
  const border = alpha(theme.palette.divider, isDark ? 0.8 : 1);

  const [form, setForm] = useState({
    ...initialForm,
    plan_id: selectedPlanId || "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  const selectedPlan = useMemo(
    () => plans.find((plan) => String(plan.id) === String(form.plan_id)),
    [plans, form.plan_id]
  );

  useEffect(() => {
    if (!selectedPlanId) return;

    setForm((prev) => {
      if (String(prev.plan_id) === String(selectedPlanId)) {
        return prev;
      }

      return {
        ...prev,
        plan_id: selectedPlanId,
      };
    });
  }, [selectedPlanId]);

  useEffect(() => {
    onTrialChange?.(form.trial);
  }, [form.trial, onTrialChange]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (name === "plan_id") {
      setSelectedPlanId?.(value);
    }

    if (submitStatus) setSubmitStatus(null);
  };

  const validateForm = () => {
    const required = [
      "company_name",
      "company_email",
      "industry",
      "owner_name",
      "owner_email",
      "owner_password",
      "owner_password_confirmation",
      "plan_id",
    ];

    for (const field of required) {
      if (!form[field]) return "Please fill in all required fields.";
    }

    if (form.owner_password.length < 8) {
      return "Password must be at least 8 characters.";
    }

    if (form.owner_password !== form.owner_password_confirmation) {
      return "Password confirmation does not match.";
    }

    return "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!apiAvailable) {
      setSubmitStatus({
        type: "error",
        message:
          "Registration is temporarily disabled because the subscription API is unreachable.",
      });
      return;
    }

    if (!publicApi?.post) {
      setSubmitStatus({
        type: "error",
        message:
          "Registration service is not available. Check the public API client configuration.",
      });
      return;
    }

    const validationError = validateForm();

    if (validationError) {
      setSubmitStatus({ type: "error", message: validationError });
      return;
    }

    try {
      setSubmitting(true);
      setSubmitStatus(null);

      const payload = {
        company: {
          name: form.company_name,
          email: form.company_email,
          phone: form.company_phone,
          industry: form.industry,
          company_size: form.company_size,
        },
        owner: {
          name: form.owner_name,
          email: form.owner_email,
          password: form.owner_password,
          password_confirmation: form.owner_password_confirmation,
        },
        subscription: {
          plan_id: form.plan_id,
          trial: form.trial,
        },

        company_name: form.company_name,
        company_email: form.company_email,
        company_phone: form.company_phone,
        industry: form.industry,
        company_size: form.company_size,
        name: form.owner_name,
        email: form.owner_email,
        password: form.owner_password,
        password_confirmation: form.owner_password_confirmation,
        plan_id: form.plan_id,
        trial: form.trial,
      };

      const response = await publicApi.post("/register-subscribe", payload);

      setSubmitStatus({
        type: "success",
        message:
          response.data?.message ||
          "Company registered successfully. You can now log in and test the ERP.",
      });

      setForm((prev) => ({
        ...initialForm,
        plan_id: prev.plan_id || selectedPlanId,
        trial: true,
      }));
    } catch (error) {
      setSubmitStatus({
        type: "error",
        message:
          error.response?.data?.message ||
          error.response?.data?.error ||
          "Registration failed. Check the details and try again.",
        errors: error.response?.data?.errors,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box
      id="register"
      component="section"
      sx={{
        py: { xs: 5, md: 8 },
        bgcolor: isDark ? "#020617" : "#eef2ff",
        scrollMarginTop: 90,
      }}
    >
      <Box sx={{ maxWidth: "1536px", mx: "auto", px: { xs: 2, sm: 3 } }}>
        <Grid container spacing={{ xs: 3, lg: 5 }} alignItems="flex-start">
          <Grid item xs={12} lg={5}>
            <Stack
              spacing={2.5}
              sx={{ position: { lg: "sticky" }, top: { lg: 96 } }}
            >
              <Chip
                icon={<BusinessRounded />}
                label="Company registration"
                sx={{
                  alignSelf: "flex-start",
                  borderRadius: 999,
                  bgcolor: alpha(theme.palette.primary.main, 0.12),
                  color: "primary.main",
                  fontWeight: 850,
                }}
              />

              <Typography
                component="h2"
                sx={{
                  fontSize: { xs: "1.8rem", md: "2.6rem" },
                  lineHeight: 1.05,
                  fontWeight: 950,
                  letterSpacing: "-0.065em",
                }}
              >
                Create the company workspace and attach a subscription plan.
              </Typography>

              <Typography
                sx={{
                  color: "text.secondary",
                  fontSize: "0.92rem",
                  lineHeight: 1.8,
                }}
              >
                This registration flow creates the company, owner account, and
                selected subscription mode. Use trial mode for demos and testing.
              </Typography>

              <Paper
                sx={{
                  p: 2,
                  borderRadius: 4,
                  bgcolor: surface,
                  border: `1px solid ${border}`,
                  boxShadow: "none",
                }}
              >
                <Stack spacing={1.25}>
                  {[
                    {
                      icon: FactoryRounded,
                      text: "Company profile and industry setup",
                    },
                    {
                      icon: SupportAgentRounded,
                      text: "Owner account creation",
                    },
                    {
                      icon: CloudDoneRounded,
                      text: "Subscription plan assignment",
                    },
                    {
                      icon: LockRounded,
                      text: "Tenant-scoped data access",
                    },
                  ].map((item) => {
                    const Icon = item.icon;

                    return (
                      <Stack
                        direction="row"
                        spacing={1.2}
                        alignItems="center"
                        key={item.text}
                      >
                        <Avatar
                          variant="rounded"
                          sx={{
                            width: 34,
                            height: 34,
                            borderRadius: 2,
                            bgcolor: alpha(theme.palette.primary.main, 0.1),
                            color: "primary.main",
                          }}
                        >
                          <Icon fontSize="small" />
                        </Avatar>

                        <Typography
                          sx={{
                            fontSize: "0.82rem",
                            color: "text.secondary",
                          }}
                        >
                          {item.text}
                        </Typography>
                      </Stack>
                    );
                  })}
                </Stack>
              </Paper>
            </Stack>
          </Grid>

          <Grid item xs={12} lg={7}>
            <Paper
              id="registration-form"
              component="form"
              onSubmit={handleSubmit}
              elevation={0}
              sx={{
                p: { xs: 2, sm: 3, md: 4 },
                borderRadius: 5,
                bgcolor: surface,
                border: `1px solid ${border}`,
                boxShadow: isDark
                  ? `0 26px 70px ${alpha("#000", 0.32)}`
                  : `0 26px 70px ${alpha("#64748b", 0.16)}`,
                scrollMarginTop: 100,
              }}
            >
              <Stack spacing={3}>
                <Box>
                  <Typography
                    sx={{
                      fontSize: "1.4rem",
                      fontWeight: 950,
                      letterSpacing: "-0.04em",
                    }}
                  >
                    Start your ERP workspace
                  </Typography>

                  <Typography
                    sx={{
                      mt: 0.75,
                      color: "text.secondary",
                      fontSize: "0.82rem",
                    }}
                  >
                    Required fields are marked. The owner will become the first
                    company administrator.
                  </Typography>
                </Box>

                {!apiAvailable && (
                  <Alert severity="warning" sx={{ borderRadius: 3 }}>
                    Registration is disabled because the backend plans API is
                    unreachable.
                  </Alert>
                )}

                {submitStatus && (
                  <Alert
                    severity={submitStatus.type}
                    action={
                      <IconButton
                        size="small"
                        onClick={() => setSubmitStatus(null)}
                      >
                        <CloseRounded fontSize="small" />
                      </IconButton>
                    }
                    sx={{ borderRadius: 3 }}
                  >
                    <Typography sx={{ fontSize: "0.82rem", fontWeight: 850 }}>
                      {submitStatus.message}
                    </Typography>

                    {submitStatus.errors && (
                      <Box component="ul" sx={{ mt: 1, mb: 0, pl: 2 }}>
                        {Object.entries(submitStatus.errors).map(
                          ([field, messages]) => (
                            <li key={field}>
                              <Typography sx={{ fontSize: "0.75rem" }}>
                                {Array.isArray(messages)
                                  ? messages.join(", ")
                                  : String(messages)}
                              </Typography>
                            </li>
                          )
                        )}
                      </Box>
                    )}
                  </Alert>
                )}

                <Box>
                  <Typography
                    sx={{
                      mb: 1.5,
                      fontSize: "0.76rem",
                      fontWeight: 850,
                      color: "text.secondary",
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                    }}
                  >
                    Company details
                  </Typography>

                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        required
                        label="Company name"
                        name="company_name"
                        value={form.company_name}
                        onChange={handleChange}
                      />
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        required
                        label="Company email"
                        name="company_email"
                        type="email"
                        value={form.company_email}
                        onChange={handleChange}
                      />
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Company phone"
                        name="company_phone"
                        value={form.company_phone}
                        onChange={handleChange}
                        placeholder="+254..."
                      />
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        required
                        select
                        label="Industry"
                        name="industry"
                        value={form.industry}
                        onChange={handleChange}
                      >
                        {industries.map((industry) => (
                          <MenuItem key={industry} value={industry}>
                            {industry}
                          </MenuItem>
                        ))}
                      </TextField>
                    </Grid>

                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        select
                        label="Company size"
                        name="company_size"
                        value={form.company_size}
                        onChange={handleChange}
                      >
                        {companySizes.map((size) => (
                          <MenuItem key={size} value={size}>
                            {size}
                          </MenuItem>
                        ))}
                      </TextField>
                    </Grid>
                  </Grid>
                </Box>

                <Divider />

                <Box>
                  <Typography
                    sx={{
                      mb: 1.5,
                      fontSize: "0.76rem",
                      fontWeight: 850,
                      color: "text.secondary",
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                    }}
                  >
                    Owner account
                  </Typography>

                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        required
                        label="Owner name"
                        name="owner_name"
                        value={form.owner_name}
                        onChange={handleChange}
                      />
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        required
                        label="Owner email"
                        name="owner_email"
                        type="email"
                        value={form.owner_email}
                        onChange={handleChange}
                      />
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        required
                        label="Password"
                        name="owner_password"
                        type={showPassword ? "text" : "password"}
                        value={form.owner_password}
                        onChange={handleChange}
                        InputProps={{
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton
                                edge="end"
                                onClick={() => setShowPassword((prev) => !prev)}
                              >
                                {showPassword ? (
                                  <VisibilityOffRounded />
                                ) : (
                                  <VisibilityRounded />
                                )}
                              </IconButton>
                            </InputAdornment>
                          ),
                        }}
                      />
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        required
                        label="Confirm password"
                        name="owner_password_confirmation"
                        type={showPassword ? "text" : "password"}
                        value={form.owner_password_confirmation}
                        onChange={handleChange}
                      />
                    </Grid>
                  </Grid>
                </Box>

                <Divider />

                <Box>
                  <Typography
                    sx={{
                      mb: 1.5,
                      fontSize: "0.76rem",
                      fontWeight: 850,
                      color: "text.secondary",
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                    }}
                  >
                    Subscription
                  </Typography>

                  <Grid container spacing={2}>
                    <Grid item xs={12} md={8}>
                      <TextField
                        fullWidth
                        required
                        select
                        label="Selected plan"
                        name="plan_id"
                        value={form.plan_id}
                        onChange={handleChange}
                      >
                        {plans.map((plan) => (
                          <MenuItem key={plan.id} value={plan.id}>
                            {getPlanName(plan)} —{" "}
                            {formatCurrency(getPlanPrice(plan))}
                          </MenuItem>
                        ))}
                      </TextField>
                    </Grid>

                    <Grid item xs={12} md={4}>
                      <Paper
                        sx={{
                          height: "100%",
                          px: 1.5,
                          py: 1.1,
                          borderRadius: 2,
                          border: `1px solid ${border}`,
                          bgcolor: isDark ? alpha("#020617", 0.5) : "#f8fafc",
                          boxShadow: "none",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 1,
                        }}
                      >
                        <Box>
                          <Typography
                            sx={{
                              fontSize: "0.72rem",
                              color: "text.secondary",
                            }}
                          >
                            Mode
                          </Typography>

                          <Typography
                            sx={{ fontSize: "0.82rem", fontWeight: 850 }}
                          >
                            {form.trial ? "Trial / Test" : "Subscribe"}
                          </Typography>
                        </Box>

                        <Switch
                          checked={!form.trial}
                          onChange={(event) =>
                            setForm((prev) => ({
                              ...prev,
                              trial: !event.target.checked,
                            }))
                          }
                        />
                      </Paper>
                    </Grid>
                  </Grid>

                  {selectedPlan && (
                    <Paper
                      sx={{
                        mt: 2,
                        p: 1.5,
                        borderRadius: 3,
                        bgcolor: alpha(theme.palette.primary.main, 0.06),
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
                          <Typography
                            sx={{ fontWeight: 850, fontSize: "0.86rem" }}
                          >
                            {getPlanName(selectedPlan)}
                          </Typography>

                          <Typography
                            sx={{
                              mt: 0.25,
                              color: "text.secondary",
                              fontSize: "0.74rem",
                            }}
                          >
                            {getPlanDescription(selectedPlan)}
                          </Typography>
                        </Box>

                        <Chip
                          label={`${formatCurrency(
                            getPlanPrice(selectedPlan)
                          )} / ${getPlanCycle(selectedPlan)}`}
                          sx={{
                            borderRadius: 999,
                            fontWeight: 850,
                            bgcolor: alpha(theme.palette.primary.main, 0.12),
                            color: "primary.main",
                          }}
                        />
                      </Stack>
                    </Paper>
                  )}
                </Box>

                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={1.25}
                  alignItems={{ xs: "stretch", sm: "center" }}
                  justifyContent="space-between"
                >
                  <Stack direction="row" spacing={1} alignItems="center">
                    <SecurityRounded
                      sx={{ fontSize: 20, color: "success.main" }}
                    />

                    <Typography
                      sx={{ fontSize: "0.74rem", color: "text.secondary" }}
                    >
                      Company data is created under its own tenant scope.
                    </Typography>
                  </Stack>

                  <Button
                    type="submit"
                    variant="contained"
                    disabled={submitting || !apiAvailable}
                    endIcon={
                      submitting ? (
                        <CircularProgress size={16} color="inherit" />
                      ) : (
                        <ArrowForwardRounded />
                      )
                    }
                    sx={{
                      borderRadius: 3,
                      py: 1.15,
                      px: 2.6,
                      textTransform: "none",
                      fontWeight: 900,
                      boxShadow: "none",
                    }}
                  >
                    {submitting ? "Creating..." : "Create Workspace"}
                  </Button>
                </Stack>
              </Stack>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};

export default RegistrationForm;