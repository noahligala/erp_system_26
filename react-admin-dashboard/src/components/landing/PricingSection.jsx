import React, { memo, useMemo } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Divider,
  Grid,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";
import { alpha } from "@mui/material/styles";

import CheckCircleRounded from "@mui/icons-material/CheckCircleRounded";
import WorkspacePremiumRounded from "@mui/icons-material/WorkspacePremiumRounded";
import ArrowForwardRounded from "@mui/icons-material/ArrowForwardRounded";

import {
  formatCurrency,
  getPlanCycle,
  getPlanDescription,
  getPlanFeatures,
  getPlanName,
  getPlanPrice,
} from "../../utils/landing/planUtils";

import { sectionLabelSx } from "../../utils/landing/landingData";

const MAX_VISIBLE_FEATURES = 6;

const PLAN_FEATURES = {
  basic: [
    "Up to 10 employees",
    "Payroll management",
    "Cloud backup",
    "Basic company dashboard",
    "Secure user access",
    "Email support",
  ],
  silver: [
    "Up to 20 employees",
    "Cloud backup",
    "Payroll management",
    "HRM access",
    "POS access",
    "Sales and inventory support",
  ],
  platinum: [
    "Unlimited employees",
    "Full ERP access",
    "Finance and accounting",
    "HRM, payroll and leave",
    "Sales, POS and inventory",
    "24/7 technical support",
  ],
};

const getPlanSlug = (plan, index) => {
  const rawSlug = String(plan?.slug || plan?.code || plan?.name || "")
    .toLowerCase()
    .trim();

  if (rawSlug.includes("platinum")) return "platinum";
  if (rawSlug.includes("silver")) return "silver";
  if (rawSlug.includes("basic")) return "basic";

  if (index === 2) return "platinum";
  if (index === 1) return "silver";

  return "basic";
};

const getDisplayFeatures = (plan, index) => {
  const slug = getPlanSlug(plan, index);
  const backendFeatures = getPlanFeatures(plan);

  const normalizedBackendFeatures = Array.isArray(backendFeatures)
    ? backendFeatures
        .map((feature) => String(feature || "").trim())
        .filter(Boolean)
    : [];

  const genericSignals = [
    "erp dashboard",
    "user management",
    "business modules",
    "secure tenant data",
  ];

  const backendLooksGeneric =
    normalizedBackendFeatures.length > 0 &&
    normalizedBackendFeatures.every((feature) =>
      genericSignals.includes(feature.toLowerCase())
    );

  const sourceFeatures =
    normalizedBackendFeatures.length > 0 && !backendLooksGeneric
      ? normalizedBackendFeatures
      : PLAN_FEATURES[slug];

  return sourceFeatures.slice(0, MAX_VISIBLE_FEATURES);
};

const getPlanTone = (plan, index, theme, isDark) => {
  const slug = getPlanSlug(plan, index);

  if (slug === "platinum") {
    return {
      label: "Enterprise",
      featured: true,
      accent: theme.palette.primary.main,
      bg: alpha(theme.palette.primary.main, isDark ? 0.14 : 0.07),
      border: alpha(theme.palette.primary.main, isDark ? 0.42 : 0.32),
      shadow: alpha(theme.palette.primary.main, isDark ? 0.18 : 0.12),
    };
  }

  if (slug === "silver") {
    return {
      label: "Popular",
      featured: true,
      accent: theme.palette.info.main,
      bg: alpha(theme.palette.info.main, isDark ? 0.13 : 0.065),
      border: alpha(theme.palette.info.main, isDark ? 0.42 : 0.32),
      shadow: alpha(theme.palette.info.main, isDark ? 0.18 : 0.12),
    };
  }

  return {
    label: "Starter",
    featured: false,
    accent: theme.palette.success.main,
    bg: alpha(theme.palette.success.main, isDark ? 0.1 : 0.05),
    border: alpha(theme.palette.success.main, isDark ? 0.24 : 0.18),
    shadow: alpha(theme.palette.success.main, isDark ? 0.1 : 0.06),
  };
};

