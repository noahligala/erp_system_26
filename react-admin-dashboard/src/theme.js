import { createContext, useState, useMemo, useEffect } from "react";
import { createTheme, alpha } from "@mui/material/styles";

/* ------------------------------------------------------------------
   🎨 COLOR TOKENS 
------------------------------------------------------------------ */
export const tokens = (mode) => ({
  ...(mode === "dark"
    ? {
        grey: {
          100: "#f1f5f9", 200: "#e2e8f0", 300: "#cbd5e1",
          400: "#94a3b8", 500: "#64748b", 600: "#475569",
          700: "#334155", 800: "#1e293b", 900: "#0f172a",
        },
        primary: {
          100: "#e0e7ff", 200: "#c7d2fe", 300: "#a5b4fc",
          400: "#818cf8", 500: "#6366f1", 600: "#4f46e5",
          700: "#4338ca", 800: "#312e81", 900: "#1e1b4b",
        },
        status: {
          success: "#10b981", error: "#f43f5e", warning: "#f59e0b", info: "#3b82f6",
        }
      }
    : {
        grey: {
          100: "#0f172a", 200: "#1e293b", 300: "#334155",
          400: "#475569", 500: "#64748b", 600: "#94a3b8",
          700: "#cbd5e1", 800: "#e2e8f0", 900: "#f8fafc",
        },
        primary: {
          100: "#e0e7ff", 200: "#c7d2fe", 300: "#a5b4fc",
          400: "#818cf8", 500: "#6366f1", 600: "#4f46e5",
          700: "#4338ca", 800: "#3730a3", 900: "#312e81",
        },
        status: {
          success: "#059669", error: "#dc2626", warning: "#d97706", info: "#2563eb",
        }
      }),
});

