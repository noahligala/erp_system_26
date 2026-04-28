import { useState, useEffect } from "react";
import {
  Box,
  Button,
  TextField,
  Typography,
  useTheme,
  Alert,
  CircularProgress,
  Paper,
  FormControlLabel,
  Checkbox,
  Divider,
  InputAdornment,
  IconButton,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { Formik } from "formik";
import * as yup from "yup";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../api/AuthProvider";
import { secureStore } from "../../utils/storage";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const { login } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  const lastVisitedPath = secureStore.get("lastVisitedPath");

  useEffect(() => {
    const prevPath = location.state?.from || lastVisitedPath;
    if (prevPath && prevPath !== "/login") {
      secureStore.set("lastVisitedPath", prevPath);
    }
  }, [location, lastVisitedPath]);

  const handleFormSubmit = async (values) => {
    setLoading(true);
    setError("");

    try {
      const response = await login(values, rememberMe);

      if (response.success) {
        const redirectTo =
          secureStore.get("lastVisitedPath") || "/dashboard";
        secureStore.remove("lastVisitedPath");
        navigate(redirectTo, { replace: true });
      } else {
        setError(response.error || "Invalid credentials.");
      }
    } catch (err) {
      setError(err.message || "Server error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const validationSchema = yup.object({
    email: yup.string().email("Invalid email").required("Required"),
    password: yup.string().min(6).required("Required"),
  });

  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="100vh"
      sx={{ px: 2 }}
    >
      <Paper
        sx={{
          width: 380,
          p: 4,
          borderRadius: "18px",
          backdropFilter: "blur(16px)",
          background: alpha(theme.palette.background.paper, 0.7),
          border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
          boxShadow:
            theme.palette.mode === "dark"
              ? "0 20px 60px rgba(0,0,0,0.6)"
              : "0 20px 60px rgba(0,0,0,0.08)",
        }}
      >
        {/* Header */}
        <Box mb={3}>
          <Typography variant="h4" fontWeight={600}>
            Welcome back
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Sign in to continue
          </Typography>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Formik
          initialValues={{ email: "", password: "" }}
          validationSchema={validationSchema}
          onSubmit={handleFormSubmit}
        >
          {({
            values,
            errors,
            touched,
            handleChange,
            handleBlur,
            handleSubmit,
          }) => (
            <form onSubmit={handleSubmit} noValidate>
              {/* EMAIL */}
              <TextField
                fullWidth
                size="small"
                label="Email"
                name="email"
                value={values.email}
                onChange={handleChange}
                onBlur={handleBlur}
                autoFocus
                autoComplete="email"
                error={!!touched.email && !!errors.email}
                helperText={touched.email && errors.email}
                sx={inputStyles(theme)}
              />

              {/* PASSWORD */}
              <TextField
                fullWidth
                size="small"
                label="Password"
                type={showPassword ? "text" : "password"}
                name="password"
                value={values.password}
                onChange={handleChange}
                onBlur={handleBlur}
                autoComplete="current-password"
                error={!!touched.password && !!errors.password}
                helperText={touched.password && errors.password}
                sx={inputStyles(theme)}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() =>
                          setShowPassword((prev) => !prev)
                        }
                        edge="end"
                      >
                        {showPassword ? (
                          <VisibilityOff fontSize="small" />
                        ) : (
                          <Visibility fontSize="small" />
                        )}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              {/* OPTIONS */}
              <Box display="flex" justifyContent="space-between" mb={2}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={rememberMe}
                      onChange={(e) =>
                        setRememberMe(e.target.checked)
                      }
                      size="small"
                    />
                  }
                  label={<Typography variant="body2">Remember</Typography>}
                />

                <Link
                  to="/forgot-password"
                  style={{
                    fontSize: "0.8rem",
                    color: theme.palette.primary.main,
                    textDecoration: "none",
                  }}
                >
                  Forgot?
                </Link>
              </Box>

              {/* BUTTON */}
              <Button
                fullWidth
                type="submit"
                variant="contained"
                disabled={loading}
                sx={{
                  py: 1.2,
                  borderRadius: "10px",
                  fontWeight: 600,
                }}
              >
                {loading ? (
                  <CircularProgress size={20} color="inherit" />
                ) : (
                  "Sign In"
                )}
              </Button>

              <Divider sx={{ my: 3 }} />

              <Typography variant="body2" textAlign="center">
                Don’t have an account?{" "}
                <Link
                  to="/register"
                  style={{
                    color: theme.palette.primary.main,
                    fontWeight: 500,
                    textDecoration: "none",
                  }}
                >
                  Create one
                </Link>
              </Typography>
            </form>
          )}
        </Formik>
      </Paper>
    </Box>
  );
};

export default Login;

/* 🔥 INPUT STYLE FIX */
const inputStyles = (theme) => ({
  mb: 2.5,
  "& .MuiOutlinedInput-root": {
    borderRadius: "10px",
    background: alpha(theme.palette.background.paper, 0.5),
    backdropFilter: "blur(6px)",

    "& fieldset": {
      borderColor: alpha(theme.palette.divider, 0.25),
    },

    "&:hover fieldset": {
      borderColor: alpha(theme.palette.primary.main, 0.4),
    },

    "&.Mui-focused fieldset": {
      borderColor: theme.palette.primary.main,
      borderWidth: "1px", // removes thick blue outline
    },
  },

  "& .MuiInputLabel-root": {
    fontSize: "0.85rem",
  },

  /* 🚫 Kill ugly autofill blue */
  "& input:-webkit-autofill": {
    WebkitBoxShadow: `0 0 0 100px ${alpha(
      theme.palette.background.paper,
      0.7
    )} inset !important`,
    WebkitTextFillColor: theme.palette.text.primary,
    transition: "background-color 9999s ease-in-out 0s",
  },
});