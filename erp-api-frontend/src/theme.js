import { createContext, useState, useMemo } from "react";
import { createTheme } from "@mui/material/styles";

// Professional color design tokens
export const tokens = (mode) => ({
    ...(mode === "dark"
    ? {
        grey: {
            50: "#f9fafb",
            100: "#f3f4f6",
            200: "#e5e7eb",
            300: "#d1d5db",
            400: "#9ca3af",
            500: "#6b7280",
            600: "#4b5563",
            700: "#374151",
            800: "#1f2937",
            900: "#111827",
        },
        // Muted, professional blue with depth — not neon
        primary: {
            50: "#f1f5f9",
            100: "#e2e8f0",
            200: "#cbd5e1",
            300: "#94a3b8",
            400: "#64748b",
            500: "#475569", // Main professional slate-blue
            600: "#334155",
            700: "#1e293b",
            800: "#0f172a",
            900: "#0a0f1a",
        },
        // Gentle green accent for actions (buttons, links, success)
        secondary: {
            50: "#ecfdf5",
            100: "#d1fae5",
            200: "#a7f3d0",
            300: "#6ee7b7",
            400: "#34d399",
            500: "#10b981", // main accent color (teal-green)
            600: "#059669",
            700: "#047857",
            800: "#065f46",
            900: "#064e3b",
        },
        error: {
            500: "#ef4444",
            600: "#dc2626",
        },
        warning: {
            500: "#f59e0b",
            600: "#d97706",
        },
        info: {
            500: "#38bdf8", // Subtle cyan hint for information elements
            600: "#0ea5e9",
        },
        background: {
            default: "#0b1120", // Dark navy-slate background (modern)
            paper: "#1e2532",   // Slightly lighter for cards and panels
        },
        text: {
            primary: "#f1f5f9", // Off-white, easy on the eyes
            secondary: "#94a3b8", // Muted gray-blue for secondary text
        },
    }
        : {
            // Light mode - Clean professional light theme
            grey: {
            50: "#fafafa",
            100: "#f4f4f5",
            200: "#e4e4e7",
            300: "#d4d4d8",
            400: "#a1a1aa",
            500: "#71717a",
            600: "#52525b",
            700: "#3f3f46",
            800: "#27272a",
            900: "#18181b",
            },
            primary: {
            50: "#f0f9ff",
            100: "#e0f2fe",
            200: "#bae6fd",
            300: "#7dd3fc",
            400: "#38bdf8",
            500: "#0ea5e9",
            600: "#0284c7",
            700: "#0369a1",
            800: "#075985",
            900: "#0c4a6e",
            },
            secondary: {
            50: "#f0fdf4",
            100: "#dcfce7",
            200: "#bbf7d0",
            300: "#86efac",
            400: "#4ade80",
            500: "#22c55e",
            600: "#16a34a",
            700: "#15803d",
            800: "#166534",
            900: "#14532d",
            },
            error: {
            50: "#fef2f2",
            100: "#fee2e2",
            200: "#fecaca",
            300: "#fca5a5",
            400: "#f87171",
            500: "#ef4444",
            600: "#dc2626",
            700: "#b91c1c",
            800: "#991b1b",
            900: "#7f1d1d",
            },
            warning: {
            50: "#fffbeb",
            100: "#fef3c7",
            200: "#fde68a",
            300: "#fcd34d",
            400: "#fbbf24",
            500: "#f59e0b",
            600: "#d97706",
            700: "#b45309",
            800: "#92400e",
            900: "#78350f",
            },
            info: {
            50: "#f0f9ff",
            100: "#e0f2fe",
            200: "#bae6fd",
            300: "#7dd3fc",
            400: "#38bdf8",
            500: "#0ea5e9",
            600: "#0284c7",
            700: "#0369a1",
            800: "#075985",
            900: "#0c4a6e",
            },
            background: {
            default: "#ffffff",
            paper: "#f8fafc",
            },
            text: {
            primary: "#0f172a",
            secondary: "#475569",
            }
        }),
    });

    // MUI theme settings
    export const themeSettings = (mode) => {
    const colors = tokens(mode);
    
    return {
        palette: {
        mode: mode,
        ...(mode === "dark"
            ? {
                // Dark mode palette
                primary: {
                main: colors.primary[500],
                light: colors.primary[400],
                dark: colors.primary[700],
                },
                secondary: {
                main: colors.secondary[500],
                light: colors.secondary[400],
                dark: colors.secondary[700],
                },
                error: {
                main: colors.error[500],
                },
                warning: {
                main: colors.warning[500],
                },
                info: {
                main: colors.info[500],
                },
                background: {
                default: colors.background.default,
                paper: colors.background.paper,
                },
                text: {
                primary: colors.text.primary,
                secondary: colors.text.secondary,
                },
            }
            : {
                // Light mode palette
                primary: {
                main: colors.primary[600],
                light: colors.primary[400],
                dark: colors.primary[800],
                },
                secondary: {
                main: colors.secondary[600],
                light: colors.secondary[400],
                dark: colors.secondary[800],
                },
                error: {
                main: colors.error[500],
                },
                warning: {
                main: colors.warning[500],
                },
                info: {
                main: colors.info[600],
                },
                background: {
                default: colors.background.default,
                paper: colors.background.paper,
                },
                text: {
                primary: colors.text.primary,
                secondary: colors.text.secondary,
                },
            }),
        },
        typography: {
        fontFamily: ["Inter", "Source Sans Pro", "sans-serif"].join(","),
        fontSize: 14,
        h1: {
            fontSize: 32,
            fontWeight: 700,
            lineHeight: 1.2,
        },
        h2: {
            fontSize: 28,
            fontWeight: 600,
            lineHeight: 1.3,
        },
        h3: {
            fontSize: 24,
            fontWeight: 600,
            lineHeight: 1.3,
        },
        h4: {
            fontSize: 20,
            fontWeight: 600,
            lineHeight: 1.4,
        },
        h5: {
            fontSize: 16,
            fontWeight: 500,
            lineHeight: 1.4,
        },
        h6: {
            fontSize: 14,
            fontWeight: 500,
            lineHeight: 1.4,
        },
        body1: {
            fontSize: 14,
            lineHeight: 1.5,
        },
        body2: {
            fontSize: 12,
            lineHeight: 1.5,
        },
        button: {
            textTransform: 'none',
            fontWeight: 500,
        },
        },
        shape: {
        borderRadius: 8,
        },
        components: {
        MuiButton: {
            styleOverrides: {
            root: {
                borderRadius: 8,
                textTransform: 'none',
                fontWeight: 500,
            },
            },
        },
        MuiCard: {
            styleOverrides: {
            root: {
                borderRadius: 12,
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
            },
            },
        },
        },
    };
    };

    // Context for color mode
    export const ColorModeContext = createContext({
    toggleColorMode: () => {},
    });

    export const useMode = () => {
    const [mode, setMode] = useState("dark");

    const colorMode = useMemo(
        () => ({
        toggleColorMode: () =>
            setMode((prev) => (prev === "light" ? "dark" : "light")),
        }),
        []
    );

    const theme = useMemo(() => createTheme(themeSettings(mode)), [mode]);
    return [theme, colorMode];
};