// src/theme.js
import { createContext, useEffect, useMemo, useState } from "react";
import { createTheme, alpha } from "@mui/material/styles";

/* ------------------------------------------------------------------
   COLOR TOKENS
   Backward-compatible with older components that still use:
   colors.greenAccent[500], colors.blueAccent[400], etc.
------------------------------------------------------------------ */
export const tokens = (mode = "light") => {
  const isDark = mode === "dark";

  const base = isDark
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
      };

  return {
    ...base,

    greenAccent: {
      100: "#d1fae5",
      200: "#a7f3d0",
      300: "#6ee7b7",
      400: "#34d399",
      500: base.status.success,
      600: "#059669",
      700: "#047857",
      800: "#065f46",
      900: "#064e3b",
    },

    redAccent: {
      100: "#ffe4e6",
      200: "#fecdd3",
      300: "#fda4af",
      400: "#fb7185",
      500: base.status.error,
      600: "#e11d48",
      700: "#be123c",
      800: "#9f1239",
      900: "#881337",
    },

    blueAccent: {
      100: "#dbeafe",
      200: "#bfdbfe",
      300: "#93c5fd",
      400: "#60a5fa",
      500: base.status.info,
      600: "#2563eb",
      700: "#1d4ed8",
      800: "#1e40af",
      900: "#1e3a8a",
    },

    yellowAccent: {
      100: "#fef3c7",
      200: "#fde68a",
      300: "#fcd34d",
      400: "#fbbf24",
      500: base.status.warning,
      600: "#d97706",
      700: "#b45309",
      800: "#92400e",
      900: "#78350f",
    },

    orangeAccent: {
      100: "#ffedd5",
      200: "#fed7aa",
      300: "#fdba74",
      400: "#fb923c",
      500: "#f97316",
      600: "#ea580c",
      700: "#c2410c",
      800: "#9a3412",
      900: "#7c2d12",
    },
  };
};

/* ------------------------------------------------------------------
   SAFE HELPERS
------------------------------------------------------------------ */
const isMuiThemeObject = (value) =>
  value &&
  typeof value === "object" &&
  value.palette &&
  value.breakpoints;

const isCssColor = (value) =>
  typeof value === "string" && value.trim().length > 0;

const safeCssColor = (color, fallback = "#6366f1") =>
  isCssColor(color) ? color : fallback;

/**
 * Creates styles that work BOTH ways:
 * 1. sx={{ ...styles.metricCard }}
 * 2. sx={styles.metricCard(color)}
 * 3. sx={styles.metricCard}  // MUI will call it with theme; returns base style safely.
 */
const createCallableSx = (baseStyle = {}, callback = () => ({})) => {
  const fn = (...args) => {
    const firstArg = args[0];

    if (isMuiThemeObject(firstArg)) {
      return baseStyle;
    }

    return {
      ...baseStyle,
      ...callback(...args),
    };
  };

  return Object.assign(fn, baseStyle);
};

const createAccentVars = (color, isDark = false, fallback = "#6366f1") => {
  const safeColor = safeCssColor(color, fallback);

  return {
    "--accent": safeColor,
    "--accent-bg": alpha(safeColor, isDark ? 0.14 : 0.1),
    "--accent-border": alpha(safeColor, isDark ? 0.24 : 0.16),
    "--accent-border-strong": alpha(safeColor, isDark ? 0.38 : 0.3),
  };
};

export const getAccentVars = (color, fallback = "#6366f1") =>
  createAccentVars(color, false, fallback);

