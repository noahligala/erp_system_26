// src/App.jsx
import { ColorModeContext, useMode } from "./theme";
import { CssBaseline, ThemeProvider, Box } from "@mui/material";
import { Routes, Route } from "react-router-dom";
import Topbar from "./views/global/Topbar/Topbar.jsx";
import AppSidebar from "./views/global/sidebar/AppSidebar.jsx";
import Footer from "./views/global/Footer.jsx";

import Dashboard from "./views/dashboard/Index.jsx";
import Hrm from "./components/hrm/Hrm.jsx";
import Team from "./components/hrm/Team.jsx";
import SignIn from "./views/auth/SignIn.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";

function App() {
  const [theme, colorMode] = useMode();

  return (
    <ColorModeContext.Provider value={colorMode}>
      <ThemeProvider theme={theme}>
        <CssBaseline />

        <Routes>
          {/* Public Route */}
          <Route path="/login" element={<SignIn />} />

          {/* Protected Layout */}
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <Box
                  sx={{
                    display: "flex",
                    height: "100%",
                    overflow: "hidden",
                  }}
                >
                  <AppSidebar />
                  <Box
                    component="main"
                    sx={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      height: "98vh",
                      overflow: "hidden",
                      position: "relative",
                    }}
                  >
                    <Topbar />
                    <Box
                      sx={{
                        flexGrow: 1,
                        overflowY: "auto",
                        px: 3,
                        py: 2,
                        bgcolor: theme.palette.background.default,
                      }}
                    >
                      <Routes>
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/hrm" element={<Hrm />} />
                        <Route path="/team" element={<Team />} />
                      </Routes>
                    </Box>
                    <Footer />
                  </Box>
                </Box>
              </ProtectedRoute>
            }
          />
        </Routes>
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}

export default App;
