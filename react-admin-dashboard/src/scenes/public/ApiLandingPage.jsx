// src/scenes/public/ApiLandingPage.jsx

import React, {
  Suspense,
  lazy,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  LinearProgress,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { Helmet } from "react-helmet-async";

import LandingHeader from "../../components/landing/LandingHeader";
import HeroSection from "../../components/landing/HeroSection";
import BenefitsSection from "../../components/landing/BenefitsSection";
import ModulesSection from "../../components/landing/ModulesSection";
import WorkflowSection from "../../components/landing/WorkflowSection";
import CurrentUsersCarousel from "../../components/landing/CurrentUsersCarousel";
import PricingSection from "../../components/landing/PricingSection";
import ScrollToTopButton from "../../components/landing/ScrollToTopButton";

import { usePlans } from "../../hooks/landing/usePlans";
import { useScrollState } from "../../hooks/landing/useScrollState";

import {
  benefits,
  currentUsers,
  faqItems,
  modules,
  navItems,
  stats,
  workflow,
} from "../../utils/landing/landingData";

import {
  getPlanCycle,
  getPlanDescription,
  getPlanName,
  getPlanPrice,
} from "../../utils/landing/planUtils";

const RegistrationForm = lazy(() =>
  import(
    /* webpackChunkName: "landing-registration-form" */ "../../components/landing/RegistrationForm"
  )
);

const ContactSection = lazy(() =>
  import(
    /* webpackChunkName: "landing-contact-section" */ "../../components/landing/ContactSection"
  )
);

const FaqSection = lazy(() =>
  import(
    /* webpackChunkName: "landing-faq-section" */ "../../components/landing/FaqSection"
  )
);

const LandingFooter = lazy(() =>
  import(
    /* webpackChunkName: "landing-footer" */ "../../components/landing/LandingFooter"
  )
);

class LandingSectionErrorBoundary extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      hasError: false,
    };
  }

  static getDerivedStateFromError() {
    return {
      hasError: true,
    };
  }

  componentDidCatch(error, info) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Landing section failed to render:", error, info);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box
          component="section"
          sx={{
            width: "100%",
            maxWidth: 960,
            mx: "auto",
            px: { xs: 2, sm: 3 },
            py: { xs: 4, md: 5 },
            boxSizing: "border-box",
          }}
        >
          <Alert
            severity="warning"
            sx={{
              borderRadius: 1.5,
              alignItems: "center",
              fontSize: "0.82rem",
            }}
            action={
              <Button
                color="inherit"
                size="small"
                onClick={() => window.location.reload()}
                sx={{
                  textTransform: "none",
                  fontWeight: 800,
                  borderRadius: 1.25,
                }}
              >
                Reload
              </Button>
            }
          >
            This section failed to load. Refresh the page and try again.
          </Alert>
        </Box>
      );
    }

    return this.props.children;
  }
}

const LazyFallback = memo(({ label = "Loading section..." }) => (
  <Stack
    alignItems="center"
    justifyContent="center"
    sx={{
      width: "100%",
      py: { xs: 4, md: 6 },
      minHeight: { xs: 150, md: 210 },
      boxSizing: "border-box",
    }}
  >
    <CircularProgress size={26} thickness={4} />

    <Typography
      sx={{
        mt: 1.5,
        color: "text.secondary",
        fontSize: "0.8rem",
      }}
    >
      {label}
    </Typography>
  </Stack>
));

LazyFallback.displayName = "LazyFallback";