/* ------------------------------------------------------------------
   MASTER THEME SETTINGS
------------------------------------------------------------------ */
export const themeSettings = (mode = "light") => {
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

  const accentVars = (color) => createAccentVars(color, isDark);

  const makeCard = (overrides = {}) => ({
    borderRadius: `${radius.xl}px`,
    backgroundColor: surfaceBg,
    border: borderSoft,
    boxShadow: "none",
    backgroundImage: "none",
    minWidth: 0,
    transition: transitionFast,
    ...overrides,
  });

  const makeButton = (overrides = {}) => ({
    borderRadius: `${radius.md}px`,
    textTransform: "none",
    fontWeight: 500,
    fontSize: "0.74rem",
    minHeight: 34,
    boxShadow: "none",
    ...overrides,
  });

  const makeIconBox = (size = 38, iconSize = 21, radiusKey = "lg") => ({
    width: size,
    height: size,
    borderRadius: `${radius[radiusKey]}px`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    backgroundColor: "var(--accent-bg)",
    color: "var(--accent)",
    border: "1px solid var(--accent-border)",
    "& svg": {
      fontSize: iconSize,
    },
  });

  const coloredIconBox = (color, size = 38, iconSize = 21, radiusKey = "lg") => {
    const safeColor = safeCssColor(color, colors.primary[500]);

    return {
      width: size,
      height: size,
      borderRadius: `${radius[radiusKey]}px`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
      backgroundColor: alpha(safeColor, isDark ? 0.14 : 0.1),
      color: safeColor,
      border: `1px solid ${alpha(safeColor, isDark ? 0.24 : 0.16)}`,
      "& svg": {
        fontSize: iconSize,
      },
    };
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

  const dashboardBase = {
    shell: layout.page,

    card: makeCard({
      p: { xs: 1.25, sm: 1.5, md: 2 },
      "&:hover": {
        borderColor: alpha(colors.primary[500], isDark ? 0.34 : 0.24),
        backgroundColor: isDark ? "#111827" : "#ffffff",
      },
    }),

    cardCompact: makeCard({
      borderRadius: `${radius.lg}px`,
      p: { xs: 1.25, md: 1.5 },
    }),

    subtleCard: makeCard({
      borderRadius: `${radius.lg}px`,
      p: { xs: 1.25, md: 1.5 },
    }),

    // Plain sx objects. Do NOT make these callable.
    // Components pass them directly to sx, and MUI calls sx functions with theme.
    iconBox: makeIconBox(38, 21, "lg"),

    iconBoxSmall: makeIconBox(34, 18, "md"),

    coloredIconBox,

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
     MAIN DASHBOARD
  ------------------------------------------------------------------ */
  const dashboard = {
    ...dashboardBase,

    heroCard: makeCard({
      mb: { xs: 1.75, md: 2.5 },
      p: { xs: 1.5, sm: 1.75, md: 2.25 },
      color: "#fff",
      position: "relative",
      overflow: "hidden",
      backgroundColor: colors.primary[700],
      backgroundImage: `linear-gradient(135deg, ${colors.primary[600]} 0%, ${colors.primary[800]} 100%)`,
      border: `1px solid ${alpha(colors.primary[400], 0.24)}`,
    }),

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
      ...makeButton({
        px: 1.75,
        py: 0.75,
        backgroundColor: "rgba(255,255,255,0.16)",
        color: "#fff",
        "&:hover": {
          backgroundColor: "rgba(255,255,255,0.24)",
          boxShadow: "none",
        },
      }),
    },

    metricCard: createCallableSx(
      {
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
      (color) => {
        const safeColor = safeCssColor(color, colors.primary[500]);

        return {
          borderLeftColor: safeColor,
          backgroundImage: `linear-gradient(135deg, ${alpha(
            safeColor,
            isDark ? 0.075 : 0.045
          )}, transparent 56%)`,
          "&:hover": {
            borderColor: alpha(safeColor, isDark ? 0.32 : 0.24),
          },
        };
      }
    ),

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
     HRM DASHBOARD
  ------------------------------------------------------------------ */
  const hrmDashboard = {
    ...dashboardBase,

    heroCard: makeCard({
      mb: { xs: 1.75, md: 2.5 },
      p: { xs: 1.5, sm: 1.75, md: 2.25 },
      position: "relative",
      overflow: "hidden",
      backgroundImage: isDark
        ? `linear-gradient(135deg, ${alpha(colors.primary[500], 0.12)}, transparent 62%)`
        : `linear-gradient(135deg, ${alpha(colors.primary[500], 0.075)}, transparent 62%)`,
    }),

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

    statCard: createCallableSx(
      {
        minHeight: { xs: 124, md: 136 },
        position: "relative",
        overflow: "hidden",
        borderLeftWidth: 3,
        borderLeftStyle: "solid",
        borderLeftColor: "var(--accent)",
        "&:hover": {
          borderColor: "var(--accent-border-strong)",
        },
      },
      (color) => {
        const safeColor = safeCssColor(color, colors.primary[500]);

        return {
          borderLeftColor: safeColor,
          backgroundImage: `linear-gradient(135deg, ${alpha(
            safeColor,
            isDark ? 0.07 : 0.04
          )}, transparent 58%)`,
          "&:hover": {
            borderColor: alpha(safeColor, isDark ? 0.36 : 0.28),
          },
        };
      }
    ),

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

    navCard: createCallableSx(
      {
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
      },
      (color, disabled = false) => {
        const safeColor = safeCssColor(color, colors.primary[500]);

        return {
          borderLeftColor: safeColor,
          opacity: disabled ? 0.58 : 1,
          cursor: disabled ? "not-allowed" : "pointer",
        };
      }
    ),

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

    navAction: createCallableSx(
      {
        fontSize: "0.7rem",
        color: "var(--accent)",
        fontWeight: 400,
      },
      (color, disabled = false) => ({
        color: disabled ? "text.disabled" : safeCssColor(color, colors.primary[500]),
      })
    ),

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
        ? `linear-gradient(135deg, ${alpha(colors.primary[500], 0.08)}, transparent 62%)`
        : `linear-gradient(135deg, ${alpha(colors.primary[500], 0.045)}, transparent 62%)`,
    },
  };

  /* ------------------------------------------------------------------
     TOPBAR
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
     SIDEBAR
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
     TEAM DIRECTORY
  ------------------------------------------------------------------ */
  const team = {
    shell: layout.page,

    headerCard: makeCard({
      mb: 2,
      p: { xs: 1.5, md: 2 },
    }),

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

    summaryCard: (color = colors.primary[500]) => {
      const safeColor = safeCssColor(color, colors.primary[500]);

      return makeCard({
        p: { xs: 1.5, md: 2 },
        minHeight: 116,
        borderLeftWidth: 3,
        borderLeftStyle: "solid",
        borderLeftColor: safeColor,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 1.5,
        "&:hover": {
          borderColor: alpha(safeColor, isDark ? 0.34 : 0.24),
          backgroundColor: isDark ? "#111827" : "#ffffff",
        },
      });
    },

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

    summaryIcon: (color = colors.primary[500]) =>
      coloredIconBox(color, 48, "1.35rem", "xl"),

    tableWrapper: makeCard({
      borderRadius: `${radius.xl}px`,
      overflow: "hidden",
    }),

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

    primaryActionButton: makeButton(),

    secondaryActionButton: makeButton({
      borderColor: alpha(colors.grey[500], isDark ? 0.28 : 0.22),
      color: "text.primary",
      "&:hover": {
        borderColor: alpha(colors.primary[500], 0.35),
        backgroundColor: alpha(colors.primary[500], 0.055),
      },
    }),

    gridViewport: {
      height: { xs: "62vh", md: "65vh" },
      width: "100%",
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

    rowActionButton: (color = colors.primary[500]) => {
      const safeColor = safeCssColor(color, colors.primary[500]);

      return {
        width: 28,
        height: 28,
        borderRadius: `${radius.sm}px`,
        color: safeColor,
        backgroundColor: alpha(safeColor, isDark ? 0.14 : 0.1),
        "&:hover": {
          backgroundColor: alpha(safeColor, isDark ? 0.22 : 0.16),
        },
      };
    },

    errorAlert: {
      mb: 2,
    },
  };

  /* ------------------------------------------------------------------
     EMPLOYEE PROFILE
  ------------------------------------------------------------------ */
  const employeeProfile = {
    shell: layout.page,

    headerCard: makeCard({
      mb: 2,
      p: { xs: 1.5, md: 2 },
    }),

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

    primaryButton: makeButton(),

    secondaryButton: makeButton({
      borderColor: alpha(colors.grey[500], isDark ? 0.28 : 0.22),
      color: "text.primary",
      "&:hover": {
        borderColor: alpha(colors.primary[500], 0.35),
        backgroundColor: alpha(colors.primary[500], 0.055),
      },
    }),

    sectionCard: makeCard({
      p: { xs: 1.5, md: 2 },
      mb: 2,
    }),

    sectionHeader: {
      display: "flex",
      alignItems: "center",
      gap: 1,
      mb: 1.75,
    },

    sectionIcon: (color = colors.primary[500]) =>
      coloredIconBox(color, 34, "1.1rem", "md"),

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

  /* ------------------------------------------------------------------
     ADD EMPLOYEE
  ------------------------------------------------------------------ */
  const addEmployee = {
    shell: layout.page,

    headerCard: makeCard({
      mb: 2,
      p: { xs: 1.5, md: 2 },
    }),

    sectionCard: makeCard({
      p: { xs: 1.5, md: 2 },
      mb: 2,
    }),

    sectionHeader: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 1,
      mb: 2,
      pb: 1,
      borderBottom: borderSoft,
    },

    sectionTitleWrap: {
      display: "flex",
      alignItems: "center",
      gap: 1,
      minWidth: 0,
    },

    sectionIcon: employeeProfile.sectionIcon,

    sectionTitle: employeeProfile.sectionTitle,

    sectionSubtitle: {
      mt: 0.25,
      fontSize: "0.68rem",
      fontWeight: 400,
      color: "text.secondary",
      lineHeight: 1.45,
    },

    formGrid: {
      display: "grid",
      gridTemplateColumns: {
        xs: "1fr",
        sm: "repeat(2, minmax(0, 1fr))",
      },
      gap: { xs: 1.5, md: 2 },
    },

    fullWidthField: {
      gridColumn: "1 / -1",
    },

    textField: {
      "& .MuiOutlinedInput-root": {
        backgroundColor: isDark ? "#020617" : "#f8fafc",
      },
    },

    helperText: {
      fontSize: "0.68rem",
    },

    alert: {
      mb: 2,
    },

    loadingCard: {
      minHeight: "70vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: `${radius.xl}px`,
      backgroundColor: surfaceBg,
      border: borderSoft,
      boxShadow: "none",
      textAlign: "center",
    },

    actionFooter: {
      mt: 2,
      p: { xs: 1.5, md: 2 },
      borderRadius: `${radius.xl}px`,
      backgroundColor: surfaceBg,
      border: borderSoft,
      boxShadow: "none",
      display: "flex",
      alignItems: { xs: "stretch", sm: "center" },
      justifyContent: "space-between",
      flexDirection: { xs: "column", sm: "row" },
      gap: 1.25,
    },

    footerHint: {
      fontSize: "0.72rem",
      color: "text.secondary",
      fontWeight: 400,
    },

    actionStack: {
      display: "flex",
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 1,
      justifyContent: { xs: "flex-start", sm: "flex-end" },
    },

    primaryButton: makeButton(),

    secondaryButton: makeButton({
      borderColor: alpha(colors.grey[500], isDark ? 0.28 : 0.22),
      color: "text.primary",
      "&:hover": {
        borderColor: alpha(colors.primary[500], 0.35),
        backgroundColor: alpha(colors.primary[500], 0.055),
      },
    }),

    iconButton: {
      width: 34,
      height: 34,
      borderRadius: `${radius.md}px`,
      color: "text.secondary",
      "&:hover": {
        color: "primary.main",
        backgroundColor: alpha(colors.primary[500], 0.08),
      },
    },
  };

  /* ------------------------------------------------------------------
     ACCOUNTS / FINANCE DASHBOARD
  ------------------------------------------------------------------ */
  const accountsDashboard = {
    shell: layout.page,

    loadingCard: {
      minHeight: "70vh",
      borderRadius: `${radius.xl}px`,
      backgroundColor: surfaceBg,
      border: borderSoft,
      boxShadow: "none",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      textAlign: "center",
    },

    card: makeCard({
      p: { xs: 1.5, md: 2 },
      height: "100%",
      display: "flex",
      flexDirection: "column",
      "&:hover": {
        borderColor: alpha(colors.primary[500], isDark ? 0.3 : 0.22),
        backgroundColor: isDark ? "#111827" : "#ffffff",
      },
    }),

    heroCard: makeCard({
      mb: 2.5,
      p: { xs: 1.75, md: 2.25 },
      color: "#fff",
      position: "relative",
      overflow: "hidden",
      backgroundColor: colors.primary[700],
      backgroundImage: `linear-gradient(135deg, ${colors.primary[600]} 0%, ${colors.primary[800]} 100%)`,
      border: `1px solid ${alpha(colors.primary[400], 0.24)}`,
    }),

    heroOverlay: {
      position: "absolute",
      inset: 0,
      opacity: 0.08,
      backgroundImage:
        "radial-gradient(circle at 15% 15%, #fff 0, transparent 20%), radial-gradient(circle at 85% 25%, #fff 0, transparent 18%)",
      pointerEvents: "none",
    },

    heroChip: dashboard.heroChip,

    heroTitle: {
      color: "#fff",
      fontSize: { xs: "1.35rem", sm: "1.55rem", md: "1.85rem" },
      fontWeight: 500,
      letterSpacing: "-0.035em",
      lineHeight: 1.08,
    },

    heroSubtitle: {
      mt: 0.85,
      maxWidth: 820,
      color: "rgba(255,255,255,0.74)",
      fontSize: { xs: "0.76rem", md: "0.84rem" },
      lineHeight: 1.6,
      fontWeight: 400,
    },

    heroIconButton: dashboard.heroIconButton,

    actionBar: {
      display: "flex",
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 1,
      mb: 2.5,
    },

    primaryActionButton: makeButton(),

    secondaryActionButton: makeButton({
      borderColor: alpha(colors.grey[500], isDark ? 0.28 : 0.22),
      color: "text.primary",
      "&:hover": {
        borderColor: alpha(colors.primary[500], 0.35),
        backgroundColor: alpha(colors.primary[500], 0.055),
      },
    }),

    alertStack: {
      mb: 2.5,
    },

    kpiGrid: {
      display: "grid",
      gridTemplateColumns: {
        xs: "1fr",
        sm: "repeat(2, minmax(0, 1fr))",
        xl: "repeat(4, minmax(0, 1fr))",
      },
      gap: { xs: 1.5, md: 2 },
      mb: 2.5,
    },

    kpiCard: createCallableSx(
      {
        minHeight: { xs: 124, md: 132 },
        borderLeftWidth: 3,
        borderLeftStyle: "solid",
        borderLeftColor: "var(--accent)",
      },
      (color) => ({
        borderLeftColor: safeCssColor(color, colors.primary[500]),
      })
    ),

    iconBox: makeIconBox(42, "1.2rem", "lg"),

    iconBoxSmall: makeIconBox(34, "1rem", "md"),

    kpiValue: {
      fontSize: { xs: "1.15rem", md: "1.35rem" },
      fontWeight: 500,
      color: "text.primary",
      letterSpacing: "-0.025em",
      lineHeight: 1.15,
    },

    kpiLabel: {
      mt: 0.4,
      fontSize: "0.72rem",
      color: "text.secondary",
      fontWeight: 400,
    },

    growthChip: {
      height: 22,
      borderRadius: "999px",
      fontSize: "0.64rem",
      fontWeight: 500,
      "& .MuiChip-icon": {
        fontSize: "0.95rem",
      },
    },

    moduleGrid: {
      display: "grid",
      gridTemplateColumns: {
        xs: "1fr",
        sm: "repeat(2, minmax(0, 1fr))",
        lg: "repeat(3, minmax(0, 1fr))",
        xl: "repeat(4, minmax(0, 1fr))",
      },
      gap: { xs: 1.5, md: 2 },
      mb: 2.5,
    },

    moduleCard: {
      minHeight: 132,
      cursor: "pointer",
      borderLeftWidth: 3,
      borderLeftStyle: "solid",
      borderLeftColor: "var(--accent)",
    },

    moduleTitle: {
      fontSize: "0.82rem",
      fontWeight: 500,
      color: "text.primary",
      letterSpacing: "-0.01em",
      lineHeight: 1.25,
    },

    moduleSubtitle: {
      mt: 0.25,
      fontSize: "0.7rem",
      fontWeight: 400,
      color: "text.secondary",
      lineHeight: 1.45,
    },

    moduleMeta: {
      mt: "auto",
      pt: 1.25,
      fontSize: "0.68rem",
      color: "text.disabled",
      fontWeight: 400,
    },

    contentGrid: layout.contentGrid,

    chartCard: {
      gridColumn: { xs: "span 1", lg: "span 8" },
      minHeight: { xs: 340, md: 400 },
    },

    ratioCard: {
      gridColumn: { xs: "span 1", lg: "span 4" },
      minHeight: { xs: 340, md: 400 },
    },

    halfCard: {
      gridColumn: { xs: "span 1", lg: "span 6" },
    },

    fullWidthCard: {
      gridColumn: "1 / -1",
    },

    sectionTitle: dashboardBase.sectionTitle,

    sectionSubtitle: dashboardBase.sectionSubtitle,

    chartBox: {
      flex: "1 1 auto",
      minHeight: 280,
      mt: 1.5,
    },

    emptyBox: {
      height: "100%",
      minHeight: 180,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      textAlign: "center",
      color: "text.secondary",
      fontSize: "0.76rem",
    },

    ratioRow: {
      mb: 2.5,
    },

    ratioLabel: {
      fontSize: "0.76rem",
      fontWeight: 400,
      color: "text.secondary",
    },

    ratioValue: {
      fontSize: "0.82rem",
      fontWeight: 500,
    },

    ratioProgress: (color = colors.primary[500]) => {
      const safeColor = safeCssColor(color, colors.primary[500]);

      return {
        height: 6,
        borderRadius: 3,
        backgroundColor: alpha(colors.grey[500], isDark ? 0.22 : 0.14),
        "& .MuiLinearProgress-bar": {
          backgroundColor: safeColor,
        },
      };
    },

    arGrid: {
      mt: 1,
    },

    arBucket: {
      p: { xs: 1.5, md: 2 },
      borderRadius: `${radius.lg}px`,
      textAlign: "center",
      backgroundColor: isDark ? "#111827" : "#f8fafc",
      border: borderSoft,
    },

    arBucketLabel: {
      fontSize: "0.7rem",
      color: "text.secondary",
      fontWeight: 400,
      mb: 0.75,
    },

    arBucketValue: {
      fontSize: { xs: "0.95rem", md: "1.1rem" },
      fontWeight: 500,
      color: "text.primary",
      letterSpacing: "-0.015em",
    },

    listItem: {
      p: 1.25,
      borderRadius: `${radius.lg}px`,
      border: borderSoft,
      backgroundColor: isDark ? "#111827" : "#ffffff",
      mb: 1,
    },

    listTitle: {
      fontSize: "0.76rem",
      fontWeight: 500,
      color: "text.primary",
    },

    listSubtitle: {
      mt: 0.2,
      fontSize: "0.68rem",
      fontWeight: 400,
      color: "text.secondary",
    },

    listValue: {
      fontSize: "0.78rem",
      fontWeight: 500,
      color: "text.primary",
      whiteSpace: "nowrap",
    },

    reportButton: {
      borderRadius: `${radius.md}px`,
      textTransform: "none",
      fontSize: "0.7rem",
    },
  };

  /* ------------------------------------------------------------------
     FINANCE REPORTS
  ------------------------------------------------------------------ */
  const financeReports = {
    shell: layout.page,

    heroCard: accountsDashboard.heroCard,
    heroOverlay: accountsDashboard.heroOverlay,
    heroChip: accountsDashboard.heroChip,
    heroTitle: accountsDashboard.heroTitle,
    heroSubtitle: accountsDashboard.heroSubtitle,

    sectionHeader: {
      mb: 1.5,
    },

    sectionTitle: dashboardBase.sectionTitle,
    sectionSubtitle: dashboardBase.sectionSubtitle,

    kpiGrid: accountsDashboard.kpiGrid,

    kpiCard: makeCard({
      minHeight: 126,
      p: { xs: 1.5, md: 2 },
      borderLeftWidth: 3,
      borderLeftStyle: "solid",
      borderLeftColor: "var(--accent)",
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      "&:hover": {
        borderColor: "var(--accent-border-strong)",
        backgroundColor: isDark ? "#111827" : "#ffffff",
      },
    }),

    kpiIconBox: makeIconBox(40, "1.2rem", "lg"),

    kpiTitle: {
      fontSize: "0.72rem",
      color: "text.secondary",
      fontWeight: 400,
      lineHeight: 1.35,
    },

    kpiValue: {
      mt: 0.45,
      fontSize: { xs: "1.12rem", md: "1.28rem" },
      fontWeight: 500,
      color: "text.primary",
      letterSpacing: "-0.025em",
      lineHeight: 1.15,
    },

    kpiDescription: {
      mt: 0.75,
      fontSize: "0.68rem",
      color: "text.secondary",
      fontWeight: 400,
      lineHeight: 1.45,
    },

    trendChip: {
      height: 22,
      borderRadius: "999px",
      fontSize: "0.64rem",
      fontWeight: 500,
      backgroundColor: "var(--accent-bg)",
      color: "var(--accent)",
    },

    reportGrid: {
      display: "grid",
      gridTemplateColumns: {
        xs: "1fr",
        sm: "repeat(2, minmax(0, 1fr))",
        lg: "repeat(3, minmax(0, 1fr))",
        xl: "repeat(4, minmax(0, 1fr))",
      },
      gap: { xs: 1.5, md: 2 },
    },

    reportCard: makeCard({
      minHeight: 156,
      p: { xs: 1.5, md: 2 },
      borderLeftWidth: 3,
      borderLeftStyle: "solid",
      borderLeftColor: "var(--accent)",
      cursor: "pointer",
      display: "flex",
      flexDirection: "column",
      "&:hover": {
        borderColor: "var(--accent-border-strong)",
        backgroundColor: isDark ? "#111827" : "#ffffff",
      },
    }),

    reportIconBox: makeIconBox(40, "1.18rem", "lg"),

    reportTitle: {
      mt: 1.25,
      fontSize: "0.84rem",
      fontWeight: 500,
      color: "text.primary",
      letterSpacing: "-0.01em",
      lineHeight: 1.25,
    },

    reportDescription: {
      mt: 0.45,
      fontSize: "0.7rem",
      fontWeight: 400,
      color: "text.secondary",
      lineHeight: 1.5,
    },

    reportMeta: {
      mt: "auto",
      pt: 1.25,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 1,
    },

    reportTag: {
      height: 22,
      borderRadius: "999px",
      fontSize: "0.64rem",
      fontWeight: 500,
      backgroundColor: "var(--accent-bg)",
      color: "var(--accent)",
    },

    arrowIcon: {
      fontSize: 18,
      color: "text.disabled",
    },

    loadingCard: {
      minHeight: 160,
      borderRadius: `${radius.xl}px`,
      backgroundColor: surfaceBg,
      border: borderSoft,
      boxShadow: "none",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },

    errorCard: {
      p: 2,
      borderRadius: `${radius.xl}px`,
      backgroundColor: surfaceBg,
      border: borderSoft,
      boxShadow: "none",
    },
  };

  /* ------------------------------------------------------------------
     FINAL THEME OBJECT
  ------------------------------------------------------------------ */
  return {
    custom: {
      colors,
      isDark,
      appBg,
      surfaceBg,
      elevatedBg,
      subtleBg,
      mutedBg,
      borderSoft,
      borderStrong,
      borderSoftColor,
      borderStrongColor,
      transitionFast,
      transitionWidth,
      shadowPopup,
      radius,
      layout,
      accentVars,
      makeCard,
      makeButton,
      makeIconBox,
      coloredIconBox,
    },

    palette: {
      mode,

      primary: {
        main: colors.primary[500],
        light: colors.primary[400],
        dark: colors.primary[700],
        contrastText: "#ffffff",
      },

      secondary: {
        main: colors.primary[400],
        light: colors.primary[300],
        dark: colors.primary[700],
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
        disabled: alpha(isDark ? colors.grey[400] : colors.grey[500], 0.52),
      },

      divider: borderSoftColor,

      action: {
        hover: alpha(colors.primary[500], 0.045),
        selected: alpha(colors.primary[500], 0.09),
        disabled: alpha(colors.grey[500], 0.34),
        disabledBackground: alpha(colors.grey[500], 0.1),
        focus: alpha(colors.primary[500], 0.16),
      },
    },

    shape: {
      borderRadius: radius.md,
    },

    layout,
    hrmDashboard,
    dashboard,
    topbar,
    sidebar,
    team,
    employeeProfile,
    addEmployee,
    accountsDashboard,
    financeReports,

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

    components: {
      MuiCssBaseline: {
        styleOverrides: {
          html: {
            backgroundColor: appBg,
            WebkitFontSmoothing: "antialiased",
            MozOsxFontSmoothing: "grayscale",
          },

          body: {
            backgroundColor: appBg,
            color: isDark ? colors.grey[100] : colors.grey[100],
            WebkitFontSmoothing: "antialiased",
            MozOsxFontSmoothing: "grayscale",
            textRendering: "optimizeLegibility",
            scrollbarColor: isDark
              ? `${colors.grey[700]} transparent`
              : `${colors.grey[300]} transparent`,
          },

          "*, *::before, *::after": {
            boxSizing: "border-box",
          },

          a: {
            color: "inherit",
            textDecoration: "none",
          },

          button: {
            fontFamily: "inherit",
          },

          "::-webkit-scrollbar": {
            width: 6,
            height: 6,
          },

          "::-webkit-scrollbar-track": {
            background: "transparent",
          },

          "::-webkit-scrollbar-thumb": {
            backgroundColor: alpha(colors.grey[500], isDark ? 0.36 : 0.3),
            borderRadius: 999,
          },

          "::-webkit-scrollbar-thumb:hover": {
            backgroundColor: alpha(colors.grey[500], isDark ? 0.52 : 0.42),
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
            borderRadius: `${radius.lg}px`,
            backgroundColor: surfaceBg,
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
            borderRadius: `${radius.lg}px`,
            backgroundColor: surfaceBg,
            backgroundImage: "none",
            boxShadow: "none",
          },
        },
      },

      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: `${radius.xxl}px`,
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
            marginTop: 8,
            borderRadius: `${radius.lg}px`,
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

      MuiMenuItem: {
        styleOverrides: {
          root: {
            minHeight: 34,
            borderRadius: `${radius.md}px`,
            marginLeft: 6,
            marginRight: 6,
            fontSize: "0.76rem",
            fontWeight: 400,
            color: isDark ? colors.grey[100] : colors.grey[100],
            transition: transitionFast,

            "&:hover": {
              backgroundColor: alpha(colors.primary[500], 0.08),
            },

            "&.Mui-selected": {
              backgroundColor: alpha(colors.primary[500], 0.1),

              "&:hover": {
                backgroundColor: alpha(colors.primary[500], 0.14),
              },
            },
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
            fontWeight: 500,
            boxShadow: "none",
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
            borderColor: alpha(colors.grey[500], isDark ? 0.32 : 0.26),

            "&:hover": {
              backgroundColor: alpha(colors.primary[500], 0.055),
              borderColor: alpha(colors.primary[500], 0.42),
            },
          },

          text: {
            "&:hover": {
              backgroundColor: alpha(colors.primary[500], 0.08),
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

      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: `${radius.sm}px`,
            backgroundColor: isDark ? "#020617" : "#f8fafc",
            transition: transitionFast,

            "& fieldset": {
              borderColor: alpha(colors.grey[500], isDark ? 0.32 : 0.26),
            },

            "&:hover fieldset": {
              borderColor: alpha(colors.grey[500], isDark ? 0.52 : 0.42),
            },

            "&.Mui-focused fieldset": {
              borderWidth: 1,
              borderColor: colors.primary[500],
            },

            "&.Mui-disabled": {
              backgroundColor: alpha(colors.grey[500], 0.08),
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
            color: isDark ? colors.grey[400] : colors.grey[500],

            "&.Mui-focused": {
              color: colors.primary[500],
            },
          },
        },
      },

      MuiSelect: {
        styleOverrides: {
          select: {
            fontSize: "0.8rem",
            fontWeight: 400,
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
            fontSize: "0.7rem",
            fontWeight: 500,
            letterSpacing: "0.045em",
            textTransform: "uppercase",
            color: isDark ? colors.grey[300] : colors.grey[500],
            backgroundColor: subtleBg,
          },
        },
      },

      MuiDataGrid: {
        styleOverrides: {
          root: {
            border: "none",
            backgroundColor: surfaceBg,
            fontSize: "0.75rem",
            fontWeight: 400,
            "--DataGrid-rowBorderColor": borderSoftColor,
          },

          columnHeaders: {
            backgroundColor: subtleBg,
            borderBottom: borderSoft,
            minHeight: "38px !important",
            maxHeight: "38px !important",
          },

          columnHeaderTitle: {
            fontWeight: 500,
            color: isDark ? colors.grey[300] : colors.grey[600],
            fontSize: "0.7rem",
            letterSpacing: "0.045em",
            textTransform: "uppercase",
          },

          row: {
            minHeight: "42px !important",
            maxHeight: "42px !important",
            transition: transitionFast,

            "&:hover": {
              backgroundColor: alpha(colors.primary[500], isDark ? 0.05 : 0.035),
            },

            "&.Mui-selected": {
              backgroundColor: alpha(colors.primary[500], 0.08),

              "&:hover": {
                backgroundColor: alpha(colors.primary[500], 0.12),
              },
            },
          },

          cell: {
            borderBottom: borderSoft,
            padding: "0 14px",
            color: isDark ? colors.grey[100] : colors.grey[100],

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
            padding: "8px 12px",
            borderBottom: borderSoft,
          },
        },
      },

      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 999,
            fontWeight: 500,
            fontSize: "0.68rem",
            height: 22,
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

          arrow: {
            color: isDark ? "#1e293b" : "#0f172a",
          },
        },
      },

      MuiDivider: {
        styleOverrides: {
          root: {
            borderColor: borderSoftColor,
          },
        },
      },

      MuiLinearProgress: {
        styleOverrides: {
          root: {
            borderRadius: 999,
            overflow: "hidden",
            backgroundColor: alpha(colors.grey[500], isDark ? 0.22 : 0.14),
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

      MuiTabs: {
        styleOverrides: {
          root: {
            minHeight: 38,
          },

          indicator: {
            height: 2,
            borderRadius: 999,
          },
        },
      },

      MuiTab: {
        styleOverrides: {
          root: {
            minHeight: 38,
            textTransform: "none",
            fontSize: "0.76rem",
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
  mode: "light",
  toggleColorMode: () => {},
  setColorMode: () => {},
});

export const useMode = () => {
  const getInitialMode = () => {
    if (typeof window === "undefined") return "light";

    const savedMode = localStorage.getItem("themeMode");

    if (savedMode === "light" || savedMode === "dark") {
      return savedMode;
    }

    return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches
      ? "dark"
      : "light";
  };

  const [mode, setMode] = useState(getInitialMode);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const mediaQuery = window.matchMedia?.("(prefers-color-scheme: dark)");

    if (!mediaQuery) return undefined;

    const listener = (event) => {
      const savedMode = localStorage.getItem("themeMode");

      if (!savedMode) {
        setMode(event.matches ? "dark" : "light");
      }
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", listener);
    } else {
      mediaQuery.addListener(listener);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener("change", listener);
      } else {
        mediaQuery.removeListener(listener);
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    localStorage.setItem("themeMode", mode);
    document.documentElement.dataset.theme = mode;
    document.documentElement.style.colorScheme = mode;
  }, [mode]);

  const colorMode = useMemo(
    () => ({
      mode,

      toggleColorMode: () => {
        setMode((prev) => (prev === "light" ? "dark" : "light"));
      },

      setColorMode: (nextMode) => {
        if (nextMode === "light" || nextMode === "dark") {
          setMode(nextMode);
        }
      },
    }),
    [mode]
  );

  const theme = useMemo(() => createTheme(themeSettings(mode)), [mode]);

  return [theme, colorMode];
};