const PricingCard = memo(({ plan, index, selectedPlanId, onSelectPlan }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const slug = getPlanSlug(plan, index);
  const isCenter = index === 1 || slug === "silver";

  const selected = String(plan.id) === String(selectedPlanId);
  const name = getPlanName(plan);
  const price = getPlanPrice(plan);
  const cycle = getPlanCycle(plan);
  const description = getPlanDescription(plan);
  const features = getDisplayFeatures(plan, index);

  const tone = getPlanTone(plan, index, theme, isDark);

  const surface = isDark ? "#0f172a" : "#ffffff";
  const mutedSurface = isDark ? "#111827" : "#f8fafc";

  const neutralBorder = isDark
    ? alpha("#94a3b8", 0.22)
    : alpha("#64748b", 0.2);

  const cardBorder = selected || tone.featured ? tone.border : neutralBorder;
  const emptySlots = Math.max(MAX_VISIBLE_FEATURES - features.length, 0);

  return (
    <Card
      elevation={0}
      sx={{
        width: "100%",
        maxWidth: {
          xs: 500,
          md: isCenter ? 318 : 292,
          lg: isCenter ? 334 : 304,
        },
        mx: "auto",
        height: "100%",
        minHeight: {
          xs: "auto",
          md: isCenter ? 488 : 456,
        },
        borderRadius: {
          xs: 1.5,
          md: isCenter ? 2 : 1.75,
        },
        bgcolor: surface,
        border: `1px solid ${cardBorder}`,
        boxShadow:
          selected || tone.featured
            ? `0 18px 46px ${tone.shadow}`
            : isDark
            ? `0 10px 26px ${alpha("#000", 0.15)}`
            : `0 10px 26px ${alpha("#64748b", 0.065)}`,
        position: "relative",
        overflow: "hidden",
        display: "flex",
        transform: {
          xs: "none",
          md: isCenter ? "translateY(-12px)" : "translateY(0)",
        },
        transition:
          "transform 160ms ease, border-color 160ms ease, box-shadow 160ms ease",
        "&:hover": {
          transform: {
            xs: "none",
            md: isCenter ? "translateY(-16px)" : "translateY(-4px)",
          },
          borderColor: tone.border,
          boxShadow: `0 20px 52px ${tone.shadow}`,
        },
        "&::before": {
          content: '""',
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background: `linear-gradient(135deg, ${tone.bg}, transparent 44%)`,
          opacity: selected || tone.featured ? 1 : 0.72,
        },
      }}
    >
      <CardContent
        sx={{
          width: "100%",
          p: {
            xs: 1.8,
            sm: 2,
            md: isCenter ? 2.05 : 1.8,
          },
          display: "flex",
          flexDirection: "column",
          position: "relative",
          zIndex: 1,
        }}
      >
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="flex-start"
          spacing={0.85}
          sx={{ minHeight: { xs: "auto", md: 38 } }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography
              component="h3"
              sx={{
                fontSize: {
                  xs: "0.98rem",
                  md: isCenter ? "1.05rem" : "0.96rem",
                },
                fontWeight: 900,
                letterSpacing: "-0.035em",
                lineHeight: 1.1,
                color: "text.primary",
              }}
            >
              {name}
            </Typography>

            <Typography
              sx={{
                mt: 0.35,
                fontSize: isCenter ? "0.69rem" : "0.66rem",
                color: "text.secondary",
                fontWeight: 700,
              }}
            >
              Best for {tone.label.toLowerCase()} operations
            </Typography>
          </Box>

          <Chip
            size="small"
            icon={
              tone.featured ? (
                <WorkspacePremiumRounded
                  sx={{ fontSize: "12px !important" }}
                />
              ) : undefined
            }
            label={selected ? "Selected" : tone.label}
            sx={{
              height: isCenter ? 23 : 21,
              borderRadius: 999,
              flexShrink: 0,
              bgcolor: selected
                ? alpha(theme.palette.primary.main, isDark ? 0.18 : 0.1)
                : tone.bg,
              color: selected ? "primary.main" : tone.accent,
              border: `1px solid ${
                selected ? alpha(theme.palette.primary.main, 0.24) : tone.border
              }`,
              fontSize: isCenter ? "0.63rem" : "0.6rem",
              fontWeight: 850,
              "& .MuiChip-icon": {
                color: "inherit",
                ml: 0.6,
                mr: -0.35,
              },
            }}
          />
        </Stack>

        <Typography
          sx={{
            mt: 1.15,
            minHeight: { xs: "auto", md: isCenter ? 58 : 52 },
            color: "text.secondary",
            fontSize: {
              xs: "0.76rem",
              md: isCenter ? "0.75rem" : "0.72rem",
            },
            lineHeight: 1.5,
          }}
        >
          {description}
        </Typography>

        <Box
          sx={{
            mt: 1.35,
            p: {
              xs: 1.35,
              md: isCenter ? 1.4 : 1.25,
            },
            borderRadius: 1.25,
            bgcolor: mutedSurface,
            border: `1px solid ${
              isDark ? alpha("#94a3b8", 0.16) : alpha("#64748b", 0.16)
            }`,
          }}
        >
          <Stack
            direction="row"
            alignItems="flex-end"
            spacing={0.55}
            sx={{ minHeight: isCenter ? 42 : 38 }}
          >
            <Typography
              sx={{
                fontSize: {
                  xs: "1.5rem",
                  md: isCenter ? "1.65rem" : "1.48rem",
                  lg: isCenter ? "1.72rem" : "1.55rem",
                },
                fontWeight: 950,
                letterSpacing: "-0.06em",
                lineHeight: 1,
                color: "text.primary",
              }}
            >
              {formatCurrency(price)}
            </Typography>

            <Typography
              sx={{
                pb: 0.12,
                color: "text.secondary",
                fontSize: isCenter ? "0.67rem" : "0.64rem",
                fontWeight: 700,
                whiteSpace: "nowrap",
              }}
            >
              / {cycle}
            </Typography>
          </Stack>
        </Box>

        <Divider sx={{ my: isCenter ? 1.6 : 1.45 }} />

        <Stack
          spacing={isCenter ? 0.78 : 0.72}
          sx={{
            flexGrow: 1,
            minHeight: {
              xs: "auto",
              md: isCenter ? 166 : 152,
            },
          }}
        >
          {features.map((feature) => (
            <Stack
              key={feature}
              direction="row"
              spacing={0.75}
              alignItems="flex-start"
              sx={{ minHeight: isCenter ? 21 : 20 }}
            >
              <CheckCircleRounded
                sx={{
                  mt: "2px",
                  fontSize: isCenter ? 16 : 15,
                  color: tone.accent,
                  flexShrink: 0,
                }}
              />

              <Typography
                sx={{
                  color: "text.secondary",
                  fontSize: isCenter ? "0.71rem" : "0.69rem",
                  lineHeight: 1.38,
                  overflowWrap: "anywhere",
                }}
              >
                {feature}
              </Typography>
            </Stack>
          ))}

          {Array.from({ length: emptySlots }).map((_, slotIndex) => (
            <Box
              key={`empty-feature-${slotIndex}`}
              sx={{
                height: isCenter ? 21 : 20,
                display: { xs: "none", md: "block" },
              }}
            />
          ))}
        </Stack>

        <Button
          fullWidth
          variant={selected ? "contained" : "outlined"}
          endIcon={
            !selected ? (
              <ArrowForwardRounded sx={{ fontSize: "16px !important" }} />
            ) : null
          }
          onClick={() => onSelectPlan?.(plan)}
          sx={{
            mt: isCenter ? 2 : 1.8,
            minHeight: isCenter ? 39 : 36,
            borderRadius: 1.35,
            textTransform: "none",
            fontSize: isCenter ? "0.75rem" : "0.72rem",
            fontWeight: 900,
            boxShadow: selected
              ? `0 10px 22px ${alpha(theme.palette.primary.main, 0.16)}`
              : "none",
            "&:hover": {
              boxShadow: "none",
            },
          }}
        >
          {selected ? "Selected Plan" : "Choose Plan"}
        </Button>
      </CardContent>
    </Card>
  );
});

PricingCard.displayName = "PricingCard";

const PricingSection = ({
  plans = [],
  plansLoading = false,
  plansError = "",
  selectedPlanId = "",
  onSelectPlan,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const sortedPlans = useMemo(() => {
    return [...plans].sort((a, b) => {
      const orderA = Number(a.sort_order ?? a.sortOrder ?? 999);
      const orderB = Number(b.sort_order ?? b.sortOrder ?? 999);

      if (orderA !== orderB) return orderA - orderB;

      return Number(getPlanPrice(a)) - Number(getPlanPrice(b));
    });
  }, [plans]);

  const sectionBg = isDark ? "#020617" : "#ffffff";

  return (
    <Box
      id="plans"
      component="section"
      sx={{
        width: "100%",
        py: { xs: 4.5, sm: 5, md: 6.5 },
        bgcolor: sectionBg,
        scrollMarginTop: { xs: 84, sm: 90, md: 98 },
        overflowX: "clip",
      }}
    >
      <Container
        maxWidth={false}
        sx={{
          maxWidth: {
            xs: "100%",
            md: 1000,
            lg: 1060,
            xl: 1100,
          },
          mx: "auto",
          px: {
            xs: 2,
            sm: 2.25,
            md: 2,
          },
        }}
      >
        <Stack
          spacing={1}
          alignItems="center"
          sx={{
            textAlign: "center",
            mb: { xs: 2.75, md: 3 },
            maxWidth: 720,
            mx: "auto",
          }}
        >
          <Typography
            sx={{
              ...sectionLabelSx,
              display: "inline-flex",
              justifyContent: "center",
            }}
          >
            Subscription plans
          </Typography>

          <Typography
            component="h2"
            sx={{
              fontSize: {
                xs: "1.45rem",
                sm: "1.75rem",
                md: "2rem",
                lg: "2.18rem",
              },
              fontWeight: 950,
              letterSpacing: "-0.055em",
              lineHeight: 1.05,
              color: "text.primary",
              maxWidth: 700,
            }}
          >
            Choose the plan that fits your company’s growth.
          </Typography>

          <Typography
            sx={{
              maxWidth: 600,
              color: "text.secondary",
              fontSize: { xs: "0.78rem", sm: "0.82rem", md: "0.84rem" },
              lineHeight: 1.65,
            }}
          >
            Start small, scale smoothly, and unlock more operational control as
            your team grows.
          </Typography>

          {plansError && (
            <Alert
              severity="warning"
              sx={{
                mt: 1,
                width: "100%",
                maxWidth: 600,
                borderRadius: 1.5,
                textAlign: "left",
                fontSize: "0.78rem",
              }}
            >
              {plansError}
            </Alert>
          )}
        </Stack>

        {plansLoading ? (
          <Stack
            alignItems="center"
            justifyContent="center"
            sx={{
              py: { xs: 5, md: 6 },
              minHeight: 240,
            }}
          >
            <CircularProgress size={28} thickness={4} />

            <Typography
              sx={{
                mt: 2,
                color: "text.secondary",
                fontSize: "0.8rem",
              }}
            >
              Loading subscription plans...
            </Typography>
          </Stack>
        ) : (
          <Box
            sx={{
              mt: { xs: 2.5, md: 4 },
              mb: { xs: 2.5, md: 4 },
            }}
          >
            <Grid
              container
              columnSpacing={{ xs: 0, md: 1.25, lg: 1.5 }}
              rowSpacing={{ xs: 2, md: 0 }}
              alignItems="center"
              justifyContent="center"
              sx={{
                width: "100%",
                m: "0 !important",
                flexWrap: {
                  xs: "wrap",
                  md: "nowrap",
                },
              }}
            >
              {sortedPlans.map((plan, index) => {
                const isCenter = index === 1;

                return (
                  <Grid
                    item
                    xs={12}
                    sm={10}
                    md="auto"
                    key={plan.id || plan.slug || index}
                    sx={{
                      display: "flex",
                      justifyContent: "center",
                      flex: {
                        xs: "0 0 100%",
                        sm: "0 0 500px",
                        md: isCenter ? "0 0 318px" : "0 0 292px",
                        lg: isCenter ? "0 0 334px" : "0 0 304px",
                      },
                      maxWidth: {
                        xs: "100%",
                        sm: 500,
                        md: isCenter ? 318 : 292,
                        lg: isCenter ? 334 : 304,
                      },
                      px: {
                        xs: "0 !important",
                      },
                    }}
                  >
                    <PricingCard
                      plan={plan}
                      index={index}
                      selectedPlanId={selectedPlanId}
                      onSelectPlan={onSelectPlan}
                    />
                  </Grid>
                );
              })}
            </Grid>
          </Box>
        )}
      </Container>
    </Box>
  );
};

export default PricingSection;