import React, { useEffect, useMemo, useState } from "react";
import {
  Avatar,
  Box,
  Button,
  Chip,
  Container,
  IconButton,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { alpha } from "@mui/material/styles";

import ArrowForwardRounded from "@mui/icons-material/ArrowForwardRounded";
import CloseRounded from "@mui/icons-material/CloseRounded";
import DataObjectRounded from "@mui/icons-material/DataObjectRounded";
import KeyboardArrowDownRounded from "@mui/icons-material/KeyboardArrowDownRounded";
import MenuRounded from "@mui/icons-material/MenuRounded";
import ShieldRounded from "@mui/icons-material/ShieldRounded";

import MobileLandingDrawer from "../../components/landing/MobileLandingDrawer";

const defaultNavItems = [
  ["Modules", "modules"],
  ["Workflow", "workflow"],
  ["Users", "users"],
  ["Plans", "plans"],
  ["Contact", "contact"],
];

const LandingHeader = ({
  scrolled = false,
  navItems = defaultNavItems,
  scrollToSection,
  scrollToRegistration,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("top");

  const safeNavItems = useMemo(() => {
    if (!Array.isArray(navItems) || navItems.length === 0) {
      return defaultNavItems;
    }

    const validItems = navItems.filter(
      (item) =>
        Array.isArray(item) &&
        item.length >= 2 &&
        typeof item[0] === "string" &&
        typeof item[1] === "string"
    );

    return validItems.length ? validItems : defaultNavItems;
  }, [navItems]);

  const appBg = isDark ? "#020617" : "#f8fafc";
  const surface = isDark ? "#0f172a" : "#ffffff";
  const softSurface = isDark ? "#111827" : "#ffffff";

  const neutralBorder = isDark
    ? alpha("#94a3b8", 0.2)
    : alpha("#64748b", 0.2);

  const neutralBorderStrong = isDark
    ? alpha("#94a3b8", 0.34)
    : alpha("#64748b", 0.32);

  const headerZIndex = 1300;
  const menuButtonZIndex = 2101;

  const stickyTop = isMobile ? 8 : 12;
  const headerHeight = scrolled ? 62 : 70;

  const handleScrollToSection = (id) => {
    if (!id) return;

    setActiveSection(id);

    if (typeof scrollToSection === "function") {
      scrollToSection(id);
      return;
    }

    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleRegisterClick = () => {
    if (typeof scrollToRegistration === "function") {
      scrollToRegistration();
      return;
    }

    document
      .getElementById("registration-form")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleMobileMenuToggle = () => {
    setMobileOpen((prev) => !prev);
  };

  const handleMobileMenuClose = () => {
    setMobileOpen(false);
  };

  useEffect(() => {
    const sectionIds = ["top", ...safeNavItems.map(([, id]) => id)];

    const updateActiveSection = () => {
      const scrollPosition = window.scrollY + 150;
      let currentSection = "top";

      sectionIds.forEach((id) => {
        const element = document.getElementById(id);

        if (element && element.offsetTop <= scrollPosition) {
          currentSection = id;
        }
      });

      setActiveSection(currentSection);
    };

    updateActiveSection();

    window.addEventListener("scroll", updateActiveSection, { passive: true });

    return () => {
      window.removeEventListener("scroll", updateActiveSection);
    };
  }, [safeNavItems]);

  useEffect(() => {
    if (!isMobile && mobileOpen) {
      setMobileOpen(false);
    }
  }, [isMobile, mobileOpen]);

  return (
    <>
      <Box
        component="header"
        sx={{
          position: "sticky",
          top: stickyTop,
          left: 0,
          right: 0,
          zIndex: headerZIndex,
          width: "100%",
          bgcolor: "transparent",
          borderBottom: "none",
          pointerEvents: "none",
          transition: "top 180ms ease",
        }}
      >
        <Container
          maxWidth="xl"
          sx={{
            px: {
              xs: 1.25,
              sm: 2,
              md: 3,
              lg: 4,
            },
          }}
        >
          <Box
            sx={{
              height: headerHeight,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: { xs: 1, md: 2 },

              // ✅ Padding now exists even before sticky/glass state.
              px: {
                xs: scrolled ? 1 : 1,
                sm: scrolled ? 1.25 : 1.25,
                md: scrolled ? 1.5 : 2,
                lg: scrolled ? 1.5 : 2.25,
              },

              pointerEvents: "auto",

              // Default header remains flat. Rounded only after scroll.
              borderRadius: scrolled
                ? {
                    xs: 2.25,
                    sm: 2.75,
                    md: 3,
                  }
                : 0,

              bgcolor: scrolled
                ? alpha(appBg, isDark ? 0.84 : 0.88)
                : "transparent",

              backdropFilter: scrolled ? "blur(22px) saturate(170%)" : "none",
              WebkitBackdropFilter: scrolled
                ? "blur(22px) saturate(170%)"
                : "none",

              border: scrolled
                ? `1px solid ${neutralBorder}`
                : "1px solid transparent",

              boxShadow: scrolled
                ? isDark
                  ? `0 22px 65px ${alpha("#000000", 0.36)}`
                  : `0 20px 55px ${alpha("#64748b", 0.16)}`
                : "none",

              overflow: "hidden",

              transition:
                "height 180ms ease, padding 180ms ease, border-radius 180ms ease, background-color 180ms ease, border-color 180ms ease, box-shadow 180ms ease, backdrop-filter 180ms ease",

              "&::before": {
                content: '""',
                position: "absolute",
                inset: 0,
                pointerEvents: "none",
                background: scrolled
                  ? isDark
                    ? `linear-gradient(135deg, ${alpha(
                        "#ffffff",
                        0.07
                      )}, transparent 38%)`
                    : `linear-gradient(135deg, ${alpha(
                        "#ffffff",
                        0.72
                      )}, transparent 42%)`
                  : "none",
                opacity: scrolled ? 0.8 : 0,
              },
            }}
          >
            <Stack
              direction="row"
              alignItems="center"
              spacing={{ xs: 1, sm: 1.15 }}
              role="button"
              tabIndex={0}
              onClick={() => handleScrollToSection("top")}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  handleScrollToSection("top");
                }
              }}
              sx={{
                cursor: "pointer",
                minWidth: 0,
                flexShrink: 0,
                outline: "none",
                position: "relative",
                zIndex: 1,
              }}
            >
              <Avatar
                variant="rounded"
                sx={{
                  width: scrolled ? 36 : 42,
                  height: scrolled ? 36 : 42,
                  borderRadius: 2,
                  bgcolor: alpha(
                    theme.palette.primary.main,
                    isDark ? 0.18 : 0.1
                  ),
                  color: "primary.main",
                  border: `1px solid ${alpha(
                    theme.palette.primary.main,
                    0.2
                  )}`,
                  boxShadow: scrolled
                    ? "none"
                    : `0 12px 28px ${alpha(
                        theme.palette.primary.main,
                        0.16
                      )}`,
                  transition:
                    "width 180ms ease, height 180ms ease, box-shadow 180ms ease",
                }}
              >
                <DataObjectRounded
                  sx={{
                    fontSize: scrolled ? 20 : 23,
                    display: "block",
                  }}
                />
              </Avatar>

              <Box sx={{ minWidth: 0 }}>
                <Stack
                  direction="row"
                  spacing={0.75}
                  alignItems="center"
                  sx={{ minWidth: 0 }}
                >
                  <Typography
                    sx={{
                      fontSize: {
                        xs: scrolled ? "0.84rem" : "0.9rem",
                        sm: scrolled ? "0.92rem" : "1rem",
                      },
                      fontWeight: 900,
                      letterSpacing: "-0.04em",
                      lineHeight: 1.05,
                      color: "text.primary",
                      whiteSpace: "nowrap",
                      transition: "font-size 180ms ease",
                    }}
                  >
                    LigcoSync ERP
                  </Typography>

                  {!isMobile && (
                    <Chip
                      size="small"
                      icon={
                        <ShieldRounded
                          sx={{
                            fontSize: "14px !important",
                            display: "block",
                          }}
                        />
                      }
                      label="SaaS"
                      sx={{
                        height: 22,
                        borderRadius: 999,
                        fontSize: "0.64rem",
                        fontWeight: 800,
                        color: "primary.main",
                        bgcolor: alpha(theme.palette.primary.main, 0.09),
                        border: `1px solid ${alpha(
                          theme.palette.primary.main,
                          0.14
                        )}`,
                        "& .MuiChip-icon": {
                          color: "primary.main",
                          ml: 0.75,
                          mr: -0.25,
                        },
                      }}
                    />
                  )}
                </Stack>

                <Typography
                  sx={{
                    mt: 0.25,
                    fontSize: "0.67rem",
                    color: "text.secondary",
                    lineHeight: 1.2,
                    display: { xs: "none", sm: scrolled ? "none" : "block" },
                    whiteSpace: "nowrap",
                  }}
                >
                  Enterprise Business Platform
                </Typography>
              </Box>
            </Stack>

            {!isMobile && (
              <Stack
                component="nav"
                direction="row"
                spacing={0.35}
                alignItems="center"
                aria-label="Landing page navigation"
                sx={{
                  p: 0.4,
                  borderRadius: 999,
                  bgcolor: alpha(surface, isDark ? 0.5 : 0.74),
                  border: `1px solid ${neutralBorder}`,
                  boxShadow: isDark
                    ? `inset 0 1px 0 ${alpha("#ffffff", 0.04)}`
                    : `inset 0 1px 0 ${alpha("#ffffff", 0.85)}`,
                  maxWidth: "100%",
                  overflow: "hidden",
                  position: "relative",
                  zIndex: 1,
                }}
              >
                {safeNavItems.map(([label, id]) => {
                  const active = activeSection === id;

                  return (
                    <Button
                      key={id}
                      size="small"
                      onClick={() => handleScrollToSection(id)}
                      sx={{
                        px: 1.5,
                        minWidth: "auto",
                        height: 33,
                        borderRadius: 999,
                        textTransform: "none",
                        fontSize: "0.74rem",
                        fontWeight: active ? 850 : 700,
                        color: active ? "primary.main" : "text.secondary",
                        bgcolor: active
                          ? alpha(
                              theme.palette.primary.main,
                              isDark ? 0.16 : 0.09
                            )
                          : "transparent",
                        whiteSpace: "nowrap",
                        transition:
                          "background-color 150ms ease, color 150ms ease",
                        "&:hover": {
                          color: "primary.main",
                          bgcolor: alpha(theme.palette.primary.main, 0.09),
                        },
                      }}
                    >
                      {label}
                    </Button>
                  );
                })}
              </Stack>
            )}

            <Stack
              direction="row"
              spacing={0.85}
              alignItems="center"
              sx={{
                flexShrink: 0,
                position: "relative",
                zIndex: 1,
              }}
            >
              {!isMobile && (
                <Button
                  variant="text"
                  size="small"
                  href="/login"
                  sx={{
                    height: 36,
                    borderRadius: 2,
                    textTransform: "none",
                    fontSize: "0.76rem",
                    fontWeight: 800,
                    color: "text.secondary",
                    px: 1.6,
                    "&:hover": {
                      color: "primary.main",
                      bgcolor: alpha(theme.palette.primary.main, 0.08),
                    },
                  }}
                >
                  Login
                </Button>
              )}

              {!isMobile && (
                <Button
                  variant="contained"
                  size="small"
                  endIcon={
                    <ArrowForwardRounded
                      sx={{
                        fontSize: "18px !important",
                        display: "block",
                      }}
                    />
                  }
                  onClick={handleRegisterClick}
                  sx={{
                    height: 36,
                    borderRadius: 2,
                    textTransform: "none",
                    fontSize: "0.76rem",
                    fontWeight: 850,
                    px: 1.8,
                    boxShadow: `0 12px 28px ${alpha(
                      theme.palette.primary.main,
                      0.2
                    )}`,
                    "&:hover": {
                      boxShadow: "none",
                    },
                  }}
                >
                  Start Free
                </Button>
              )}

              {!isMobile && (
                <IconButton
                  onClick={() => handleScrollToSection("modules")}
                  aria-label="Scroll to modules"
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: 2,
                    color: "text.secondary",
                    border: `1px solid ${neutralBorder}`,
                    bgcolor: alpha(softSurface, isDark ? 0.42 : 0.72),
                    "&:hover": {
                      color: "primary.main",
                      borderColor: neutralBorderStrong,
                      bgcolor: alpha(theme.palette.primary.main, 0.08),
                    },
                  }}
                >
                  <KeyboardArrowDownRounded
                    sx={{
                      fontSize: 21,
                      display: "block",
                    }}
                  />
                </IconButton>
              )}

              {isMobile && (
                <Button
                  variant="contained"
                  size="small"
                  onClick={handleRegisterClick}
                  sx={{
                    height: 34,
                    borderRadius: 1.75,
                    textTransform: "none",
                    fontSize: "0.72rem",
                    fontWeight: 850,
                    boxShadow: "none",
                    px: 1.3,
                    display: { xs: "none", sm: "inline-flex" },
                  }}
                >
                  Start
                </Button>
              )}

              {isMobile && (
                <IconButton
                  onClick={handleMobileMenuToggle}
                  aria-label={
                    mobileOpen ? "Close navigation menu" : "Open navigation menu"
                  }
                  aria-expanded={mobileOpen}
                  sx={{
                    width: 38,
                    height: 38,
                    borderRadius: 2,
                    bgcolor: mobileOpen
                      ? alpha(theme.palette.primary.main, 0.17)
                      : alpha(theme.palette.primary.main, 0.1),
                    color: "primary.main",
                    border: `1px solid ${alpha(
                      theme.palette.primary.main,
                      0.15
                    )}`,
                    position: "relative",
                    zIndex: menuButtonZIndex,
                    "&:hover": {
                      bgcolor: alpha(theme.palette.primary.main, 0.15),
                    },
                  }}
                >
                  {mobileOpen ? (
                    <CloseRounded
                      sx={{
                        fontSize: 22,
                        display: "block",
                      }}
                    />
                  ) : (
                    <MenuRounded
                      sx={{
                        fontSize: 23,
                        display: "block",
                      }}
                    />
                  )}
                </IconButton>
              )}
            </Stack>
          </Box>
        </Container>
      </Box>

      <MobileLandingDrawer
        open={mobileOpen}
        onClose={handleMobileMenuClose}
        navItems={safeNavItems}
        scrollToSection={handleScrollToSection}
        scrollToRegistration={handleRegisterClick}
      />
    </>
  );
};

export default LandingHeader;