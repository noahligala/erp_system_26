import { createContext, useState, useMemo, useEffect } from "react";
import { createTheme, alpha } from "@mui/material/styles";

/* ------------------------------------------------------------------
   COLOR TOKENS
------------------------------------------------------------------ */
export const tokens = (mode) => ({
  ...(mode === "dark"
    ? {
        grey: {
          50: "#f8fafc",
          100: "#f1f5f9",
          200: "#e2e8f0",
          300: "#cbd5e1",
          400: "#94a3b8",
          500: "#64748b",
          600: "#475569",
          700: "#334155",
          800: "#1e293b",
          900: "#0f172a",
          950: "#020617",
        },
        primary: {
          50: "#eef2ff",
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
          50: "#020617",
          100: "#0f172a",
          200: "#1e293b",
          300: "#334155",
          400: "#475569",
          500: "#64748b",
          600: "#94a3b8",
          700: "#cbd5e1",
          800: "#e2e8f0",
          900: "#f8fafc",
          950: "#ffffff",
        },
        primary: {
          50: "#eef2ff",
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
    "Arial",
    "sans-serif",
  ].join(",");

  /* ------------------------------------------------------------------
     FAST DESIGN CONSTANTS
  ------------------------------------------------------------------ */
  const appBg = isDark ? "#020617" : "#f8fafc";
  const surfaceBg = isDark ? "#0f172a" : "#ffffff";
  const elevatedBg = isDark ? "#111827" : "#ffffff";
  const subtleBg = isDark ? "#111827" : "#f1f5f9";
  const mutedBg = isDark ? "#1e293b" : "#f8fafc";

  const borderSoftColor = alpha(colors.grey[500], isDark ? 0.16 : 0.11);
  const borderStrongColor = alpha(colors.grey[500], isDark ? 0.26 : 0.18);
  const borderSoft = `1px solid ${borderSoftColor}`;
  const borderStrong = `1px solid ${borderStrongColor}`;

  const transitionFast =
    "background-color 120ms ease, border-color 120ms ease, color 120ms ease";
  const transitionWidth = "width 160ms ease, min-width 160ms ease";

  const shadowPopup = isDark
    ? "0 14px 34px rgba(0,0,0,0.34)"
    : "0 14px 34px rgba(15,23,42,0.12)";

  const radius = {
    xs: 6,
    sm: 8,
    md: 10,
    lg: 12,
    xl: 14,
    xxl: 18,
  };

  const layout = {
    page: {
      minHeight: "100%",
      width: "100%",
      px: { xs: 1, sm: 1.5, md: 2, lg: 2.5 },
      py: { xs: 1, sm: 1.5, md: 2 },
      backgroundColor: appBg,
      backgroundImage: "none",
    },

    pageTight: {
      minHeight: "100%",
      width: "100%",
      px: { xs: 1, sm: 1.25, md: 1.5 },
      py: { xs: 1, md: 1.5 },
      backgroundColor: appBg,
      backgroundImage: "none",
    },

    grid: {
      display: "grid",
      gap: { xs: 1.5, md: 2 },
    },

    responsiveGrid: {
      display: "grid",
      gap: { xs: 1.5, md: 2 },
      gridTemplateColumns: {
        xs: "1fr",
        sm: "repeat(2, minmax(0, 1fr))",
        xl: "repeat(4, minmax(0, 1fr))",
      },
    },

    contentGrid: {
      display: "grid",
      gap: { xs: 1.5, md: 2 },
      gridTemplateColumns: {
        xs: "1fr",
        lg: "repeat(12, minmax(0, 1fr))",
      },
    },
  };

  /* ------------------------------------------------------------------
     SHARED DASHBOARD BASE
     CSS variables:
     --accent
     --accent-bg
     --accent-border
     --accent-border-strong
  ------------------------------------------------------------------ */
  const dashboardBase = {
    shell: layout.page,

    card: {
      borderRadius: `${radius.xl}px`,
      p: { xs: 1.25, sm: 1.5, md: 2 },
      backgroundColor: surfaceBg,
      border: borderSoft,
      boxShadow: "none",
      backgroundImage: "none",
      transition: transitionFast,
      minWidth: 0,
      "&:hover": {
        borderColor: alpha(colors.primary[500], isDark ? 0.34 : 0.24),
        backgroundColor: isDark ? "#111827" : "#ffffff",
      },
    },

    cardCompact: {
      borderRadius: `${radius.lg}px`,
      p: { xs: 1.25, md: 1.5 },
      backgroundColor: surfaceBg,
      border: borderSoft,
      boxShadow: "none",
      backgroundImage: "none",
      transition: transitionFast,
      minWidth: 0,
    },

    subtleCard: {
      borderRadius: `${radius.lg}px`,
      p: { xs: 1.25, md: 1.5 },
      backgroundColor: surfaceBg,
      border: borderSoft,
      boxShadow: "none",
      backgroundImage: "none",
      transition: transitionFast,
      minWidth: 0,
    },

    iconBox: {
      width: 38,
      height: 38,
      borderRadius: `${radius.lg}px`,
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
      borderRadius: `${radius.md}px`,
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
      fontSize: { xs: "0.84rem", md: "0.9rem" },
      lineHeight: 1.25,
    },

    sectionSubtitle: {
      color: "text.secondary",
      fontSize: { xs: "0.68rem", md: "0.72rem" },
      mt: 0.25,
      fontWeight: 400,
      lineHeight: 1.45,
    },

    emptyText: {
      fontSize: "0.76rem",
      color: "text.secondary",
      fontWeight: 400,
      textAlign: "center",
    },
  };

  /* ------------------------------------------------------------------
     HRM DASHBOARD STYLES
     Usage: theme.hrmDashboard
  ------------------------------------------------------------------ */
  const hrmDashboard = {
    ...dashboardBase,

    heroCard: {
      mb: { xs: 1.75, md: 2.5 },
      p: { xs: 1.5, sm: 1.75, md: 2.25 },
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
      fontSize: { xs: "1.25rem", sm: "1.45rem", md: "1.75rem" },
      fontWeight: 500,
      letterSpacing: "-0.03em",
      color: "text.primary",
      lineHeight: 1.1,
    },

    heroSubtitle: {
      mt: 0.75,
      color: "text.secondary",
      maxWidth: 720,
      fontSize: { xs: "0.74rem", sm: "0.78rem", md: "0.84rem" },
      lineHeight: 1.55,
      fontWeight: 400,
    },

    statCard: {
      minHeight: { xs: 124, md: 136 },
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
      fontSize: { xs: "1.2rem", sm: "1.3rem", md: "1.5rem" },
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
      minHeight: { xs: 112, md: 124 },
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
      fontSize: "0.8rem",
      lineHeight: 1.25,
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
      height: { xs: 340, sm: 360, md: 400 },
      display: "flex",
      flexDirection: "column",
    },

    listCard: {
      height: { xs: 290, md: 310 },
      display: "flex",
      flexDirection: "column",
    },

    emptyIcon: {
      width: 38,
      height: 38,
      mx: "auto",
      mb: 1.25,
      borderRadius: `${radius.lg}px`,
      backgroundColor: alpha(isDark ? "#ffffff" : "#0f172a", 0.045),
      border: borderSoft,
    },

    futureInsightCard: {
      height: { xs: 290, md: 310 },
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
      mb: { xs: 1.75, md: 2.5 },
      p: { xs: 1.5, sm: 1.75, md: 2.25 },
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
      minWidth: { xs: "100%", sm: 138 },
      "& .MuiOutlinedInput-root, & .MuiSelect-select": {
        fontSize: "0.74rem",
        fontWeight: 400,
      },
      "& .MuiOutlinedInput-root": {
        borderRadius: `${radius.md}px`,
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
      borderRadius: `${radius.md}px`,
      backgroundColor: "rgba(255,255,255,0.1)",
      color: "#fff",
      transition: transitionFast,
      "&:hover": {
        backgroundColor: "rgba(255,255,255,0.16)",
      },
    },

    heroButton: {
      borderRadius: `${radius.md}px`,
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
      minHeight: { xs: 124, md: 132 },
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
      fontSize: { xs: "1.16rem", sm: "1.25rem", md: "1.45rem" },
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
      minHeight: { xs: 340, md: 380 },
      display: "flex",
      flexDirection: "column",
    },

    sideCard: {
      gridColumn: { xs: "span 1", lg: "span 4" },
      minHeight: { xs: 340, md: 380 },
      display: "flex",
      flexDirection: "column",
    },

    moduleCard: {
      gridColumn: { xs: "span 1", md: "span 1", lg: "span 4" },
      cursor: "pointer",
    },

    moduleTitle: {
      fontSize: "0.84rem",
      fontWeight: 500,
      color: "text.primary",
      letterSpacing: "-0.01em",
      lineHeight: 1.25,
    },

    moduleSubtitle: {
      fontSize: "0.7rem",
      color: "text.secondary",
      fontWeight: 400,
      mt: 0.15,
      lineHeight: 1.4,
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
      borderRadius: `${radius.lg}px`,
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
      lineHeight: 1.3,
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
      whiteSpace: "nowrap",
    },
  };

  /* ------------------------------------------------------------------
     TOPBAR STYLES
     Usage: theme.topbar
  ------------------------------------------------------------------ */
  const topbar = {
    root: {
      minHeight: { xs: 56, md: 64 },
      px: { xs: 1, sm: 1.25, md: 2 },
      py: { xs: 0.75, md: 1 },
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: { xs: 1, md: 1.5 },
      backgroundColor: "transparent",
    },

    searchWrap: {
      width: { xs: "100%", sm: 320, md: 380 },
      maxWidth: { xs: "100%", md: 420 },
      height: { xs: 36, md: 38 },
      display: "flex",
      alignItems: "center",
      borderRadius: `${radius.md}px`,
      backgroundColor: surfaceBg,
      border: borderSoft,
      boxShadow: "none",
      transition: transitionFast,
      minWidth: 0,
      "&:focus-within": {
        borderColor: alpha(colors.primary[500], 0.45),
        backgroundColor: surfaceBg,
      },
    },

    searchInput: {
      ml: 1.25,
      flex: 1,
      minWidth: 0,
      fontSize: "0.78rem",
      fontWeight: 400,
      color: "text.primary",
      "& input::placeholder": {
        color: colors.grey[500],
        opacity: 1,
      },
    },

    searchButton: {
      width: { xs: 34, md: 36 },
      height: { xs: 34, md: 36 },
      borderRadius: `${radius.md}px`,
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
      width: { xs: 34, md: 38 },
      height: { xs: 34, md: 38 },
      borderRadius: `${radius.md}px`,
      color: "text.secondary",
      transition: transitionFast,
      "&:hover": {
        color: "primary.main",
        backgroundColor: alpha(colors.primary[500], 0.08),
      },
    },

    popoverPaper: {
      mt: 1,
      borderRadius: `${radius.lg}px`,
      backgroundColor: elevatedBg,
      border: borderStrong,
      boxShadow: shadowPopup,
      backgroundImage: "none",
      overflow: "hidden",
    },

    searchPopoverPaper: {
      mt: 0.75,
      borderRadius: `${radius.lg}px`,
      backgroundColor: elevatedBg,
      border: borderStrong,
      boxShadow: shadowPopup,
      backgroundImage: "none",
      overflow: "hidden",
    },

    searchList: {
      maxHeight: { xs: 260, sm: 320 },
      overflowY: "auto",
      py: 0.75,
    },

    searchItem: {
      mx: 0.75,
      mb: 0.25,
      borderRadius: `${radius.md}px`,
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
      minWidth: { xs: 240, sm: 280 },
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
      borderRadius: `${radius.lg}px`,
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
      borderRadius: `${radius.md}px`,
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
      borderRadius: `${radius.md}px`,
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
  width: 284,
  collapsedWidth: 78,

  root: (collapsed, textVisible) => ({
    height: "100vh",
    display: "flex",
    flexDirection: "column",
    zIndex: 1000,
    width: collapsed ? 78 : 284,
    minWidth: collapsed ? 78 : 284,
    borderRight: borderSoft,
    backgroundColor: surfaceBg,
    transition: transitionWidth,
    overflow: "hidden",

    "& .ps-sidebar-root": {
      border: "none !important",
      backgroundColor: `${surfaceBg} !important`,
      height: "100%",
      width: "100% !important",
      minWidth: "100% !important",
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
      padding: collapsed ? "8px 0" : "10px 8px 10px 0",
    },

    "& .ps-menu-root": {
      width: "100%",
      paddingBottom: "16px",
    },

    "& .ps-menu-button": {
      minHeight: "38px !important",
      height: "38px !important",
      borderRadius: `${radius.md}px !important`,
      margin: collapsed ? "3px 10px !important" : "3px 8px !important",
      paddingRight: collapsed ? "0px !important" : "10px !important",
      paddingLeft: collapsed ? "0px !important" : "14px !important",
      color: `${isDark ? colors.grey[300] : colors.grey[300]} !important`,
      fontSize: "0.76rem !important",
      fontWeight: "400 !important",
      transition: transitionFast,
    },

    "& .ps-menu-button:hover": {
      backgroundColor: `${alpha(colors.primary[500], 0.075)} !important`,
      color: `${colors.primary[500]} !important`,
    },

    "& .ps-menuitem-root.ps-active > .ps-menu-button": {
      backgroundColor: `${alpha(colors.primary[500], 0.11)} !important`,
      color: `${colors.primary[500]} !important`,
      fontWeight: "500 !important",
    },

    "& .ps-submenu-root.ps-active > .ps-menu-button": {
      backgroundColor: `${alpha(colors.primary[500], 0.08)} !important`,
      color: `${colors.primary[500]} !important`,
      fontWeight: "500 !important",
    },

    "& .ps-menu-icon": {
      width: collapsed ? "100% !important" : "32px !important",
      minWidth: collapsed ? "100% !important" : "32px !important",
      marginRight: collapsed ? "0px !important" : "9px !important",
      display: "flex !important",
      alignItems: "center !important",
      justifyContent: collapsed ? "center !important" : "flex-start !important",
      color: "inherit !important",
    },

    "& .ps-menu-icon svg": {
      fontSize: "1.14rem !important",
      display: "block",
      flexShrink: 0,
    },

    "& .ps-menu-label": {
      display: collapsed ? "none !important" : "block !important",
      minWidth: 0,
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
    },

    "& .ps-submenu-expand-icon": {
      display: collapsed ? "none !important" : "flex !important",
      color: `${colors.grey[500]} !important`,
      marginRight: "6px !important",
    },

    "& .ps-submenu-content": {
      backgroundColor: "transparent !important",
      paddingLeft: collapsed ? "0px !important" : "8px !important",
      marginTop: "2px !important",
      marginBottom: "5px !important",
    },

    "& .ps-submenu-content .ps-menu-button": {
      minHeight: "34px !important",
      height: "34px !important",
      margin: "2px 8px !important",
      paddingLeft: collapsed ? "0px !important" : "12px !important",
      fontSize: "0.72rem !important",
      borderRadius: `${radius.sm}px !important`,
    },

    "& .ps-submenu-content .ps-menu-icon": {
      width: collapsed ? "100% !important" : "28px !important",
      minWidth: collapsed ? "100% !important" : "28px !important",
      marginRight: collapsed ? "0px !important" : "8px !important",
    },

    "& .ps-submenu-content .ps-menu-icon svg": {
      fontSize: "1.02rem !important",
    },

    "& .menu-text, & .logo-text": {
      display: textVisible && !collapsed ? "inline-block" : "none",
      whiteSpace: "nowrap",
      verticalAlign: "middle",
      opacity: textVisible && !collapsed ? 1 : 0,
      transition: "opacity 100ms ease",
      pointerEvents: textVisible && !collapsed ? "auto" : "none",
    },
  }),

  itemRoot: (active = false) => ({
    "& .ps-menu-button:hover": {
      backgroundColor: `${alpha(colors.primary[500], 0.075)} !important`,
      color: `${colors.primary[500]} !important`,
    },

    "&.ps-active > .ps-menu-button": {
      backgroundColor: `${alpha(colors.primary[500], 0.11)} !important`,
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
      backgroundColor: active
        ? `${alpha(colors.primary[500], 0.075)} !important`
        : "transparent !important",
    },

    "& > .ps-menu-button:hover": {
      backgroundColor: `${alpha(colors.primary[500], 0.075)} !important`,
      color: `${colors.primary[500]} !important`,
    },
  }),

  logoMenuItem: {
    margin: "4px 0 10px 0",
    color: isDark ? colors.grey[100] : colors.grey[100],
    backgroundColor: "transparent",
  },

  logoMenuRoot: {
    "& > .ps-menu-button": {
      height: "48px !important",
      minHeight: "48px !important",
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
    width: "100%",
    minWidth: 0,
  },

  brandMark: {
    width: 32,
    height: 32,
    borderRadius: `${radius.md}px`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    bgcolor: alpha(colors.primary[500], 0.11),
    color: colors.primary[500],
    border: `1px solid ${alpha(colors.primary[500], 0.18)}`,
    flexShrink: 0,
    fontWeight: 600,
    fontSize: "0.78rem",
  },

  logoText: {
    fontSize: "0.96rem",
    fontWeight: 600,
    letterSpacing: "-0.02em",
    color: "text.primary",
    ml: 1.15,
  },

  toggleButton: {
    width: 32,
    height: 32,
    borderRadius: `${radius.md}px`,
    color: "text.secondary",
    transition: transitionFast,
    flexShrink: 0,
    "&:hover": {
      color: "primary.main",
      backgroundColor: alpha(colors.primary[500], 0.075),
    },
  },

  profileWrap: (collapsed) => ({
    mb: collapsed ? 1 : 1.5,
    px: collapsed ? 0.75 : 1.25,
  }),

  profileExpanded: {
    textAlign: "left",
    px: 1.15,
    py: 1.15,
    mx: 0.5,
    borderRadius: `${radius.xl}px`,
    backgroundColor: isDark ? "#111827" : "#ffffff",
    border: borderSoft,
    display: "flex",
    alignItems: "center",
    gap: 1,
    minWidth: 0,
  },

  avatarLarge: {
    width: 38,
    height: 38,
    cursor: "pointer",
    fontSize: "0.82rem",
    fontWeight: 500,
    bgcolor: colors.primary[500],
    color: "#fff",
    flexShrink: 0,
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
    fontSize: "0.76rem",
    fontWeight: 500,
    color: "text.primary",
    display: "block",
    maxWidth: 176,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    lineHeight: 1.25,
  },

  userRole: {
    fontSize: "0.66rem",
    fontWeight: 400,
    color: "text.secondary",
    display: "block",
    maxWidth: 176,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    mt: 0.15,
  },

  menuWrap: {
    px: 0,
  },

  groupBlock: {
    mt: 0.75,
    mb: 0.25,
  },

  groupLabel: {
    display: "flex",
    alignItems: "center",
    gap: 0.75,
    px: 2.25,
    pt: 1.1,
    pb: 0.5,
    fontSize: "0.62rem",
    fontWeight: 600,
    letterSpacing: "0.075em",
    textTransform: "uppercase",
    color: "text.disabled",
    lineHeight: 1,
    userSelect: "none",
  },

  groupRule: {
    flex: 1,
    height: "1px",
    backgroundColor: alpha(colors.grey[500], isDark ? 0.14 : 0.1),
  },

  footer: {
    textAlign: "left",
    mx: 1,
    px: 1.25,
    py: 1.1,
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

/* ------------------------------------------------------------------
   TEAM DIRECTORY STYLES
   Usage: theme.team
------------------------------------------------------------------ */
const team = {
  shell: {
    minHeight: "100%",
    width: "100%",
    px: { xs: 1, sm: 1.5, md: 2, lg: 2.5 },
    py: { xs: 1, sm: 1.5, md: 2 },
    backgroundColor: appBg,
    backgroundImage: "none",
  },

  headerCard: {
    mb: 2,
    p: { xs: 1.5, md: 2 },
    borderRadius: `${radius.xl}px`,
    backgroundColor: surfaceBg,
    border: borderSoft,
    boxShadow: "none",
    backgroundImage: "none",
  },

  summaryGrid: {
    display: "grid",
    gridTemplateColumns: {
      xs: "1fr",
      sm: "repeat(2, minmax(0, 1fr))",
      lg: "repeat(3, minmax(0, 1fr))",
    },
    gap: { xs: 1.5, md: 2 },
    mb: 2.5,
  },

  summaryCard: (color) => ({
    borderRadius: `${radius.xl}px`,
    p: { xs: 1.5, md: 2 },
    minHeight: 116,
    backgroundColor: surfaceBg,
    border: borderSoft,
    borderLeftWidth: 3,
    borderLeftStyle: "solid",
    borderLeftColor: color,
    boxShadow: "none",
    backgroundImage: "none",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 1.5,
    transition: transitionFast,
    "&:hover": {
      borderColor: alpha(color, isDark ? 0.34 : 0.24),
      backgroundColor: isDark ? "#111827" : "#ffffff",
    },
  }),

  summaryTitle: {
    fontSize: "0.72rem",
    color: "text.secondary",
    fontWeight: 400,
    lineHeight: 1.35,
  },

  summaryValue: {
    mt: 0.5,
    fontSize: { xs: "1.35rem", md: "1.55rem" },
    fontWeight: 500,
    letterSpacing: "-0.025em",
    color: "text.primary",
    lineHeight: 1,
  },

  summaryIcon: (color) => ({
    width: { xs: 42, md: 48 },
    height: { xs: 42, md: 48 },
    borderRadius: `${radius.xl}px`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    backgroundColor: alpha(color, isDark ? 0.14 : 0.1),
    color,
    border: `1px solid ${alpha(color, isDark ? 0.22 : 0.16)}`,
    "& svg": {
      fontSize: "1.35rem",
    },
  }),

  tableWrapper: {
    borderRadius: `${radius.xl}px`,
    overflow: "hidden",
    backgroundColor: surfaceBg,
    border: borderSoft,
    boxShadow: "none",
    backgroundImage: "none",
  },

  actionBar: {
    px: { xs: 1.5, md: 2 },
    py: { xs: 1.5, md: 1.75 },
    borderBottom: borderSoft,
    backgroundColor: surfaceBg,
    display: "flex",
    alignItems: { xs: "flex-start", md: "center" },
    justifyContent: "space-between",
    gap: 1.5,
    flexDirection: { xs: "column", md: "row" },
  },

  tableTitle: {
    fontSize: "0.95rem",
    fontWeight: 500,
    color: "text.primary",
    letterSpacing: "-0.015em",
    lineHeight: 1.25,
  },

  tableSubtitle: {
    mt: 0.25,
    fontSize: "0.7rem",
    color: "text.secondary",
    fontWeight: 400,
  },

  actionStack: {
    display: "flex",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 1,
    width: { xs: "100%", md: "auto" },
  },

  primaryActionButton: {
    borderRadius: `${radius.md}px`,
    textTransform: "none",
    fontWeight: 500,
    fontSize: "0.74rem",
    boxShadow: "none",
    minHeight: 34,
  },

  secondaryActionButton: {
    borderRadius: `${radius.md}px`,
    textTransform: "none",
    fontWeight: 500,
    fontSize: "0.74rem",
    boxShadow: "none",
    minHeight: 34,
    borderColor: alpha(colors.grey[500], isDark ? 0.28 : 0.22),
    color: "text.primary",
    "&:hover": {
      borderColor: alpha(colors.primary[500], 0.35),
      backgroundColor: alpha(colors.primary[500], 0.055),
    },
  },

  gridViewport: {
    height: { xs: "62vh", md: "65vh" },
    width: "100%",
  },

  toolbar: {
    px: 1.5,
    py: 1,
    display: "flex",
    justifyContent: "space-between",
    borderBottom: borderSoft,
    backgroundColor: surfaceBg,
  },

  quickFilter: {
    width: { xs: "100%", sm: 320 },
    "& .MuiInputBase-root": {
      borderRadius: `${radius.md}px`,
      fontSize: "0.76rem",
    },
  },

  dataGrid: {
    border: "none",
    backgroundColor: surfaceBg,
    fontSize: "0.75rem",

    "& .MuiDataGrid-columnHeaders": {
      backgroundColor: subtleBg,
      borderBottom: borderSoft,
      minHeight: "38px !important",
      maxHeight: "38px !important",
    },

    "& .MuiDataGrid-columnHeaderTitle": {
      fontWeight: 500,
      color: isDark ? colors.grey[300] : colors.grey[500],
      textTransform: "uppercase",
      fontSize: "0.68rem",
      letterSpacing: "0.045em",
    },

    "& .MuiDataGrid-row": {
      minHeight: "42px !important",
      maxHeight: "42px !important",
      transition: transitionFast,
      "&:hover": {
        backgroundColor: alpha(colors.primary[500], isDark ? 0.05 : 0.035),
      },
    },

    "& .MuiDataGrid-cell": {
      borderBottom: borderSoft,
      display: "flex",
      alignItems: "center",
      fontSize: "0.75rem",
      color: "text.primary",
      "&:focus, &:focus-within": {
        outline: "none",
      },
    },

    "& .MuiDataGrid-footerContainer": {
      borderTop: borderSoft,
      backgroundColor: surfaceBg,
      minHeight: "40px !important",
    },

    "& .MuiDataGrid-columnSeparator": {
      display: "none",
    },
  },

  nameLink: {
    textDecoration: "none",
    color: "primary.main",
    fontWeight: 500,
    fontSize: "0.75rem",
    "&:hover": {
      textDecoration: "underline",
    },
  },

  statusChip: (active) => ({
    fontWeight: 500,
    fontSize: "0.64rem",
    borderRadius: "999px",
    height: 22,
    backgroundColor: active
      ? alpha(colors.status.success, isDark ? 0.16 : 0.1)
      : alpha(colors.status.error, isDark ? 0.16 : 0.1),
    color: active ? colors.status.success : colors.status.error,
  }),

  accessChip: (access) => {
    const accessColor =
      access === "admin"
        ? colors.status.warning
        : access === "manager"
        ? colors.status.success
        : colors.status.info;

    return {
      fontWeight: 500,
      fontSize: "0.64rem",
      borderRadius: "999px",
      height: 22,
      backgroundColor: alpha(accessColor, isDark ? 0.16 : 0.1),
      color: accessColor,
      "& .MuiChip-icon": {
        color: accessColor,
        fontSize: "0.95rem",
      },
    };
  },

  rowActionStack: {
    display: "flex",
    flexDirection: "row",
    gap: 0.5,
    alignItems: "center",
  },

  rowActionButton: (color) => ({
    width: 28,
    height: 28,
    borderRadius: `${radius.sm}px`,
    color,
    backgroundColor: alpha(color, isDark ? 0.14 : 0.1),
    "&:hover": {
      backgroundColor: alpha(color, isDark ? 0.22 : 0.16),
    },
  }),

  columnMenuPaper: {
    borderRadius: `${radius.xl}px`,
    minWidth: 240,
    maxHeight: 420,
    backgroundColor: elevatedBg,
    border: borderStrong,
    boxShadow: shadowPopup,
    backgroundImage: "none",
    mt: 1,
  },

  columnMenuHeader: {
    px: 2,
    py: 1.25,
  },

  columnMenuTitle: {
    fontSize: "0.68rem",
    fontWeight: 500,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    color: "text.secondary",
  },

  columnMenuItem: {
    py: 0.4,
    mx: 0.75,
    borderRadius: `${radius.md}px`,
  },

  columnCheckbox: {
    color: colors.primary[500],
    "&.Mui-checked": {
      color: colors.primary[500],
    },
  },

  columnLabel: {
    fontSize: "0.74rem",
    fontWeight: 400,
    color: "text.primary",
  },

  errorAlert: {
    mb: 2,
  },
};

/* ------------------------------------------------------------------
   EMPLOYEE PROFILE STYLES
   Usage: theme.employeeProfile
------------------------------------------------------------------ */
const employeeProfile = {
  shell: {
    minHeight: "100%",
    width: "100%",
    px: { xs: 1, sm: 1.5, md: 2, lg: 2.5 },
    py: { xs: 1, sm: 1.5, md: 2 },
    backgroundColor: appBg,
    backgroundImage: "none",
  },

  headerCard: {
    mb: 2,
    p: { xs: 1.5, md: 2 },
    borderRadius: `${radius.xl}px`,
    backgroundColor: surfaceBg,
    border: borderSoft,
    boxShadow: "none",
    backgroundImage: "none",
  },

  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: { xs: "flex-start", md: "center" },
    flexDirection: { xs: "column", md: "row" },
    gap: 1.5,
  },

  actionStack: {
    display: "flex",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 1,
  },

  primaryButton: {
    borderRadius: `${radius.md}px`,
    textTransform: "none",
    fontWeight: 500,
    fontSize: "0.74rem",
    minHeight: 34,
    boxShadow: "none",
  },

  secondaryButton: {
    borderRadius: `${radius.md}px`,
    textTransform: "none",
    fontWeight: 500,
    fontSize: "0.74rem",
    minHeight: 34,
    boxShadow: "none",
    borderColor: alpha(colors.grey[500], isDark ? 0.28 : 0.22),
    color: "text.primary",
    "&:hover": {
      borderColor: alpha(colors.primary[500], 0.35),
      backgroundColor: alpha(colors.primary[500], 0.055),
    },
  },

  sectionCard: {
    p: { xs: 1.5, md: 2 },
    mb: 2,
    borderRadius: `${radius.xl}px`,
    backgroundColor: surfaceBg,
    border: borderSoft,
    boxShadow: "none",
    backgroundImage: "none",
  },

  sectionHeader: {
    display: "flex",
    alignItems: "center",
    gap: 1,
    mb: 1.75,
  },

  sectionIcon: (color) => ({
    width: 34,
    height: 34,
    borderRadius: `${radius.md}px`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    color,
    backgroundColor: alpha(color, isDark ? 0.14 : 0.1),
    border: `1px solid ${alpha(color, isDark ? 0.22 : 0.16)}`,
    "& svg": {
      fontSize: "1.1rem",
    },
  }),

  sectionTitle: {
    fontSize: "0.9rem",
    fontWeight: 500,
    color: "text.primary",
    letterSpacing: "-0.015em",
    lineHeight: 1.25,
  },

  detailGrid: {
    display: "grid",
    gridTemplateColumns: {
      xs: "1fr",
      sm: "repeat(2, minmax(0, 1fr))",
      lg: "repeat(3, minmax(0, 1fr))",
    },
    gap: { xs: 1.25, md: 1.5 },
  },

  detailItem: {
    minWidth: 0,
    p: 1.25,
    borderRadius: `${radius.lg}px`,
    backgroundColor: isDark ? "#111827" : "#f8fafc",
    border: borderSoft,
  },

  detailLabel: {
    mb: 0.45,
    fontSize: "0.68rem",
    color: "text.secondary",
    fontWeight: 400,
    lineHeight: 1.3,
  },

  detailValue: {
    fontSize: "0.78rem",
    color: "text.primary",
    fontWeight: 500,
    lineHeight: 1.45,
    overflowWrap: "anywhere",
  },

  leaveDividerBlock: {
    gridColumn: "1 / -1",
    mt: 1,
  },

  leaveSubTitle: {
    mt: 1.5,
    fontSize: "0.82rem",
    color: "text.primary",
    fontWeight: 500,
  },

  leaveListWrap: {
    gridColumn: "1 / -1",
    width: "100%",
  },

  leaveListItem: {
    py: 0.85,
    px: 1,
    borderRadius: `${radius.lg}px`,
    border: borderSoft,
    mb: 0.75,
    backgroundColor: isDark ? "#111827" : "#ffffff",
    "&:hover": {
      backgroundColor: alpha(colors.primary[500], isDark ? 0.055 : 0.035),
      borderColor: alpha(colors.primary[500], isDark ? 0.24 : 0.18),
    },
  },

  leaveStatusIconWrap: {
    minWidth: 34,
  },

  leavePrimary: {
    fontSize: "0.76rem",
    fontWeight: 500,
    color: "text.primary",
    lineHeight: 1.35,
  },

  leaveSecondary: {
    fontSize: "0.68rem",
    color: "text.secondary",
    fontWeight: 400,
    lineHeight: 1.45,
  },

  emptyText: {
    gridColumn: "1 / -1",
    fontSize: "0.76rem",
    color: "text.secondary",
    fontWeight: 400,
  },

  statusChip: (status) => {
    const normalized = String(status || "").toLowerCase();

    const chipColor =
      normalized === "active"
        ? colors.status.success
        : normalized === "inactive" ||
          normalized === "suspended" ||
          normalized === "terminated"
        ? colors.status.error
        : colors.status.warning;

    return {
      height: 22,
      borderRadius: "999px",
      fontWeight: 500,
      fontSize: "0.64rem",
      textTransform: "capitalize",
      backgroundColor: alpha(chipColor, isDark ? 0.16 : 0.1),
      color: chipColor,
    };
  },

  alert: {
    mb: 2,
  },

  loadingCard: {
    p: 4,
    borderRadius: `${radius.xl}px`,
    backgroundColor: surfaceBg,
    border: borderSoft,
    boxShadow: "none",
    textAlign: "center",
  },
};

  return {
    palette: {
      mode,
      primary: {
        main: colors.primary[500],
        light: colors.primary[400],
        dark: colors.primary[600],
        contrastText: "#ffffff",
      },
      secondary: {
        main: colors.primary[400],
        light: colors.primary[300],
        dark: colors.primary[600],
        contrastText: "#ffffff",
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
      divider: borderSoftColor,
      action: {
        hover: alpha(colors.primary[500], 0.045),
        selected: alpha(colors.primary[500], 0.085),
        disabled: alpha(colors.grey[500], 0.35),
        disabledBackground: alpha(colors.grey[500], 0.1),
      },
    },

    shape: {
      borderRadius: radius.md,
    },

    custom: {
      colors,
      isDark,
      appBg,
      surfaceBg,
      elevatedBg,
      subtleBg,
      borderSoft,
      borderStrong,
      shadowPopup,
      transitionFast,
      radius,
      layout,
    },

    layout,
    hrmDashboard,
    dashboard,
    topbar,
    sidebar,
    team,
    employeeProfile,

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
        lineHeight: 1.15,
      },
      h2: {
        fontSize: "1.25rem",
        fontWeight: 500,
        letterSpacing: "-0.02em",
        lineHeight: 1.2,
      },
      h3: {
        fontSize: "1.1rem",
        fontWeight: 500,
        letterSpacing: "-0.015em",
        lineHeight: 1.25,
      },
      h4: {
        fontSize: "0.98rem",
        fontWeight: 500,
        letterSpacing: "-0.01em",
        lineHeight: 1.3,
      },
      h5: {
        fontSize: "0.88rem",
        fontWeight: 500,
        lineHeight: 1.35,
      },
      h6: {
        fontSize: "0.78rem",
        fontWeight: 500,
        lineHeight: 1.35,
      },
      subtitle1: {
        fontSize: "0.8rem",
        fontWeight: 400,
        lineHeight: 1.5,
        color: isDark ? colors.grey[300] : colors.grey[500],
      },
      subtitle2: {
        fontSize: "0.72rem",
        fontWeight: 400,
        lineHeight: 1.45,
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
        lineHeight: 1.4,
        color: isDark ? colors.grey[400] : colors.grey[500],
      },
    },

    /* ------------------------------------------------------------------
       COMPONENT DEFAULTS - RESPONSIVE + FAST MODERN UI
    ------------------------------------------------------------------ */
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          html: {
            backgroundColor: appBg,
            height: "100%",
          },
          body: {
            minHeight: "100%",
            backgroundColor: appBg,
            WebkitFontSmoothing: "antialiased",
            MozOsxFontSmoothing: "grayscale",
            textRendering: "optimizeLegibility",
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
            "&::-webkit-scrollbar-thumb:hover, & *::-webkit-scrollbar-thumb:hover": {
              backgroundColor: alpha(colors.grey[500], 0.42),
            },
          },
          "#root": {
            minHeight: "100%",
            backgroundColor: appBg,
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
            borderRadius: `${radius.md}px`,
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
            borderRadius: `${radius.md}px`,
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
            borderRadius: `${radius.lg}px`,
            backgroundColor: elevatedBg,
            border: borderStrong,
            boxShadow: shadowPopup,
            backgroundImage: "none",
            margin: "16px",
            width: "calc(100% - 32px)",
          },
        },
      },

      MuiMenu: {
        styleOverrides: {
          paper: {
            marginTop: "8px",
            borderRadius: `${radius.md}px`,
            backgroundColor: elevatedBg,
            border: borderStrong,
            boxShadow: shadowPopup,
            backgroundImage: "none",
          },
          list: {
            paddingTop: 6,
            paddingBottom: 6,
          },
        },
      },

      MuiPopover: {
        styleOverrides: {
          paper: {
            borderRadius: `${radius.lg}px`,
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
            borderRadius: `${radius.sm}px`,
            padding: "6px 14px",
            transition: transitionFast,
            textTransform: "none",
            minHeight: 34,
          },
          sizeSmall: {
            minHeight: 30,
            padding: "4px 10px",
            fontSize: "0.7rem",
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
            borderRadius: `${radius.sm}px`,
            transition: transitionFast,
          },
          sizeSmall: {
            width: 30,
            height: 30,
          },
        },
      },

      MuiTextField: {
        defaultProps: {
          variant: "outlined",
          size: "small",
        },
      },

      MuiFormControl: {
        defaultProps: {
          size: "small",
        },
      },

      MuiSelect: {
        defaultProps: {
          size: "small",
        },
      },

      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: `${radius.sm}px`,
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

      MuiInputBase: {
        styleOverrides: {
          root: {
            fontSize: "0.8rem",
          },
          input: {
            "&::placeholder": {
              opacity: 1,
              color: colors.grey[500],
            },
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

      MuiMenuItem: {
        styleOverrides: {
          root: {
            fontSize: "0.76rem",
            minHeight: 34,
            borderRadius: `${radius.sm}px`,
            marginLeft: 6,
            marginRight: 6,
            transition: transitionFast,
            "&:hover": {
              backgroundColor: alpha(colors.primary[500], 0.08),
            },
            "&.Mui-selected": {
              backgroundColor: alpha(colors.primary[500], 0.1),
              "&:hover": {
                backgroundColor: alpha(colors.primary[500], 0.13),
              },
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
            padding: "10px 14px",
          },
          head: {
            fontSize: "0.72rem",
            fontWeight: 500,
            color: isDark ? colors.grey[300] : colors.grey[500],
            backgroundColor: subtleBg,
          },
        },
      },

      MuiTableRow: {
        styleOverrides: {
          root: {
            transition: transitionFast,
            "&:hover": {
              backgroundColor: alpha(colors.primary[500], 0.025),
            },
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
          toolbarContainer: {
            padding: "8px",
          },
        },
      },

      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: "999px",
            fontWeight: 400,
            fontSize: "0.68rem",
            height: "22px",
          },
          sizeSmall: {
            height: "20px",
            fontSize: "0.64rem",
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
            borderRadius: `${radius.md}px`,
            fontWeight: 400,
            fontSize: "0.78rem",
            alignItems: "center",
            border: borderSoft,
          },
          message: {
            padding: "6px 0",
          },
        },
      },

      MuiListItemButton: {
        styleOverrides: {
          root: {
            borderRadius: `${radius.md}px`,
            transition: transitionFast,
            "&:hover": {
              backgroundColor: alpha(colors.primary[500], 0.08),
            },
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
            borderRadius: `${radius.sm}px`,
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
            borderRadius: `${radius.sm}px`,
          },
        },
      },

      MuiAvatar: {
        styleOverrides: {
          root: {
            fontWeight: 500,
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