import { createContext, useState, useMemo, useEffect } from "react";
import { createTheme } from "@mui/material/styles";

/* ------------------------------------------------------------------
   🎨 COLOR TOKENS
------------------------------------------------------------------ */
export const tokens = (mode) => ({
  ...(mode === "dark"
    ? {
        grey: {
          100: "#e0e0e0",
          200: "#c2c2c2",
          300: "#a3a3a3",
          400: "#858585",
          500: "#666666",
          600: "#525252",
          700: "#3d3d3d",
          800: "#292929",
          900: "#141414",
        },
        primary: {
          100: "#d0d1d5",
          200: "#a1a4ab",
          300: "#727681",
          400: "#1F2A40",
          500: "#141b2d",
          600: "#101624",
          700: "#0c101b",
          800: "#080b12",
          900: "#040509",
        },
        greenAccent: {
          100: "#dbf5ee",
          200: "#b7ebde",
          300: "#94e2cd",
          400: "#70d8bd",
          500: "#4cceac",
          600: "#3da58a",
          700: "#2e7c67",
          800: "#1e5245",
          900: "#0f2922",
        },
        redAccent: {
          100: "#f8dcdb",
          200: "#f1b9b7",
          300: "#e99592",
          400: "#e2726e",
          500: "#db4f4a",
          600: "#af3f3b",
          700: "#832f2c",
          800: "#58201e",
          900: "#2c100f",
        },
        blueAccent: {
          100: "#e1e2fe",
          200: "#c3c6fd",
          300: "#a4a9fc",
          400: "#868dfb",
          500: "#6870fa",
          600: "#535ac8",
          700: "#3e4396",
          800: "#2a2d64",
          900: "#151632",
        },
        purpleAccent: {
          100: "#e1bee7",
          200: "#ce93d8",
          300: "#ba68c8",
          400: "#ab47bc",
          500: "#9c27b0",
          600: "#8e24aa",
          700: "#7b1fa2",
          800: "#6a1b9a",
          900: "#4a148c",
        },
        yellowAccent: {
          100: "#fcf4dd",
          200: "#faf0c1",
          300: "#f7eba5",
          400: "#f5e689",
          500: "#F2E16D",
          600: "#c2b457",
          700: "#918741",
          800: "#615a2c",
          900: "#302d16",
        },
      }
    : {
        grey: {
          100: "#141414",
          200: "#292929",
          300: "#3d3d3d",
          400: "#525252",
          500: "#666666",
          600: "#858585",
          700: "#a3a3a3",
          800: "#c2c2c2",
          900: "#e0e0e0",
        },
        primary: {
          100: "#ffffff",
          200: "#f9f9f9",
          300: "#f2f2f2",
          400: "#f0f0f0",
          500: "#e5e5e5",
          600: "#cccccc",
          700: "#b3b3b3",
          800: "#999999",
          900: "#808080",
        },
        greenAccent: {
          100: "#0c3015ff",
          200: "#15482bff",
          300: "#236f42ff",
          400: "#30a460ff",
          500: "#23a825ff",
          600: "#4cd159ff",
          700: "#6de06bff",
          800: "#75e982ff",
          900: "#aff3c1ff",
        },
        redAccent: {
          100: "#2c100f",
          200: "#58201e",
          300: "#832f2c",
          400: "#af3f3b",
          500: "#db4f4a",
          600: "#e2726e",
          700: "#e99592",
          800: "#f1b9b7",
          900: "#f8dcdb",
        },
        blueAccent: {
          100: "#151632",
          200: "#2a2d64",
          300: "#3e4396",
          400: "#535ac8",
          500: "#6870fa",
          600: "#868dfb",
          700: "#a4a9fc",
          800: "#c3c6fd",
          900: "#e1e2fe",
        },
        purpleAccent: {
          100: "#e1bee7",
          200: "#ce93d8",
          300: "#ba68c8",
          400: "#ab47bc",
          500: "#9c27b0",
          600: "#8e24aa",
          700: "#7b1fa2",
          800: "#6a1b9a",
          900: "#4a148c",
        },
        yellowAccent: {
          100: "#fcf4dd",
          200: "#faf0c1",
          300: "#f7eba5",
          400: "#f5e689",
          500: "#F2E16D",
          600: "#c2b457",
          700: "#918741",
          800: "#615a2c",
          900: "#302d16",
        },
      }),
});

