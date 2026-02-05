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
} from "@mui/material";
import { tokens } from "../../theme";
import { Formik } from "formik";
import * as yup from "yup";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../api/AuthProvider";
import { secureStore } from "../../utils/storage";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const { login } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rememberMe, setRememberMe] = useState(true);

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
        const redirectTo = secureStore.get("lastVisitedPath") || "/dashboard";
        secureStore.remove("lastVisitedPath");
        navigate(redirectTo, { replace: true });
      } else {
        setError(response.error || "Invalid email or password.");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError(err.message || "A network or server error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const initialValues = { email: "", password: "" };

  const validationSchema = yup.object().shape({
    email: yup.string().email("Invalid email address").required("Required"),
    password: yup.string().min(6, "At least 6 characters").required("Required"),
  });

  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      height="100vh"
      sx={{
        background: `linear-gradient(135deg, ${colors.primary[400]}, ${colors.primary[600]})`,
      }}
    >
      <Paper
        elevation={6}
        sx={{
          width: "400px",
          p: 5,
          borderRadius: "16px",
          backgroundColor: colors.primary[500],
          boxShadow: "0px 6px 25px rgba(0,0,0,0.35)",
        }}
      >
        <Typography
          variant="h3"
          textAlign="center"
          fontWeight="bold"
          mb={3}
          color={colors.greenAccent[500]}
        >
          Sign In
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: "8px" }}>
            {error}
          </Alert>
        )}

        <Formik
          onSubmit={handleFormSubmit}
          initialValues={initialValues}
          validationSchema={validationSchema}
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
              <TextField
                fullWidth
                variant="filled"
                type="email"
                label="Email Address"
                onBlur={handleBlur}
                onChange={handleChange}
                value={values.email}
                name="email"
                autoComplete="email"
                autoFocus
                error={!!touched.email && !!errors.email}
                helperText={touched.email && errors.email}
                sx={{
                  mb: 3,
                  "& .MuiInputBase-input:-webkit-autofill": {
                    WebkitBoxShadow: `0 0 0 100px ${colors.primary[500]} inset`,
                    WebkitTextFillColor: colors.grey[100],
                  },
                }}
              />

              <TextField
                fullWidth
                variant="filled"
                type="password"
                label="Password"
                onBlur={handleBlur}
                onChange={handleChange}
                value={values.password}
                name="password"
                autoComplete="current-password"
                error={!!touched.password && !!errors.password}
                helperText={touched.password && errors.password}
                sx={{
                  mb: 2,
                  "& .MuiInputBase-input:-webkit-autofill": {
                    WebkitBoxShadow: `0 0 0 100px ${colors.primary[500]} inset`,
                    WebkitTextFillColor: colors.grey[100],
                  },
                }}
              />

              <FormControlLabel
                control={
                  <Checkbox
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    color="secondary"
                  />
                }
                label="Remember Me"
                sx={{ mb: 2, color: colors.grey[100] }}
              />

              <Button
                fullWidth
                type="submit"
                variant="contained"
                color="secondary"
                disabled={loading}
                sx={{
                  mt: 1,
                  py: 1.3,
                  fontWeight: "bold",
                  borderRadius: "10px",
                  textTransform: "none",
                  fontSize: "1rem",
                  transition: "all 0.25s ease",
                  "&:hover": {
                    transform: "scale(1.02)",
                  },
                }}
              >
                {loading ? (
                  <>
                    <CircularProgress
                      size={22}
                      color="inherit"
                      sx={{ mr: 1 }}
                    />
                    Signing In...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>

              <Typography
                variant="body2"
                textAlign="center"
                mt={3}
                color={colors.grey[300]}
              >
                Don’t have an account?{" "}
                <Link
                  to="/register"
                  style={{
                    color: colors.greenAccent[400],
                    textDecoration: "none",
                    fontWeight: "bold",
                  }}
                >
                  Register
                </Link>
              </Typography>

              <Typography
                variant="body2"
                textAlign="center"
                mt={1.5}
                color={colors.grey[400]}
              >
                Forgot your password?{" "}
                <Link
                  to="/forgot-password"
                  style={{
                    color: colors.greenAccent[400],
                    textDecoration: "none",
                    fontWeight: "bold",
                  }}
                >
                  Reset
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
