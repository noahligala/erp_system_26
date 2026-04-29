import { createContext, useState, useMemo, useEffect } from "react";
import { createTheme, alpha } from "@mui/material/styles";

/* ------------------------------------------------------------------
   COLOR TOKENS
------------------------------------------------------------------ */
export const tokens = (mode) => ({
  ...(mode === "dark"
    ? {
        grey: {
          100: "#f1f5f9",
          200: "#e2e8f0",
          300: "#cbd5e1",
          400: "#94a3b8",
          500: "#64748b",
          600: "#475569",
          700: "#334155",
          800: "#1e293b",
          900: "#0f172a",
        },
        primary: {
          100: "#e0e7ff",
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
          800: "#312e81",
          900: "#1e1b4b",
        },
        status: {
          success: "#10b981",
          error: "#f43f5e",
          warning: "#f59e0b",
          info: "#3b82f6",
        },
      }
    : {
        grey: {
          100: "#0f172a",
          200: "#1e293b",
          300: "#334155",
          400: "#475569",
          500: "#64748b",
          600: "#94a3b8",
          700: "#cbd5e1",
          800: "#e2e8f0",
          900: "#f8fafc",
        },
        primary: {
          100: "#e0e7ff",
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
          800: "#3730a3",
          900: "#312e81",
        },
        status: {
          success: "#059669",
          error: "#dc2626",
          warning: "#d97706",
          info: "#2563eb",
        },
      }),
});