/* ------------------------------------------------------------------
   ⚙️ MUI THEME SETTINGS
------------------------------------------------------------------ */
export const themeSettings = (mode) => {
  const colors = tokens(mode);

  return {
    palette: {
      mode,
      ...(mode === "dark"
        ? {
            primary: { main: colors.primary[500] },
            secondary: { main: colors.greenAccent[500] },
            neutral: {
              dark: colors.grey[700],
              main: colors.grey[500],
              light: colors.grey[100],
            },
            background: { default: colors.primary[500] },
          }
        : {
            primary: { main: colors.primary[100] },
            secondary: { main: colors.greenAccent[500] },
            neutral: {
              dark: colors.grey[700],
              main: colors.grey[500],
              light: colors.grey[100],
            },
            background: { default: "#f9f9f9" },
          }),
    },

    components: {
      MuiCssBaseline: {
        styleOverrides: {
          "*, *::before, *::after": {
            transition: "background-color 0.35s ease, color 0.35s ease",
          },
              /* -------------------------------
          FullCalendar theme overrides
          scoped to .ligco-calendar wrapper
        -------------------------------- */
        ".ligco-calendar .fc": {
          fontFamily: ["Source Sans Pro", "sans-serif"].join(","),
          color: mode === "dark" ? colors.grey[100] : colors.grey[100],
        },

        ".ligco-calendar .fc .fc-toolbar-title": {
          fontSize: "1.05rem",
          fontWeight: 800,
          color: mode === "dark" ? colors.grey[100] : colors.grey[200],
        },

        ".ligco-calendar .fc .fc-button": {
          borderRadius: "10px",
          border: "0",
          boxShadow: "none",
          textTransform: "none",
          fontWeight: 700,
          padding: "6px 10px",
          backgroundColor: mode === "dark" ? colors.primary[500] : colors.primary[300],
          color: mode === "dark" ? colors.grey[100] : colors.grey[100],
        },

        ".ligco-calendar .fc .fc-button:hover": {
          backgroundColor: mode === "dark" ? colors.primary[400] : colors.primary[400],
        },

        ".ligco-calendar .fc .fc-button:disabled": {
          opacity: 0.6,
        },

        ".ligco-calendar .fc .fc-daygrid-day, .ligco-calendar .fc .fc-timegrid-slot": {
          borderColor: mode === "dark" ? colors.grey[700] : colors.grey[300],
        },

        ".ligco-calendar .fc .fc-col-header-cell": {
          backgroundColor: mode === "dark" ? colors.primary[500] : colors.primary[300],
          borderColor: mode === "dark" ? colors.grey[700] : colors.grey[300],
          color: mode === "dark" ? colors.grey[100] : colors.grey[100],
          fontWeight: 800,
        },

        ".ligco-calendar .fc .fc-scrollgrid": {
          borderColor: mode === "dark" ? colors.grey[700] : colors.grey[300],
          borderRadius: "14px",
          overflow: "hidden",
        },

        ".ligco-calendar .fc .fc-day-today": {
          backgroundColor: mode === "dark" ? "rgba(76, 206, 172, 0.12)" : "rgba(35, 168, 37, 0.10)",
        },

        ".ligco-calendar .fc .fc-event": {
          borderRadius: "10px",
          border: "0",
          padding: "2px 6px",
          fontWeight: 700,
        },

        ".ligco-calendar .fc .fc-list-event:hover td": {
          backgroundColor: mode === "dark" ? colors.primary[400] : colors.primary[400],
        },

        ".ligco-calendar .fc .fc-popover": {
          backgroundColor: mode === "dark" ? colors.primary[400] : colors.primary[200],
          borderColor: mode === "dark" ? colors.grey[700] : colors.grey[300],
          color: mode === "dark" ? colors.grey[100] : colors.grey[200],
          borderRadius: "14px",
          overflow: "hidden",
        },

        ".ligco-calendar .fc .fc-popover-header": {
          backgroundColor: mode === "dark" ? colors.primary[500] : colors.primary[300],
          color: mode === "dark" ? colors.grey[100] : colors.grey[100],
          fontWeight: 800,
        },
        },
      },

      MuiFilledInput: {
        styleOverrides: {
          root: {
            backgroundColor:
              mode === "dark" ? colors.primary[400] : "#f3f3f3",
            borderRadius: "8px",
            "&:hover": {
              backgroundColor:
                mode === "dark" ? colors.primary[300] : "#e9e9e9",
            },
            "&.Mui-focused": {
              backgroundColor:
                mode === "dark" ? colors.primary[300] : "#fff",
              boxShadow:
                mode === "dark"
                  ? "0 0 0 1px #70d8bd"
                  : "0 0 0 1px #4cceac",
            },
            "& input": {
              color:
                mode === "dark" ? colors.grey[100] : colors.grey[700],
            },
            "& input:-webkit-autofill": {
              transition: "background-color 5000s ease-in-out 0s",
              WebkitTextFillColor:
                mode === "dark" ? colors.grey[100] : colors.grey[700],
              WebkitBoxShadow: `0 0 0px 1000px ${
                mode === "dark" ? colors.primary[400] : "#f3f3f3"
              } inset`,
            },
          },
        },
      },

      MuiInputLabel: {
        styleOverrides: {
          root: {
            color:
              mode === "dark" ? colors.grey[200] : colors.grey[500],
            "&.Mui-focused": {
              color: colors.greenAccent[400],
            },
          },
        },
      },
    },

    typography: {
      fontFamily: ["Source Sans Pro", "sans-serif"].join(","),
      fontSize: 12,
      h1: { fontSize: 40 },
      h2: { fontSize: 32 },
      h3: { fontSize: 24 },
      h4: { fontSize: 20 },
      h5: { fontSize: 16 },
      h6: { fontSize: 14 },
    },
  };
};

