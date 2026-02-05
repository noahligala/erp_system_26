import React, { useContext, useState, useRef, useEffect } from "react";
import {
  Box,
  IconButton,
  useTheme,
  InputBase,
  Menu,
  MenuItem,
  Typography,
  Popover, Tooltip,
  Paper,
  List,
  ListItem,
  ListItemText,
} from "@mui/material";
import { ColorModeContext, tokens } from "../../theme";
import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import NotificationsOutlinedIcon from "@mui/icons-material/NotificationsOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import PersonOutlinedIcon from "@mui/icons-material/PersonOutlined";
import SearchIcon from "@mui/icons-material/Search";
import { useNavigate } from "react-router-dom";
import { secureStore } from "../../utils/storage";
import LogoutButton from "../../scenes/global/LogoutButton";

// ✅ Local Search Index Builder
const buildSearchIndex = (employees = []) => {
  const staticRoutes = [
    { label: "Main Dashboard", path: "/", type: "Page", keywords: ["dashboard", "home", "overview"] },
    // Update paths to match your actual routes
    { label: "Employees", path: "/team", type: "Module", keywords: ["hrm", "employee", "staff", "workers", "team"] },
    { label: "Leave Management", path: "/hrm/manage-leave", type: "Page", keywords: ["leave", "vacation", "days off", "manage"] },
    { label: "Job Openings", path: "/recruitment/openings", type: "Module", keywords: ["jobs", "recruitment", "careers", "openings"] },
    { label: "Applicants", path: "/recruitment/applicants", type: "Module", keywords: ["applicants", "candidates", "recruitment"] },
    { label: "Contacts", path: "/contacts", type: "Page", keywords: ["contacts", "directory"] },
    { label: "Invoices", path: "/invoices", type: "Page", keywords: ["invoices", "billing", "finance"] },
    { label: "Profile Form", path: "/form", type: "Page", keywords: ["form", "user", "profile"] },
    { label: "Calendar", path: "/calendar", type: "Page", keywords: ["calendar", "events", "schedule"] },
    { label: "FAQ", path: "/faq", type: "Page", keywords: ["faq", "help", "questions"] },
    // Add other routes...
  ];

  // This will be empty for now, but is ready if you pass employees prop later
  const employeeEntries = employees.map((emp) => ({
    label: `${emp.firstName} ${emp.lastName}`,
    path: `/hrm/employee-profile/${emp.id}`, // Corrected path
    type: "Employee",
    keywords: [emp.firstName, emp.lastName, "employee", "staff", "profile"],
  }));

  return [...staticRoutes, ...employeeEntries];
};

// ✅ Fuzzy local search
const searchLocalData = (query, index) => {
  if (!query || query.trim() === "") return [];
  const lower = query.toLowerCase();

  return index.filter(
    (item) =>
      item.label.toLowerCase().includes(lower) ||
      (item.keywords && item.keywords.some((k) => k.toLowerCase().includes(lower)))
  );
};