const ApiLandingPage = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isTablet = useMediaQuery(theme.breakpoints.between("sm", "md"));

  const { scrolled, direction, progress } = useScrollState(18, {
    hysteresis: 10,
    trackDirection: true,
    trackProgress: true,
  });

  const { plans, plansLoading, plansError, apiAvailable, publicApi } =
    usePlans();

  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [trial, setTrial] = useState(true);

  useEffect(() => {
    if (!selectedPlanId && plans.length > 0) {
      setSelectedPlanId(plans[1]?.id || plans[0]?.id || "");
    }
  }, [plans, selectedPlanId]);

  const selectedPlan = useMemo(() => {
    if (!plans.length || !selectedPlanId) return null;

    return plans.find((plan) => String(plan.id) === String(selectedPlanId));
  }, [plans, selectedPlanId]);

  const selectedPlanName = useMemo(() => {
    return selectedPlan ? getPlanName(selectedPlan) : "No plan";
  }, [selectedPlan]);

  const selectedPlanPrice = useMemo(() => {
    return selectedPlan ? getPlanPrice(selectedPlan) : 3500;
  }, [selectedPlan]);

  const selectedPlanCycle = useMemo(() => {
    return selectedPlan ? getPlanCycle(selectedPlan) : "monthly";
  }, [selectedPlan]);

  const selectedPlanDescription = useMemo(() => {
    return selectedPlan
      ? getPlanDescription(selectedPlan)
      : "Modern SaaS ERP for finance, HRM, payroll, inventory, sales, purchasing, recruitment and analytics.";
  }, [selectedPlan]);

  /*
   * Updated for the floating sticky header.
   * Header now sits lower from the top, so section scroll needs a larger offset.
   */
  const getHeaderOffset = useCallback(() => {
    if (isMobile) return 84;
    if (isTablet) return 90;
    return 98;
  }, [isMobile, isTablet]);

  const scrollToSection = useCallback(
    (id) => {
      if (!id || typeof window === "undefined") return;

      const element = document.getElementById(id);
      if (!element) return;

      const headerOffset = getHeaderOffset();
      const elementTop = element.getBoundingClientRect().top + window.scrollY;
      const targetPosition = Math.max(elementTop - headerOffset, 0);

      window.scrollTo({
        top: targetPosition,
        behavior: "smooth",
      });
    },
    [getHeaderOffset]
  );

  const scrollToRegistration = useCallback(() => {
    scrollToSection("registration-form");
  }, [scrollToSection]);

  const scrollToPlans = useCallback(() => {
    scrollToSection("plans");
  }, [scrollToSection]);

  const scrollToTop = useCallback(() => {
    scrollToSection("top");
  }, [scrollToSection]);

  const handleSelectPlan = useCallback(
    (plan) => {
      if (!plan?.id) return;

      setSelectedPlanId(plan.id);

      window.requestAnimationFrame(() => {
        window.setTimeout(scrollToRegistration, 80);
      });
    },
    [scrollToRegistration]
  );

  const handleTrialChange = useCallback((value) => {
    setTrial(Boolean(value));
  }, []);

  const apiOrigin = useMemo(() => {
    const rawBaseUrl =
      process.env.REACT_APP_API_BASE_URL || "http://localhost:8000/api";

    try {
      return new URL(rawBaseUrl).origin;
    } catch {
      return "http://localhost:8000";
    }
  }, []);

  const siteUrl = useMemo(() => {
    return (
      process.env.REACT_APP_SITE_URL ||
      process.env.REACT_APP_PUBLIC_URL ||
      "http://localhost:5000"
    ).replace(/\/$/, "");
  }, []);

  const canonicalUrl = `${siteUrl}/`;
  const ogImageUrl =
    process.env.REACT_APP_OG_IMAGE_URL ||
    `${siteUrl}/assets/ligcosync-og-image.png`;

  const appBackground = isDark ? "#020617" : "#f7f9fc";

  const neutralBorder = isDark
    ? alpha("#94a3b8", 0.22)
    : alpha("#64748b", 0.22);

  const neutralBorderStrong = isDark
    ? alpha("#94a3b8", 0.34)
    : alpha("#64748b", 0.34);

  const jsonLd = useMemo(
    () => ({
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "LigcoSync ERP",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      description:
        "Modern SaaS ERP for finance, HRM, payroll, inventory, sales, purchasing, recruitment, leave management and analytics.",
      url: canonicalUrl,
      image: ogImageUrl,
      brand: {
        "@type": "Brand",
        name: "LigcoSync",
      },
      creator: {
        "@type": "Organization",
        name: "Ligco Technologies",
      },
      offers: {
        "@type": "Offer",
        name: selectedPlanName,
        description: selectedPlanDescription,
        priceCurrency: "KES",
        price: String(Number(selectedPlanPrice || 0)),
        availability: "https://schema.org/InStock",
        url: canonicalUrl,
        priceSpecification: {
          "@type": "UnitPriceSpecification",
          priceCurrency: "KES",
          price: String(Number(selectedPlanPrice || 0)),
          billingDuration: selectedPlanCycle,
        },
      },
      featureList: [
        "Finance",
        "HRM",
        "Payroll",
        "Inventory",
        "Sales",
        "Purchasing",
        "Recruitment",
        "Leave Management",
        "Analytics",
      ],
    }),
    [
      canonicalUrl,
      ogImageUrl,
      selectedPlanName,
      selectedPlanDescription,
      selectedPlanPrice,
      selectedPlanCycle,
    ]
  );

  return (
    <Box
      sx={{
        width: "100%",
        minWidth: 0,
        minHeight: "100vh",
        bgcolor: appBackground,
        color: "text.primary",
        overflowX: "clip",
        scrollBehavior: "smooth",
        boxSizing: "border-box",
        backgroundAttachment: "fixed",
        backgroundImage: isDark
          ? `
            radial-gradient(circle at 12% 8%, ${alpha(
              theme.palette.primary.main,
              0.13
            )}, transparent 30%),
            radial-gradient(circle at 88% 12%, ${alpha(
              theme.palette.info.main,
              0.09
            )}, transparent 26%),
            linear-gradient(180deg, #020617 0%, #07111f 42%, #020617 100%)
          `
          : `
            radial-gradient(circle at 12% 8%, ${alpha(
              theme.palette.primary.main,
              0.08
            )}, transparent 30%),
            radial-gradient(circle at 88% 12%, ${alpha(
              theme.palette.info.main,
              0.05
            )}, transparent 26%),
            linear-gradient(180deg, #ffffff 0%, #f7f9fc 42%, #eef2ff 100%)
          `,

        "&, & *": {
          boxSizing: "border-box",
        },

        "& main": {
          width: "100%",
          minWidth: 0,
          overflowX: "clip",
        },

        "& section": {
          width: "100%",
          minWidth: 0,
          scrollMarginTop: {
            xs: "84px",
            sm: "90px",
            md: "98px",
          },
        },

        "& main > section > .MuiContainer-root, & main > .MuiContainer-root": {
          mx: "auto",
          maxWidth: {
            xs: "100%",
            sm: "100%",
            md: "1180px",
            lg: "1240px",
            xl: "1320px",
          },
        },

        "& .MuiContainer-root": {
          width: "100%",
          minWidth: 0,
          px: {
            xs: "16px",
            sm: "22px",
            md: "28px",
            lg: "32px",
          },
        },

        "& .MuiGrid-container": {
          width: "100%",
          marginLeft: "0 !important",
          marginRight: "0 !important",
        },

        "& .MuiGrid-item": {
          minWidth: 0,
        },

        "& .MuiPaper-root, & .MuiCard-root": {
          borderColor: `${neutralBorder} !important`,
          borderRadius: {
            xs: "10px",
            sm: "12px",
            md: "14px",
          },
          backgroundImage: "none",
        },

        "& .MuiPaper-root:hover, & .MuiCard-root:hover": {
          borderColor: `${neutralBorderStrong} !important`,
        },

        "& .MuiDivider-root": {
          borderColor: neutralBorder,
        },

        "& .MuiButton-root": {
          borderRadius: "8px",
          textTransform: "none",
          fontWeight: 800,
          minHeight: 36,
        },

        "& .MuiButton-outlined": {
          borderColor: neutralBorder,
          color: "text.primary",

          "&:hover": {
            borderColor: neutralBorderStrong,
            bgcolor: isDark ? alpha("#ffffff", 0.04) : alpha("#64748b", 0.06),
          },
        },

        "& .MuiChip-root": {
          borderRadius: "999px",
          fontWeight: 800,
        },

        "& .MuiAvatar-rounded": {
          borderRadius: "8px",
        },

        "& .MuiAccordion-root": {
          borderRadius: "10px !important",
          borderColor: `${neutralBorder} !important`,
        },

        "& .MuiFormControl-root": {
          minWidth: 0,
        },

        "& .MuiInputBase-root": {
          minHeight: 40,
          fontSize: "0.8rem",
          borderRadius: "8px",
          backgroundColor: isDark ? alpha("#020617", 0.62) : "#ffffff",
        },

        "& .MuiOutlinedInput-root": {
          borderRadius: "8px",
          transition:
            "border-color 150ms ease, background-color 150ms ease, box-shadow 150ms ease",

          "& .MuiOutlinedInput-notchedOutline": {
            borderColor: neutralBorder,
          },

          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: neutralBorderStrong,
          },

          "&.Mui-focused": {
            backgroundColor: isDark ? alpha("#020617", 0.8) : "#ffffff",
            boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.1)}`,
          },

          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderWidth: "1px",
            borderColor: theme.palette.primary.main,
          },
        },

        "& .MuiOutlinedInput-input": {
          minHeight: "unset",
          padding: "10px 12px",
          fontSize: "0.8rem",
          fontWeight: 450,
          color: "text.primary",

          "&::placeholder": {
            color: alpha(theme.palette.text.secondary, 0.85),
            opacity: 1,
            fontSize: "0.78rem",
          },
        },

        "& textarea.MuiOutlinedInput-input": {
          lineHeight: 1.6,
          paddingTop: "10px",
          paddingBottom: "10px",
        },

        "& .MuiInputLabel-root": {
          fontSize: "0.78rem",
          fontWeight: 650,
          color: "text.secondary",
          transform: "translate(12px, 10px) scale(1)",

          "&.Mui-focused": {
            color: "primary.main",
          },

          "&.MuiInputLabel-shrink": {
            transform: "translate(12px, -8px) scale(0.82)",
            fontWeight: 750,
            backgroundColor: isDark ? "#0f172a" : "#ffffff",
            px: 0.45,
            borderRadius: "4px",
          },
        },

        "& .MuiSelect-select": {
          minHeight: "unset !important",
          padding: "10px 12px !important",
          fontSize: "0.8rem",
          display: "flex",
          alignItems: "center",
        },

        "& .MuiFormHelperText-root": {
          mx: 0.25,
          mt: 0.5,
          fontSize: "0.68rem",
          lineHeight: 1.4,
        },

        "& .MuiInputAdornment-root .MuiSvgIcon-root": {
          fontSize: "1.05rem",
          color: "text.secondary",
        },

        "& h1, & .MuiTypography-h1": {
          fontSize: {
            xs: "2.05rem",
            sm: "2.7rem",
            md: "3.55rem",
            lg: "4.25rem",
          },
          lineHeight: {
            xs: 1.05,
            md: 0.98,
          },
          letterSpacing: "-0.065em",
        },

        "& h2, & .MuiTypography-h2": {
          fontSize: {
            xs: "1.55rem",
            sm: "1.9rem",
            md: "2.25rem",
            lg: "2.55rem",
          },
          lineHeight: 1.08,
          letterSpacing: "-0.05em",
        },

        "& h3, & .MuiTypography-h3": {
          fontSize: {
            xs: "1rem",
            md: "1.1rem",
          },
          lineHeight: 1.25,
        },

        "& p, & .MuiTypography-body1, & .MuiTypography-body2": {
          textWrap: "pretty",
        },

        "& main > section": {
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          px: 0,
        },

        "& main > section:not(#top)": {
          py: {
            xs: 5,
            sm: 6,
            md: 8,
          },
        },

        "& #top": {
          minHeight: {
            xs: "auto",
            md: "calc(100vh - 76px)",
          },
          display: "flex",
          alignItems: "center",
        },

        "& img, & video, & canvas, & svg": {
          maxWidth: "100%",
        },

        "@media (max-width: 900px)": {
          "& main > section": {
            alignItems: "flex-start",
          },

          "& main > section:not(#top)": {
            py: {
              xs: 4.5,
              sm: 5,
            },
          },
        },

        "@media (max-width: 600px)": {
          "& .MuiContainer-root": {
            px: "16px",
          },

          "& #top": {
            pt: 4,
            pb: 4,
          },

          "& .MuiButton-root": {
            fontSize: "0.74rem",
            minHeight: 34,
          },

          "& .MuiChip-root": {
            height: 24,
            fontSize: "0.66rem",
          },

          "& .MuiInputBase-root": {
            minHeight: 38,
            fontSize: "0.76rem",
          },

          "& .MuiOutlinedInput-input": {
            padding: "9px 11px",
            fontSize: "0.76rem",
          },

          "& .MuiInputLabel-root": {
            fontSize: "0.74rem",
            transform: "translate(12px, 9px) scale(1)",

            "&.MuiInputLabel-shrink": {
              transform: "translate(12px, -8px) scale(0.8)",
            },
          },

          "& .MuiSelect-select": {
            padding: "9px 11px !important",
            fontSize: "0.76rem",
          },
        },

        "@media (max-width: 380px)": {
          "& .MuiContainer-root": {
            px: "12px",
          },

          "& h1, & .MuiTypography-h1": {
            fontSize: "1.85rem",
          },

          "& h2, & .MuiTypography-h2": {
            fontSize: "1.38rem",
          },

          "& .MuiButton-root": {
            fontSize: "0.7rem",
          },
        },
      }}
    >
      <Helmet>
        <html lang="en" />

        <title>
          LigcoSync ERP | SaaS ERP for Finance, HRM, Payroll, Inventory and
          Sales
        </title>

        <meta
          name="description"
          content="LigcoSync ERP is a modern SaaS business platform for finance, HRM, payroll, inventory, sales, purchasing, recruitment, leave management and analytics."
        />

        <meta
          name="keywords"
          content="ERP Kenya, SaaS ERP, payroll system Kenya, HRM system, accounting software, inventory management, LigcoSync"
        />

        <meta name="robots" content="index, follow" />

        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />

        <meta name="theme-color" content={isDark ? "#020617" : "#f7f9fc"} />

        <link rel="canonical" href={canonicalUrl} />

        <meta property="og:title" content="LigcoSync ERP" />

        <meta
          property="og:description"
          content="Register, test and subscribe to a modern ERP platform for growing companies."
        />

        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="LigcoSync ERP" />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:image" content={ogImageUrl} />
        <meta property="og:image:alt" content="LigcoSync ERP platform preview" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="LigcoSync ERP" />

        <meta
          name="twitter:description"
          content="Modern SaaS ERP for finance, HRM, payroll, inventory, sales, purchasing, recruitment and analytics."
        />

        <meta name="twitter:image" content={ogImageUrl} />

        <link rel="preconnect" href={apiOrigin} />
        <link rel="dns-prefetch" href={apiOrigin} />

        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      <LinearProgress
        variant="determinate"
        value={Math.round(progress * 100)}
        sx={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          zIndex: 1600,
          bgcolor: "transparent",
          opacity: scrolled ? 1 : 0,
          transition: "opacity 180ms ease",
          "& .MuiLinearProgress-bar": {
            bgcolor: "primary.main",
          },
        }}
      />

      <LandingHeader
        scrolled={scrolled}
        navItems={navItems}
        scrollDirection={direction}
        scrollProgress={progress}
        scrollToSection={scrollToSection}
        scrollToRegistration={scrollToRegistration}
      />

      <Box
        component="main"
        sx={{
          width: "100%",
          minWidth: 0,
          overflowX: "clip",
        }}
      >
        <HeroSection
          stats={stats}
          selectedPlanName={selectedPlanName}
          trial={trial}
          scrollToRegistration={scrollToRegistration}
          scrollToPlans={scrollToPlans}
        />

        <BenefitsSection benefits={benefits} />

        <ModulesSection modules={modules} />

        <WorkflowSection workflow={workflow} />

        <CurrentUsersCarousel
          users={currentUsers}
          scrollToRegistration={scrollToRegistration}
        />

        <PricingSection
          plans={plans}
          plansLoading={plansLoading}
          plansError={plansError}
          selectedPlanId={selectedPlanId}
          onSelectPlan={handleSelectPlan}
        />

        <LandingSectionErrorBoundary>
          <Suspense
            fallback={<LazyFallback label="Loading registration form..." />}
          >
            <RegistrationForm
              plans={plans}
              selectedPlanId={selectedPlanId}
              setSelectedPlanId={setSelectedPlanId}
              apiAvailable={apiAvailable}
              publicApi={publicApi}
              onTrialChange={handleTrialChange}
            />
          </Suspense>
        </LandingSectionErrorBoundary>

        <LandingSectionErrorBoundary>
          <Suspense fallback={<LazyFallback label="Loading contact section..." />}>
            <ContactSection />
          </Suspense>
        </LandingSectionErrorBoundary>

        <LandingSectionErrorBoundary>
          <Suspense fallback={<LazyFallback label="Loading FAQ section..." />}>
            <FaqSection faqItems={faqItems} />
          </Suspense>
        </LandingSectionErrorBoundary>

        <LandingSectionErrorBoundary>
          <Suspense fallback={<LazyFallback label="Loading footer..." />}>
            <LandingFooter
              navItems={navItems}
              scrollToSection={scrollToSection}
              scrollToRegistration={scrollToRegistration}
            />
          </Suspense>
        </LandingSectionErrorBoundary>
      </Box>

      <ScrollToTopButton visible={scrolled} scrollToTop={scrollToTop} />
    </Box>
  );
};

export default ApiLandingPage;