/* ------------------------------------------------------------------
   MASTER THEME SETTINGS
------------------------------------------------------------------ */
export const themeSettings = (mode) => {
  const colors = tokens(mode);
  const isDark = mode === "dark";

  const fontStack = [
    '"Inter"',
    '"Geist"',
    '"SF Pro Display"',
    "-apple-system",
    "BlinkMacSystemFont",
    '"Segoe UI"',
    "Roboto",
    "Helvetica",
    "sans-serif",
  ].join(",");

  const surfaceBg = isDark ? "#0f172a" : "#ffffff";
  const appBg = isDark ? "#020617" : "#f8fafc";
  const elevatedBg = isDark ? "#111827" : "#ffffff";
  const subtleBg = isDark ? "#111827" : "#f8fafc";

  const borderSoft = `1px solid ${alpha(
    colors.grey[500],
    isDark ? 0.14 : 0.1
  )}`;

  const borderStrong = `1px solid ${alpha(
    colors.grey[500],
    isDark ? 0.22 : 0.16
  )}`;

  const transitionFast =
    "background-color 120ms ease, border-color 120ms ease, color 120ms ease";

  const transitionWidth = "width 160ms ease, min-width 160ms ease";

  const shadowPopup = isDark
    ? "0 12px 28px rgba(0,0,0,0.32)"
    : "0 12px 28px rgba(15,23,42,0.10)";

  /* ------------------------------------------------------------------
     SHARED DASHBOARD BASE
  ------------------------------------------------------------------ */
  const dashboardBase = {
    shell: {
      minHeight: "100%",
      px: { xs: 1.25, sm: 1.5, md: 2 },
      py: { xs: 1.25, md: 2 },
      backgroundColor: appBg,
      backgroundImage: "none",
    },

    card: {
      borderRadius: "14px",
      p: { xs: 1.5, md: 2 },
      backgroundColor: surfaceBg,
      border: borderSoft,
      boxShadow: "none",
      backgroundImage: "none",
      transition: transitionFast,
      "&:hover": {
        borderColor: alpha(colors.primary[500], isDark ? 0.32 : 0.22),
        backgroundColor: isDark ? "#111827" : "#ffffff",
      },
    },

    subtleCard: {
      borderRadius: "12px",
      p: 1.5,
      backgroundColor: surfaceBg,
      border: borderSoft,
      boxShadow: "none",
      backgroundImage: "none",
      transition: transitionFast,
    },

    iconBox: {
      width: 38,
      height: 38,
      borderRadius: "12px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
      backgroundColor: "var(--accent-bg)",
      color: "var(--accent)",
      border: "1px solid var(--accent-border)",
      "& svg": {
        fontSize: 21,
      },
    },

    iconBoxSmall: {
      width: 34,
      height: 34,
      borderRadius: "10px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
      backgroundColor: "var(--accent-bg)",
      color: "var(--accent)",
      border: "1px solid var(--accent-border)",
      "& svg": {
        fontSize: 18,
      },
    },

    sectionTitle: {
      fontWeight: 500,
      color: "text.primary",
      letterSpacing: "-0.015em",
      fontSize: "0.9rem",
    },

    sectionSubtitle: {
      color: "text.secondary",
      fontSize: "0.72rem",
      mt: 0.25,
      fontWeight: 400,
    },

    emptyText: {
      fontSize: "0.76rem",
      color: "text.secondary",
      fontWeight: 400,
    },
  };

  /* ------------------------------------------------------------------
     HRM DASHBOARD STYLES
     Usage: theme.hrmDashboard
  ------------------------------------------------------------------ */
  const hrmDashboard = {
    ...dashboardBase,

    heroCard: {
      mb: 2.5,
      p: { xs: 1.75, md: 2.25 },
      position: "relative",
      overflow: "hidden",
      backgroundColor: surfaceBg,
      border: borderSoft,
      boxShadow: "none",
      backgroundImage: isDark
        ? `linear-gradient(135deg, ${alpha(
            colors.primary[500],
            0.12
          )}, transparent 62%)`
        : `linear-gradient(135deg, ${alpha(
            colors.primary[500],
            0.075
          )}, transparent 62%)`,
    },

    heroTitle: {
      fontSize: { xs: "1.35rem", md: "1.75rem" },
      fontWeight: 500,
      letterSpacing: "-0.03em",
      color: "text.primary",
      lineHeight: 1.1,
    },

    heroSubtitle: {
      mt: 0.75,
      color: "text.secondary",
      maxWidth: 720,
      fontSize: { xs: "0.78rem", md: "0.84rem" },
      lineHeight: 1.55,
      fontWeight: 400,
    },

    statCard: {
      minHeight: 136,
      position: "relative",
      overflow: "hidden",
      borderLeftWidth: 3,
      borderLeftStyle: "solid",
      borderLeftColor: "var(--accent)",
      "&:hover": {
        borderLeftColor: "var(--accent)",
        borderColor: "var(--accent-border-strong)",
      },
    },

    statValue: {
      fontSize: { xs: "1.3rem", md: "1.5rem" },
      lineHeight: 1,
      fontWeight: 500,
      letterSpacing: "-0.02em",
      color: "text.primary",
    },

    statTitle: {
      mt: 0.75,
      fontSize: "0.76rem",
      color: "text.secondary",
      fontWeight: 400,
    },

    statSubtitle: {
      mt: 0.25,
      fontSize: "0.68rem",
      color: "text.disabled",
      fontWeight: 400,
    },

    navCard: {
      minHeight: 124,
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      cursor: "pointer",
      position: "relative",
      overflow: "hidden",
      borderLeftWidth: 3,
      borderLeftStyle: "solid",
      borderLeftColor: "var(--accent)",
      transition: transitionFast,
      "&:hover": {
        borderColor: "var(--accent-border-strong)",
        backgroundColor: isDark ? "#111827" : "#ffffff",
      },
      "&[data-disabled='true']": {
        opacity: 0.58,
        cursor: "not-allowed",
      },
    },

    navTitle: {
      fontWeight: 500,
      color: "text.primary",
      letterSpacing: "-0.005em",
      fontSize: "0.82rem",
    },

    navSubtitle: {
      mt: 0.25,
      fontSize: "0.7rem",
      color: "text.secondary",
      fontWeight: 400,
      lineHeight: 1.45,
    },

    navAction: {
      fontSize: "0.7rem",
      color: "var(--accent)",
      fontWeight: 400,
    },

    chartCard: {
      height: { xs: 360, md: 400 },
      display: "flex",
      flexDirection: "column",
    },

    listCard: {
      height: 310,
      display: "flex",
      flexDirection: "column",
    },

    emptyIcon: {
      width: 38,
      height: 38,
      mx: "auto",
      mb: 1.25,
      borderRadius: "12px",
      backgroundColor: alpha(isDark ? "#ffffff" : "#0f172a", 0.045),
      border: borderSoft,
    },

    futureInsightCard: {
      height: 310,
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      position: "relative",
      overflow: "hidden",
      backgroundColor: surfaceBg,
      backgroundImage: isDark
        ? `linear-gradient(135deg, ${alpha(
            colors.primary[500],
            0.08
          )}, transparent 62%)`
        : `linear-gradient(135deg, ${alpha(
            colors.primary[500],
            0.045
          )}, transparent 62%)`,
    },
  };

  /* ------------------------------------------------------------------
     MAIN DASHBOARD STYLES
     Usage: theme.dashboard
  ------------------------------------------------------------------ */
  const dashboard = {
    ...dashboardBase,

    heroCard: {
      mb: 2.5,
      p: { xs: 1.75, md: 2.25 },
      color: "#fff",
      position: "relative",
      overflow: "hidden",
      backgroundColor: colors.primary[700],
      backgroundImage: `linear-gradient(135deg, ${colors.primary[600]} 0%, ${colors.primary[800]} 100%)`,
      border: `1px solid ${alpha(colors.primary[400], 0.24)}`,
      boxShadow: "none",
    },

    heroChip: {
      backgroundColor: "rgba(255,255,255,0.12)",
      color: "#fff",
      fontWeight: 400,
      fontSize: "0.66rem",
      height: 22,
      borderRadius: "999px",
      "& .MuiChip-icon": {
        color: "#fff",
      },
    },

    heroWarningChip: {
      backgroundColor: "rgba(255, 183, 77, 0.22)",
      color: "#fff",
      fontWeight: 400,
      fontSize: "0.66rem",
      height: 22,
      borderRadius: "999px",
    },

    heroSelect: {
      minWidth: 138,
      "& .MuiOutlinedInput-root, & .MuiSelect-select": {
        fontSize: "0.74rem",
        fontWeight: 400,
      },
      "& .MuiOutlinedInput-root": {
        borderRadius: "9px",
        color: "#fff",
        backgroundColor: "rgba(255,255,255,0.1)",
      },
      "& .MuiOutlinedInput-notchedOutline": {
        borderColor: "rgba(255,255,255,0.18)",
      },
      "&:hover .MuiOutlinedInput-notchedOutline": {
        borderColor: "rgba(255,255,255,0.32)",
      },
      "& .MuiSvgIcon-root": {
        color: "#fff",
      },
    },

    heroIconButton: {
      width: 38,
      height: 38,
      borderRadius: "9px",
      backgroundColor: "rgba(255,255,255,0.1)",
      color: "#fff",
      transition: transitionFast,
      "&:hover": {
        backgroundColor: "rgba(255,255,255,0.16)",
      },
    },

    heroButton: {
      borderRadius: "9px",
      px: 1.75,
      py: 0.75,
      textTransform: "none",
      fontWeight: 500,
      fontSize: "0.74rem",
      backgroundColor: "rgba(255,255,255,0.16)",
      color: "#fff",
      boxShadow: "none",
      transition: transitionFast,
      "&:hover": {
        backgroundColor: "rgba(255,255,255,0.24)",
        boxShadow: "none",
      },
    },

    metricCard: {
      cursor: "pointer",
      minHeight: 132,
      position: "relative",
      overflow: "hidden",
      borderLeftWidth: 3,
      borderLeftStyle: "solid",
      borderLeftColor: "var(--accent)",
      "&:hover": {
        borderColor: "var(--accent-border-strong)",
        backgroundColor: isDark ? "#111827" : "#ffffff",
      },
    },

    metricValue: {
      fontSize: { xs: "1.25rem", md: "1.45rem" },
      fontWeight: 500,
      lineHeight: 1.1,
      letterSpacing: "-0.02em",
      color: "text.primary",
    },

    metricTitle: {
      fontSize: "0.74rem",
      color: "text.secondary",
      fontWeight: 400,
      mt: 0.4,
    },

    chartCard: {
      gridColumn: { xs: "span 1", lg: "span 8" },
      minHeight: 380,
      display: "flex",
      flexDirection: "column",
    },

    sideCard: {
      gridColumn: { xs: "span 1", lg: "span 4" },
      minHeight: 380,
      display: "flex",
      flexDirection: "column",
    },

    moduleCard: {
      gridColumn: { xs: "span 1", lg: "span 4" },
      cursor: "pointer",
    },

    moduleTitle: {
      fontSize: "0.84rem",
      fontWeight: 500,
      color: "text.primary",
      letterSpacing: "-0.01em",
    },

    moduleSubtitle: {
      fontSize: "0.7rem",
      color: "text.secondary",
      fontWeight: 400,
      mt: 0.15,
    },

    moduleRowLabel: {
      fontSize: "0.76rem",
      color: "text.secondary",
      fontWeight: 400,
    },

    moduleRowValue: {
      fontSize: "0.8rem",
      fontWeight: 500,
      color: "text.primary",
    },

    saleItem: {
      p: 1.25,
      borderRadius: "11px",
      backgroundColor: "transparent",
      border: borderSoft,
      cursor: "pointer",
      transition: transitionFast,
      "&:hover": {
        backgroundColor: alpha(colors.primary[500], isDark ? 0.045 : 0.03),
        borderColor: alpha(colors.primary[500], isDark ? 0.26 : 0.18),
      },
    },

    salePrimary: {
      fontSize: "0.76rem",
      fontWeight: 500,
      color: "text.primary",
    },

    saleSecondary: {
      fontSize: "0.68rem",
      color: "text.secondary",
      fontWeight: 400,
      mt: 0.15,
    },

    saleAmount: {
      fontSize: "0.76rem",
      fontWeight: 500,
      color: "text.primary",
    },
  };

  /* ------------------------------------------------------------------
     TOPBAR STYLES
     Usage: theme.topbar
  ------------------------------------------------------------------ */
  const topbar = {
    root: {
      height: 64,
      px: { xs: 1.25, md: 2 },
      py: 1,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 1.5,
      backgroundColor: "transparent",
    },

    searchWrap: {
      width: { xs: "100%", sm: 320, md: 380 },
      height: 38,
      display: "flex",
      alignItems: "center",
      borderRadius: "10px",
      backgroundColor: surfaceBg,
      border: borderSoft,
      boxShadow: "none",
      transition: transitionFast,
      "&:focus-within": {
        borderColor: alpha(colors.primary[500], 0.45),
        backgroundColor: surfaceBg,
      },
    },

    searchInput: {
      ml: 1.5,
      flex: 1,
      fontSize: "0.78rem",
      fontWeight: 400,
      color: "text.primary",
      "& input::placeholder": {
        color: colors.grey[500],
        opacity: 1,
      },
    },

    searchButton: {
      width: 36,
      height: 36,
      borderRadius: "9px",
      color: "text.secondary",
      transition: transitionFast,
      "&:hover": {
        color: "primary.main",
        backgroundColor: alpha(colors.primary[500], 0.08),
      },
    },

    actions: {
      display: "flex",
      alignItems: "center",
      gap: 0.35,
      flexShrink: 0,
    },

    actionButton: {
      width: 38,
      height: 38,
      borderRadius: "10px",
      color: "text.secondary",
      transition: transitionFast,
      "&:hover": {
        color: "primary.main",
        backgroundColor: alpha(colors.primary[500], 0.08),
      },
    },

    popoverPaper: {
      mt: 1,
      borderRadius: "12px",
      backgroundColor: elevatedBg,
      border: borderStrong,
      boxShadow: shadowPopup,
      backgroundImage: "none",
      overflow: "hidden",
    },

    searchPopoverPaper: {
      mt: 0.75,
      borderRadius: "12px",
      backgroundColor: elevatedBg,
      border: borderStrong,
      boxShadow: shadowPopup,
      backgroundImage: "none",
      overflow: "hidden",
    },

    searchList: {
      maxHeight: 320,
      overflowY: "auto",
      py: 0.75,
    },

    searchItem: {
      mx: 0.75,
      mb: 0.25,
      borderRadius: "9px",
      px: 1.25,
      py: 0.85,
      transition: transitionFast,
      "&:hover": {
        backgroundColor: alpha(colors.primary[500], 0.08),
      },
      "&.Mui-disabled": {
        opacity: 0.75,
      },
    },

    searchPrimary: {
      fontSize: "0.76rem",
      fontWeight: 500,
      color: "text.primary",
    },

    searchSecondary: {
      fontSize: "0.66rem",
      fontWeight: 400,
      color: "text.secondary",
    },

    notificationBox: {
      minWidth: 280,
      p: 2,
      backgroundColor: elevatedBg,
    },

    notificationTitle: {
      fontSize: "0.86rem",
      fontWeight: 500,
      color: "text.primary",
      mb: 0.5,
    },

    notificationText: {
      fontSize: "0.72rem",
      fontWeight: 400,
      color: "text.secondary",
    },

    menuPaper: {
      mt: 1,
      borderRadius: "12px",
      backgroundColor: elevatedBg,
      border: borderStrong,
      boxShadow: shadowPopup,
      backgroundImage: "none",
      overflow: "hidden",
      minWidth: 180,
    },

    menuList: {
      py: 0.75,
    },

    menuItem: {
      mx: 0.75,
      borderRadius: "9px",
      fontSize: "0.76rem",
      fontWeight: 400,
      color: "text.primary",
      minHeight: 34,
      transition: transitionFast,
      "&:hover": {
        backgroundColor: alpha(colors.primary[500], 0.08),
      },
    },

    dangerMenuItem: {
      mx: 0.75,
      borderRadius: "9px",
      fontSize: "0.76rem",
      fontWeight: 400,
      color: colors.status.error,
      minHeight: 34,
      transition: transitionFast,
      "&:hover": {
        backgroundColor: alpha(colors.status.error, 0.08),
      },
    },
  };

  /* ------------------------------------------------------------------
     SIDEBAR STYLES
     Usage: theme.sidebar
  ------------------------------------------------------------------ */
  const sidebar = {
    width: 270,
    collapsedWidth: 80,

    root: (collapsed, textVisible) => ({
      height: "100vh",
      display: "flex",
      flexDirection: "column",
      zIndex: 1000,
      width: collapsed ? 80 : 270,
      minWidth: collapsed ? 80 : 270,
      borderRight: borderSoft,
      backgroundColor: surfaceBg,
      transition: transitionWidth,
      overflow: "hidden",

      "& .ps-sidebar-root": {
        border: "none !important",
        backgroundColor: `${surfaceBg} !important`,
        height: "100%",
      },

      "& .ps-sidebar-container": {
        height: "100% !important",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        backgroundColor: `${surfaceBg} !important`,
        backgroundImage: "none !important",
        overflowY: "auto !important",
        overflowX: "hidden !important",
        paddingRight: collapsed ? 0 : 6,
      },

      "& .ps-menu-root": {
        flexGrow: 1,
        paddingBottom: "16px",
      },

      "& .ps-menuitem-root > .ps-menu-button, & .ps-submenu-root > .ps-menu-button": {
        minHeight: 38,
        height: 38,
        borderRadius: "10px",
        margin: "2px 8px",
        paddingRight: "10px !important",
        color: `${isDark ? colors.grey[300] : colors.grey[300]} !important`,
        fontSize: "0.76rem",
        fontWeight: 400,
        transition: transitionFast,
      },

      "& .ps-menu-button:hover": {
        backgroundColor: `${alpha(colors.primary[500], 0.075)} !important`,
        color: `${colors.primary[500]} !important`,
      },

      "& .ps-menuitem-root.ps-active > .ps-menu-button": {
        backgroundColor: `${alpha(colors.primary[500], 0.105)} !important`,
        color: `${colors.primary[500]} !important`,
        fontWeight: "500 !important",
      },

      "& .ps-menu-icon": {
        minWidth: collapsed ? "56px !important" : "36px !important",
        marginRight: collapsed ? "0px !important" : "8px !important",
        color: "inherit !important",
      },

      "& .ps-menu-icon svg": {
        fontSize: "1.15rem",
      },

      "& .ps-submenu-content": {
        backgroundColor: "transparent !important",
        paddingLeft: collapsed ? 0 : 10,
      },

      "& .ps-submenu-root .ps-menuitem-root > .ps-menu-button": {
        minHeight: 34,
        height: 34,
        margin: "1px 8px",
        fontSize: "0.72rem",
      },

      "& .ps-submenu-expand-icon": {
        color: `${colors.grey[500]} !important`,
      },

      "& .menu-text, & .logo-text": {
        display: "inline-block",
        whiteSpace: "nowrap",
        verticalAlign: "middle",
        opacity: textVisible ? 1 : 0,
        transition: "opacity 100ms ease",
        pointerEvents: textVisible ? "auto" : "none",
      },

      "&.collapsed .ps-menu-button": {
        paddingLeft: "12px !important",
      },
    }),

    itemRoot: (active = false) => ({
      "& .ps-menu-button:hover": {
        backgroundColor: `${alpha(colors.primary[500], 0.075)} !important`,
        color: `${colors.primary[500]} !important`,
      },

      "&.ps-active > .ps-menu-button": {
        backgroundColor: `${alpha(colors.primary[500], 0.105)} !important`,
        color: `${colors.primary[500]} !important`,
        fontWeight: active ? "500 !important" : "400 !important",
      },
    }),

    submenuRoot: (active = false) => ({
      "& > .ps-menu-button": {
        color: active
          ? `${colors.primary[500]} !important`
          : `${isDark ? colors.grey[300] : colors.grey[300]} !important`,
        fontWeight: active ? "500 !important" : "400 !important",
      },
      "& > .ps-menu-button:hover": {
        backgroundColor: `${alpha(colors.primary[500], 0.075)} !important`,
        color: `${colors.primary[500]} !important`,
      },
    }),

    logoMenuItem: {
      margin: "8px 0 14px 0",
      color: isDark ? colors.grey[100] : colors.grey[100],
      backgroundColor: "transparent",
    },

    logoMenuRoot: {
      "& > .ps-menu-button": {
        height: "48px !important",
      },
      "& > .ps-menu-button:hover": {
        backgroundColor: "transparent !important",
        color: "inherit !important",
      },
    },

    logoBox: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      ml: "14px",
      width: "100%",
    },

    logoText: {
      fontSize: "1rem",
      fontWeight: 600,
      letterSpacing: "-0.02em",
      color: "text.primary",
    },

    toggleButton: {
      width: 34,
      height: 34,
      borderRadius: "9px",
      color: "text.secondary",
      transition: transitionFast,
      "&:hover": {
        color: "primary.main",
        backgroundColor: alpha(colors.primary[500], 0.075),
      },
    },

    profileWrap: (collapsed) => ({
      mb: collapsed ? 0.5 : 2,
      px: collapsed ? 0.75 : 1.25,
    }),

    profileExpanded: {
      textAlign: "center",
      px: 1,
      py: 1.25,
      mx: 1,
      borderRadius: "14px",
      backgroundColor: surfaceBg,
      border: borderSoft,
    },

    avatarLarge: {
      width: 64,
      height: 64,
      cursor: "pointer",
      fontSize: "1.3rem",
      fontWeight: 500,
      bgcolor: colors.primary[500],
      color: "#fff",
      mx: "auto",
    },

    avatarSmall: {
      width: 34,
      height: 34,
      cursor: "pointer",
      fontSize: "0.78rem",
      fontWeight: 500,
      bgcolor: colors.primary[500],
      color: "#fff",
    },

    userName: {
      mt: 1,
      fontSize: "0.78rem",
      fontWeight: 500,
      color: "text.primary",
      display: "block",
      maxWidth: 190,
      mx: "auto",
      overflow: "hidden",
      textOverflow: "ellipsis",
    },

    menuWrap: (collapsed) => ({
      px: collapsed ? 0 : 0.5,
    }),

    footer: {
      textAlign: "center",
      px: 1,
      py: 1.25,
      borderTop: borderSoft,
      backgroundColor: "transparent",
    },

    footerBrand: {
      display: "block",
      color: "text.secondary",
      fontSize: "0.72rem",
      fontWeight: 500,
    },

    footerVersion: {
      display: "block",
      color: "text.disabled",
      fontSize: "0.66rem",
      fontWeight: 400,
      mt: 0.25,
    },
  };

  return {
    palette: {
      mode,
      primary: {
        main: colors.primary[500],
        light: colors.primary[400],
        dark: colors.primary[600],
      },
      secondary: {
        main: colors.primary[400],
        light: colors.primary[300],
        dark: colors.primary[600],
      },
      success: {
        main: colors.status.success,
      },
      error: {
        main: colors.status.error,
      },
      warning: {
        main: colors.status.warning,
      },
      info: {
        main: colors.status.info,
      },
      background: {
        default: appBg,
        paper: surfaceBg,
      },
      text: {
        primary: isDark ? colors.grey[100] : colors.grey[100],
        secondary: isDark ? colors.grey[400] : colors.grey[500],
        disabled: alpha(isDark ? colors.grey[400] : colors.grey[500], 0.5),
      },
      divider: alpha(colors.grey[500], isDark ? 0.18 : 0.1),
      action: {
        hover: alpha(colors.primary[500], 0.04),
        selected: alpha(colors.primary[500], 0.08),
        disabled: alpha(colors.grey[500], 0.3),
        disabledBackground: alpha(colors.grey[500], 0.1),
      },
    },

    hrmDashboard,
    dashboard,
    topbar,
    sidebar,

    /* ------------------------------------------------------------------
       TYPOGRAPHY
    ------------------------------------------------------------------ */
    typography: {
      fontFamily: fontStack,
      fontSize: 12,

      fontWeightLight: 300,
      fontWeightRegular: 400,
      fontWeightMedium: 500,
      fontWeightBold: 600,

      h1: {
        fontSize: "1.45rem",
        fontWeight: 500,
        letterSpacing: "-0.025em",
      },
      h2: {
        fontSize: "1.25rem",
        fontWeight: 500,
        letterSpacing: "-0.02em",
      },
      h3: {
        fontSize: "1.1rem",
        fontWeight: 500,
        letterSpacing: "-0.015em",
      },
      h4: {
        fontSize: "0.98rem",
        fontWeight: 500,
        letterSpacing: "-0.01em",
      },
      h5: {
        fontSize: "0.88rem",
        fontWeight: 500,
      },
      h6: {
        fontSize: "0.78rem",
        fontWeight: 500,
      },
      subtitle1: {
        fontSize: "0.8rem",
        fontWeight: 400,
        color: isDark ? colors.grey[300] : colors.grey[500],
      },
      subtitle2: {
        fontSize: "0.72rem",
        fontWeight: 400,
        color: isDark ? colors.grey[400] : colors.grey[600],
      },
      body1: {
        fontSize: "0.8rem",
        fontWeight: 400,
        lineHeight: 1.55,
        letterSpacing: "0.005em",
      },
      body2: {
        fontSize: "0.72rem",
        fontWeight: 400,
        lineHeight: 1.55,
        letterSpacing: "0.01em",
      },
      button: {
        textTransform: "none",
        fontWeight: 500,
        fontSize: "0.76rem",
        letterSpacing: "0.01em",
      },
      overline: {
        fontSize: "0.66rem",
        fontWeight: 500,
        letterSpacing: "0.045em",
        textTransform: "uppercase",
      },
      caption: {
        fontSize: "0.66rem",
        fontWeight: 400,
        color: isDark ? colors.grey[400] : colors.grey[500],
      },
    },

    /* ------------------------------------------------------------------
       COMPONENT DEFAULTS - FAST MODERN UI
    ------------------------------------------------------------------ */
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          html: {
            backgroundColor: appBg,
          },
          body: {
            backgroundColor: appBg,
            WebkitFontSmoothing: "antialiased",
            MozOsxFontSmoothing: "grayscale",

            scrollbarColor: isDark
              ? `${colors.grey[700]} transparent`
              : `${colors.grey[300]} transparent`,

            "&::-webkit-scrollbar, & *::-webkit-scrollbar": {
              width: "6px",
              height: "6px",
            },
            "&::-webkit-scrollbar-track, & *::-webkit-scrollbar-track": {
              background: "transparent",
            },
            "&::-webkit-scrollbar-thumb, & *::-webkit-scrollbar-thumb": {
              backgroundColor: alpha(colors.grey[500], 0.28),
              borderRadius: "6px",
            },
          },

          "@media (prefers-reduced-motion: reduce)": {
            "*, *::before, *::after": {
              animationDuration: "0.01ms !important",
              animationIterationCount: "1 !important",
              scrollBehavior: "auto !important",
              transitionDuration: "0.01ms !important",
            },
          },
        },
      },

      MuiAppBar: {
        defaultProps: {
          elevation: 0,
        },
        styleOverrides: {
          root: {
            backgroundColor: isDark ? "#020617" : "#ffffff",
            borderBottom: borderSoft,
            color: isDark ? "#ffffff" : colors.grey[100],
            backgroundImage: "none",
            boxShadow: "none",
          },
        },
      },

      MuiPaper: {
        defaultProps: {
          elevation: 0,
        },
        styleOverrides: {
          root: {
            borderRadius: "10px",
            backgroundColor: surfaceBg,
            border: borderSoft,
            backgroundImage: "none",
            boxShadow: "none",
          },
        },
      },

      MuiCard: {
        defaultProps: {
          elevation: 0,
        },
        styleOverrides: {
          root: {
            borderRadius: "10px",
            backgroundColor: surfaceBg,
            border: borderSoft,
            backgroundImage: "none",
            boxShadow: "none",
          },
        },
      },

      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: "12px",
            backgroundColor: elevatedBg,
            border: borderStrong,
            boxShadow: shadowPopup,
            backgroundImage: "none",
          },
        },
      },

      MuiMenu: {
        styleOverrides: {
          paper: {
            marginTop: "8px",
            borderRadius: "10px",
            backgroundColor: elevatedBg,
            border: borderStrong,
            boxShadow: shadowPopup,
            backgroundImage: "none",
          },
        },
      },

      MuiPopover: {
        styleOverrides: {
          paper: {
            borderRadius: "12px",
            backgroundColor: elevatedBg,
            border: borderStrong,
            boxShadow: shadowPopup,
            backgroundImage: "none",
          },
        },
      },

      MuiButton: {
        defaultProps: {
          disableElevation: true,
        },
        styleOverrides: {
          root: {
            borderRadius: "6px",
            padding: "6px 14px",
            transition: transitionFast,
            textTransform: "none",
          },
          contained: {
            backgroundColor: colors.primary[500],
            color: "#fff",
            boxShadow: "none",
            "&:hover": {
              backgroundColor: colors.primary[600],
              boxShadow: "none",
            },
          },
          outlined: {
            borderColor: alpha(colors.grey[500], 0.3),
            "&:hover": {
              backgroundColor: alpha(colors.grey[500], 0.05),
              borderColor: colors.grey[500],
            },
          },
          text: {
            "&:hover": {
              backgroundColor: alpha(colors.grey[500], 0.08),
            },
          },
        },
      },

      MuiIconButton: {
        styleOverrides: {
          root: {
            borderRadius: "8px",
            transition: transitionFast,
          },
        },
      },

      MuiTextField: {
        defaultProps: {
          variant: "outlined",
          size: "small",
        },
      },

      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: "6px",
            backgroundColor: isDark ? "#020617" : "#f8fafc",
            transition: transitionFast,
            "& fieldset": {
              borderColor: alpha(colors.grey[500], 0.3),
            },
            "&:hover fieldset": {
              borderColor: alpha(colors.grey[500], 0.55),
            },
            "&.Mui-focused fieldset": {
              borderWidth: "1px",
              borderColor: colors.primary[500],
            },
          },
          input: {
            padding: "8px 12px",
            fontSize: "0.8rem",
            fontWeight: 400,
          },
        },
      },

      MuiInputLabel: {
        styleOverrides: {
          root: {
            fontSize: "0.8rem",
            fontWeight: 400,
            transform: "translate(14px, 9px) scale(1)",
            "&.MuiInputLabel-shrink": {
              transform: "translate(14px, -9px) scale(0.85)",
            },
          },
        },
      },

      MuiTableCell: {
        styleOverrides: {
          root: {
            fontSize: "0.75rem",
            fontWeight: 400,
            borderBottom: borderSoft,
          },
          head: {
            fontSize: "0.72rem",
            fontWeight: 500,
            color: isDark ? colors.grey[300] : colors.grey[500],
            backgroundColor: subtleBg,
          },
        },
      },

      MuiDataGrid: {
        styleOverrides: {
          root: {
            border: "none",
            fontSize: "0.75rem",
            fontWeight: 400,
            "--DataGrid-rowBorderColor": alpha(
              colors.grey[500],
              isDark ? 0.14 : 0.09
            ),
          },
          columnHeaders: {
            backgroundColor: subtleBg,
            borderBottom: borderSoft,
            minHeight: "36px !important",
            maxHeight: "36px !important",
          },
          columnHeaderTitle: {
            fontWeight: 500,
            letterSpacing: "0.02em",
            color: isDark ? colors.grey[300] : colors.grey[600],
          },
          row: {
            minHeight: "40px !important",
            maxHeight: "40px !important",
            "&:hover": {
              backgroundColor: alpha(colors.primary[500], 0.035),
            },
            "&.Mui-selected": {
              backgroundColor: alpha(colors.primary[500], 0.075),
              "&:hover": {
                backgroundColor: alpha(colors.primary[500], 0.1),
              },
            },
          },
          cell: {
            borderBottom: borderSoft,
            padding: "0 16px",
            "&:focus, &:focus-within": {
              outline: "none",
            },
          },
          columnSeparator: {
            display: "none",
          },
          footerContainer: {
            borderTop: borderSoft,
            backgroundColor: surfaceBg,
            minHeight: "40px !important",
          },
        },
      },

      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: "4px",
            fontWeight: 400,
            fontSize: "0.68rem",
            height: "22px",
          },
          filled: {
            backgroundColor: isDark
              ? alpha(colors.grey[500], 0.2)
              : alpha(colors.grey[500], 0.1),
          },
        },
      },

      MuiAlert: {
        styleOverrides: {
          root: {
            borderRadius: "8px",
            fontWeight: 400,
            fontSize: "0.78rem",
            alignItems: "center",
          },
          message: {
            padding: "6px 0",
          },
        },
      },

      MuiListItemText: {
        styleOverrides: {
          primary: {
            fontWeight: 500,
            fontSize: "0.76rem",
          },
          secondary: {
            fontWeight: 400,
            fontSize: "0.68rem",
          },
        },
      },

      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            fontSize: "0.68rem",
            fontWeight: 400,
            borderRadius: "6px",
            backgroundColor: isDark ? "#1e293b" : "#0f172a",
          },
        },
      },

      MuiDivider: {
        styleOverrides: {
          root: {
            borderColor: alpha(colors.grey[500], isDark ? 0.16 : 0.09),
          },
        },
      },

      MuiLinearProgress: {
        styleOverrides: {
          root: {
            borderRadius: "999px",
            overflow: "hidden",
          },
        },
      },

      MuiSkeleton: {
        styleOverrides: {
          root: {
            borderRadius: "8px",
          },
        },
      },
    },
  };
};

/* ------------------------------------------------------------------
   COLOR MODE CONTEXT + HOOK
------------------------------------------------------------------ */
export const ColorModeContext = createContext({
  toggleColorMode: () => {},
});

export const useMode = () => {
  const getInitialMode = () => {
    if (typeof window === "undefined") return "light";

    const savedMode = localStorage.getItem("themeMode");

    if (savedMode === "light" || savedMode === "dark") {
      return savedMode;
    }

    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  };

  const [mode, setMode] = useState(getInitialMode);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)");

    const listener = (event) => {
      const savedMode = localStorage.getItem("themeMode");

      if (!savedMode) {
        setMode(event.matches ? "dark" : "light");
      }
    };

    systemPrefersDark.addEventListener("change", listener);

    return () => {
      systemPrefersDark.removeEventListener("change", listener);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    localStorage.setItem("themeMode", mode);
  }, [mode]);

  const colorMode = useMemo(
    () => ({
      toggleColorMode: () => {
        setMode((prev) => (prev === "light" ? "dark" : "light"));
      },
    }),
    []
  );

  const theme = useMemo(() => createTheme(themeSettings(mode)), [mode]);

  return [theme, colorMode];
};