/* ------------------------------------------------------------------
   🌗 CONTEXT + HOOK
   - Syncs with system preference LIVE
   - Saves mode in localStorage
   - Animates transitions
------------------------------------------------------------------ */

export const ColorModeContext = createContext({
  toggleColorMode: () => {},
});

export const useMode = () => {
  // Load saved mode or fallback to system
  const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)");
  const savedMode = localStorage.getItem("themeMode");

  const getInitialMode = () => {
    return savedMode || (systemPrefersDark.matches ? "dark" : "light");
  };

  const [mode, setMode] = useState(getInitialMode);

  /* --- LIVE sync with system preference --- */
  useEffect(() => {
    const listener = (e) => {
      const newMode = e.matches ? "dark" : "light";

      // Only auto-switch if user hasn't manually chosen a mode
      if (!savedMode) {
        setMode(newMode);
      }
    };

    systemPrefersDark.addEventListener("change", listener);
    return () => systemPrefersDark.removeEventListener("change", listener);
  }, [savedMode]);

  /* --- Persist mode in localStorage --- */
  useEffect(() => {
    localStorage.setItem("themeMode", mode);
  }, [mode]);

  /* --- Provided toggle function --- */
  const colorMode = useMemo(
    () => ({
      toggleColorMode: () =>
        setMode((prev) => (prev === "light" ? "dark" : "light")),
    }),
    []
  );

  /* --- Animated theme switch --- */
  useEffect(() => {
    document.body.style.transition =
      "background-color 0.35s ease, color 0.35s ease";
  }, []);

  const theme = useMemo(() => createTheme(themeSettings(mode)), [mode]);

  return [theme, colorMode];
};