/* ------------------------------------------------------------------
   ⚙️ MASTER THEME SETTINGS (ULTRA-LIGHT & AIRY)
------------------------------------------------------------------ */
export const themeSettings = (mode) => {
  const colors = tokens(mode);
  const isDark = mode === "dark";

  // Ultra-clean, modern sans-serif stack prioritized for readability at small sizes
  const fontStack = [
    '"Inter"', '"Geist"', '"SF Pro Display"', "-apple-system", 
    "BlinkMacSystemFont", '"Segoe UI"', "Roboto", "Helvetica", "sans-serif"
  ].join(",");

  return {
    palette: {
      mode,
      primary: { main: colors.primary[500], light: colors.primary[400], dark: colors.primary[600] },
      success: { main: colors.status.success },
      error: { main: colors.status.error },
      warning: { main: colors.status.warning },
      info: { main: colors.status.info },
      background: {
        default: isDark ? "#020617" : "#f8fafc",
        paper: isDark ? "#0f172a" : "#ffffff", 
      },
      text: {
        primary: isDark ? colors.grey[100] : colors.grey[100],
        secondary: isDark ? colors.grey[400] : colors.grey[500],
        disabled: alpha(isDark ? colors.grey[400] : colors.grey[500], 0.5),
      },
      divider: alpha(colors.grey[500], isDark ? 0.2 : 0.1),
      action: {
        hover: alpha(colors.primary[500], 0.04),
        selected: alpha(colors.primary[500], 0.08),
        disabled: alpha(colors.grey[500], 0.3),
        disabledBackground: alpha(colors.grey[500], 0.1),
      }
    },

    /* ---------------- OPTICAL TYPOGRAPHY (SMALLER & LIGHTER) ---------------- */
    typography: {
      fontFamily: fontStack,
      fontSize: 12, // Dropped base size to shrink entire UI scaling
      
      // Shifted all weights down by ~100
      fontWeightLight: 300,
      fontWeightRegular: 300, // Body text is now light
      fontWeightMedium: 400,  // Buttons/Subtitles are now regular
      fontWeightBold: 500,    // Headers are now medium
      
      h1: { fontSize: "1.6rem", fontWeight: 400, letterSpacing: "-0.03em" },
      h2: { fontSize: "1.35rem", fontWeight: 400, letterSpacing: "-0.02em" },
      h3: { fontSize: "1.15rem", fontWeight: 400, letterSpacing: "-0.015em" },
      h4: { fontSize: "1rem", fontWeight: 500, letterSpacing: "-0.01em" },
      h5: { fontSize: "0.9rem", fontWeight: 500 },
      h6: { fontSize: "0.8rem", fontWeight: 500, letterSpacing: "0.01em" }, 
      
      subtitle1: { fontSize: "0.85rem", fontWeight: 300, color: isDark ? colors.grey[300] : colors.grey[500] },
      subtitle2: { fontSize: "0.75rem", fontWeight: 300, color: isDark ? colors.grey[400] : colors.grey[600] },
      
      body1: { fontSize: "0.85rem", fontWeight: 300, lineHeight: 1.6, letterSpacing: "0.01em" },
      body2: { fontSize: "0.75rem", fontWeight: 300, lineHeight: 1.6, letterSpacing: "0.015em" },
      
      button: { textTransform: "none", fontWeight: 400, fontSize: "0.8rem", letterSpacing: "0.02em" },
      overline: { fontSize: "0.7rem", fontWeight: 500, letterSpacing: "0.05em", textTransform: "uppercase" },
      caption: { fontSize: "0.7rem", fontWeight: 300, color: isDark ? colors.grey[400] : colors.grey[500] },
    },

    /* ---------------- GLOBAL COMPONENTS & DEFAULTS ---------------- */
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          "*, *::before, *::after": { transition: "background-color 0.15s ease, border-color 0.15s ease" },
          body: {
            backgroundColor: isDark ? "#020617" : "#f8fafc",
            scrollbarColor: isDark ? `${colors.grey[700]} transparent` : `${colors.grey[300]} transparent`,
            "&::-webkit-scrollbar, & *::-webkit-scrollbar": { width: "6px", height: "6px" },
            "&::-webkit-scrollbar-track, & *::-webkit-scrollbar-track": { background: "transparent" },
            "&::-webkit-scrollbar-thumb, & *::-webkit-scrollbar-thumb": { backgroundColor: alpha(colors.grey[500], 0.3), borderRadius: "6px" },
            // Font rendering optimization for an extra crisp look on Mac/Windows
            WebkitFontSmoothing: "antialiased",
            MozOsxFontSmoothing: "grayscale",
          },
        },
      },

      /* LAYER 3: NAVIGATION (Glass) */
      MuiAppBar: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: {
            background: isDark ? alpha("#020617", 0.7) : alpha("#ffffff", 0.8),
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            borderBottom: `1px solid ${alpha(colors.grey[500], isDark ? 0.15 : 0.1)}`,
            color: isDark ? "#ffffff" : colors.grey[100],
          },
        },
      },

      /* LAYER 1: CONTENT SURFACES */
      MuiPaper: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: {
            borderRadius: "10px", // Slightly sharper for a minimal look
            background: isDark ? "#0f172a" : "#ffffff", 
            border: `1px solid ${alpha(colors.grey[500], isDark ? 0.2 : 0.1)}`,
            backgroundImage: "none",
          },
        },
      },
      MuiCard: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: {
            borderRadius: "10px",
            background: isDark ? "#0f172a" : "#ffffff",
            border: `1px solid ${alpha(colors.grey[500], isDark ? 0.2 : 0.1)}`,
          },
        },
      },

      /* LAYER 2: ELEVATED / MODALS */
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: "12px",
            background: isDark ? "#1e293b" : "#ffffff", 
            border: `1px solid ${alpha(colors.grey[500], isDark ? 0.3 : 0.15)}`,
            boxShadow: isDark ? "0 25px 50px -12px rgba(0, 0, 0, 0.7)" : "0 25px 50px -12px rgba(0, 0, 0, 0.15)",
          }
        }
      },
      MuiMenu: {
        styleOverrides: {
          paper: {
            marginTop: "8px",
            borderRadius: "8px",
            background: isDark ? "#1e293b" : "#ffffff",
            border: `1px solid ${alpha(colors.grey[500], isDark ? 0.3 : 0.1)}`,
            boxShadow: isDark ? "0 10px 25px -5px rgba(0, 0, 0, 0.5)" : "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
          }
        }
      },

      /* Buttons & Actions */
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: {
            borderRadius: "6px", 
            padding: "6px 14px",
            transition: "all 0.15s ease",
          },
          contained: {
            background: colors.primary[500],
            color: "#fff",
            "&:hover": { background: colors.primary[600] },
          },
          outlined: {
            borderColor: alpha(colors.grey[500], 0.3),
            "&:hover": { backgroundColor: alpha(colors.grey[500], 0.05), borderColor: colors.grey[500] },
          },
          text: {
            "&:hover": { backgroundColor: alpha(colors.grey[500], 0.08) },
          }
        },
      },

      /* Form Inputs */
      MuiTextField: { defaultProps: { variant: "outlined", size: "small" } },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: "6px", 
            backgroundColor: isDark ? "#020617" : "#f8fafc", 
            "& fieldset": { borderColor: alpha(colors.grey[500], 0.3) },
            "&:hover fieldset": { borderColor: alpha(colors.grey[500], 0.6) },
            "&.Mui-focused fieldset": { borderWidth: "1px", borderColor: colors.primary[500] },
          },
          input: { padding: "8px 12px", fontSize: "0.8rem", fontWeight: 300 },
        },
      },
      MuiInputLabel: {
        styleOverrides: {
          root: { 
            fontSize: "0.8rem", 
            fontWeight: 300,
            transform: "translate(14px, 9px) scale(1)", 
            "&.MuiInputLabel-shrink": { transform: "translate(14px, -9px) scale(0.85)" } 
          },
        },
      },

      /* DataGrid & Tables */
      MuiDataGrid: {
        styleOverrides: {
          root: {
            border: "none",
            fontSize: "0.75rem", // Ultra dense datagrid text
            fontWeight: 300,
            "--DataGrid-rowBorderColor": alpha(colors.grey[500], isDark ? 0.15 : 0.1),
          },
          columnHeaders: {
            background: isDark ? "#1e293b" : "#f1f5f9", 
            borderBottom: `1px solid ${alpha(colors.grey[500], isDark ? 0.3 : 0.2)}`,
            minHeight: "36px !important", // Even tighter headers
            maxHeight: "36px !important",
          },
          columnHeaderTitle: { 
            fontWeight: 500, 
            letterSpacing: "0.02em",
            color: isDark ? colors.grey[300] : colors.grey[600],
          },
          row: { 
            minHeight: "40px !important", // Tighter rows
            maxHeight: "40px !important",
            "&:hover": { backgroundColor: alpha(colors.primary[500], 0.04) },
            "&.Mui-selected": {
              backgroundColor: alpha(colors.primary[500], 0.08),
              "&:hover": { backgroundColor: alpha(colors.primary[500], 0.12) },
            }
          },
          cell: { 
            borderBottom: `1px solid ${alpha(colors.grey[500], isDark ? 0.15 : 0.1)}`,
            padding: "0 16px",
            "&:focus, &:focus-within": { outline: "none" } 
          },
          columnSeparator: { display: "none" }, 
          footerContainer: { 
            borderTop: `1px solid ${alpha(colors.grey[500], isDark ? 0.2 : 0.1)}`, 
            background: isDark ? "#0f172a" : "#ffffff",
            minHeight: "40px !important"
          }
        },
      },
      
      /* Information Displays (Chips, Alerts) */
      MuiChip: {
        styleOverrides: {
          root: { borderRadius: "4px", fontWeight: 400, fontSize: "0.7rem", height: "22px" },
          filled: { backgroundColor: isDark ? alpha(colors.grey[500], 0.2) : alpha(colors.grey[500], 0.1) }
        }
      },
      MuiAlert: {
        styleOverrides: {
          root: { borderRadius: "8px", fontWeight: 400, fontSize: "0.8rem", alignItems: "center" },
        }
      },
    },
  };
};

/* ------------------------------------------------------------------
   🌗 CONTEXT + HOOK
------------------------------------------------------------------ */
export const ColorModeContext = createContext({
  toggleColorMode: () => {},
});

export const useMode = () => {
  const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)");
  const savedMode = localStorage.getItem("themeMode");

  const [mode, setMode] = useState(
    savedMode || (systemPrefersDark.matches ? "dark" : "light")
  );

  useEffect(() => {
    const listener = (e) => {
      const newMode = e.matches ? "dark" : "light";
      if (!savedMode) setMode(newMode);
    };

    systemPrefersDark.addEventListener("change", listener);
    return () => systemPrefersDark.removeEventListener("change", listener);
  }, [savedMode]);

  useEffect(() => {
    localStorage.setItem("themeMode", mode);
  }, [mode]);

  const colorMode = useMemo(
    () => ({
      toggleColorMode: () =>
        setMode((prev) => (prev === "light" ? "dark" : "light")),
    }),
    []
  );

  useEffect(() => {
    document.body.style.transition = "background-color 0.15s ease, color 0.15s ease";
  }, []);

  const theme = useMemo(() => createTheme(themeSettings(mode)), [mode]);

  return [theme, colorMode];
};