// --- ✨ FIX: Corrected component signature ---
const Topbar = ({ setIsSidebar }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const colorMode = useContext(ColorModeContext);
  const navigate = useNavigate();

  // 🔍 Build local search index
  const [indexData, setIndexData] = useState([]);

  // --- ✨ FIX: Added empty dependency array [] ---
  // This hook now runs only ONCE on mount, which breaks the infinite loop.
  // We pass an empty array to buildSearchIndex because App.js isn't providing employee data here.
  useEffect(() => {
    setIndexData(buildSearchIndex([]));
  }, []); // <--- Empty array breaks the loop

  // 🔸 States
  const [anchorNotif, setAnchorNotif] = useState(null);
  const [anchorUser, setAnchorUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState([]);
  const [anchorSearch, setAnchorSearch] = useState(null);
  const searchRef = useRef(null);
  const searchTimeout = useRef(null);

  // 🔔 Notification & User Menu Handlers
  const handleNotifOpen = (event) => setAnchorNotif(event.currentTarget);
  const handleNotifClose = () => setAnchorNotif(null);
  const handleUserOpen = (event) => setAnchorUser(event.currentTarget);
  const handleUserClose = () => setAnchorUser(null);

  const handleSettings = () => {
    handleUserClose();
    // Assuming you have a settings route
    navigate("/settings"); // Update path if different
  };

  /** 🔍 Debounced Search Logic */
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);

    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (value.trim() === "") {
      setResults([]);
      setAnchorSearch(null);
      return;
    }

    searchTimeout.current = setTimeout(() => {
      const matches = searchLocalData(value, indexData);
      setResults(
        matches.length
          ? matches
          : [{ label: "No matches found", type: "Info", path: "#" }]
      );
      setAnchorSearch(searchRef.current); // Open popover
    }, 200);
  };

  /** 🚀 Manual Search Submission */
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const term = searchTerm.trim().toLowerCase();
    if (!term) return;

    // Try to find a good match
    const match = indexData.find((item) =>
      item.label.toLowerCase().includes(term)
    );

    if (match && match.path) {
      navigate(match.path);
      setAnchorSearch(null);
      setSearchTerm("");
    } else {
      // Show "no matches" if submit fails
      setResults([{ label: "No matches found", type: "Info", path: "#" }]);
      setAnchorSearch(searchRef.current);
    }
  };

  /** 🧭 Handle Result Click */
  const handleResultClick = (path) => {
    if (path && path !== "#") {
      navigate(path);
      setAnchorSearch(null);
      setSearchTerm("");
    }
  };

  /** 🔒 Logout Handler */
  const handleLogout = () => {
    try {
      // Using secureStore for all session items as per your Sidebar
      secureStore.remove("user_data");
      secureStore.remove("accessToken");
      secureStore.remove("refreshToken");
      secureStore.remove("secret_key");
      // Clear other storages just in case
      localStorage.clear();
      sessionStorage.clear();
      
      navigate("/login", { replace: true });
      // Reload is good to ensure all states are reset
      setTimeout(() => window.location.reload(), 100);
    } catch (err) {
      console.error("Logout failed:", err);
      window.location.href = "/login"; // Force redirect
    }
  };

  /** ❌ Close search popover when clicking elsewhere */
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setAnchorSearch(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []); // This hook is safe as it has an empty dependency array

  return (
    <Box display="flex" justifyContent="space-between" p={2}>
      {/* 🔍 SEARCH BAR */}
      <Box
        component="form"
        onSubmit={handleSearchSubmit}
        display="flex"
        backgroundColor={colors.primary[400]}
        borderRadius="8px"
        alignItems="center"
        sx={{
          width: "320px",
          boxShadow:
            theme.palette.mode === "light"
              ? "0px 1px 3px rgba(0,0,0,0.1)"
              : "0px 1px 3px rgba(255,255,255,0.05)",
        }}
        ref={searchRef}
      >
        <InputBase
          sx={{ ml: 2, flex: 1 }}
          placeholder="Search..." // Simplified placeholder
          value={searchTerm}
          onChange={handleSearchChange}
        />
        <IconButton type="submit" sx={{ p: 1 }}>
          <SearchIcon />
        </IconButton>

        {/* 🔽 Search Suggestions */}
        <Popover
          open={Boolean(anchorSearch)}
          anchorEl={anchorSearch}
          onClose={() => setAnchorSearch(null)}
          anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
          transformOrigin={{ vertical: "top", horizontal: "left" }}
          disableAutoFocus
          disableEnforceFocus
          PaperProps={{
             style: { width: searchRef.current ? searchRef.current.clientWidth : '320px' } // Match width
          }}
        >
          <Paper sx={{ maxHeight: "300px", overflowY: "auto", background: colors.primary[400] }}>
            <List dense>
              {results.map((item, index) => (
                <ListItem
                  key={index}
                  button={item.path !== "#"}
                  onClick={() => handleResultClick(item.path)}
                  disabled={item.path === "#"}
                >
                  <ListItemText
                    primary={item.label}
                    secondary={item.type}
                    primaryTypographyProps={{
                      fontWeight: 500,
                      color:
                        item.type === "Info"
                          ? colors.grey[300]
                          : colors.grey[100],
                    }}
                    secondaryTypographyProps={{
                        color: colors.greenAccent[500]
                    }}
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Popover>
      </Box>

      {/* 🌙 ICONS */}
      <Box display="flex" alignItems="center">
        <IconButton onClick={colorMode.toggleColorMode}>
          {theme.palette.mode === "dark" ? (
            <LightModeOutlinedIcon />
          ) : (
            <DarkModeOutlinedIcon />
          )}
        </IconButton>

        <IconButton onClick={handleNotifOpen}>
          <NotificationsOutlinedIcon />
        </IconButton>

        <Tooltip title="Settings">
            <IconButton onClick={handleSettings}>
              <SettingsOutlinedIcon />
            </IconButton>
        </Tooltip>

        <Tooltip title="Profile & Logout">
            <IconButton onClick={handleUserOpen}>
              <PersonOutlinedIcon />
            </IconButton>
        </Tooltip>
      </Box>

      {/* 🔔 Notifications Popover */}
      <Popover
        open={Boolean(anchorNotif)}
        anchorEl={anchorNotif}
        onClose={handleNotifClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Box p={2} minWidth="250px" sx={{ background: colors.primary[400] }}>
          <Typography variant="h6" fontWeight="bold">
            Notifications
          </Typography>
          <Typography variant="body2" color="textSecondary">
            No new notifications
          </Typography>
        </Box>
      </Popover>

      {/* 👤 User Menu */}
      <Menu
        anchorEl={anchorUser}
        open={Boolean(anchorUser)}
        onClose={handleUserClose}
        MenuListProps={{
             sx: { background: colors.primary[400] }
        }}
      >
        {/* Update path to your actual profile form route */}
        <MenuItem onClick={() => { handleUserClose(); navigate("/form"); }}>Profile</MenuItem>
        <MenuItem onClick={handleSettings}>Settings</MenuItem>
        {/* Use LogoutButton if it's just a styled button, or call handleLogout */}
        <MenuItem onClick={handleLogout}>
            Logout
            {/* <LogoutButton />  // Or use this if it has its own logic */}
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default Topbar;