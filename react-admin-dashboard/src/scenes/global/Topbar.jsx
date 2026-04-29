import React, { useContext, useMemo, useRef, useState, useEffect, useCallback } from "react";
import {
  Box,
  IconButton,
  useTheme,
  InputBase,
  Menu,
  MenuItem,
  Typography,
  Popover,
  Tooltip,
  List,
  ListItemButton,
  ListItemText,
} from "@mui/material";

import { ColorModeContext } from "../../theme";

import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import NotificationsOutlinedIcon from "@mui/icons-material/NotificationsOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import PersonOutlinedIcon from "@mui/icons-material/PersonOutlined";
import SearchIcon from "@mui/icons-material/Search";

import { useNavigate } from "react-router-dom";
import { secureStore } from "../../utils/storage";

const buildSearchIndex = (employees = []) => {
  const staticRoutes = [
    {
      label: "Main Dashboard",
      path: "/",
      type: "Page",
      keywords: ["dashboard", "home", "overview"],
    },
    {
      label: "Employees",
      path: "/team",
      type: "Module",
      keywords: ["hrm", "employee", "staff", "workers", "team"],
    },
    {
      label: "Leave Management",
      path: "/hrm/manage-leave",
      type: "Page",
      keywords: ["leave", "vacation", "days off", "manage"],
    },
    {
      label: "Job Openings",
      path: "/recruitment/openings",
      type: "Module",
      keywords: ["jobs", "recruitment", "careers", "openings"],
    },
    {
      label: "Applicants",
      path: "/recruitment/applicants",
      type: "Module",
      keywords: ["applicants", "candidates", "recruitment"],
    },
    {
      label: "Contacts",
      path: "/contacts",
      type: "Page",
      keywords: ["contacts", "directory"],
    },
    {
      label: "Invoices",
      path: "/invoices",
      type: "Page",
      keywords: ["invoices", "billing", "finance"],
    },
    {
      label: "Profile Form",
      path: "/user/profile",
      type: "Page",
      keywords: ["user", "profile"],
    },
    {
      label: "Calendar",
      path: "/calendar",
      type: "Page",
      keywords: ["calendar", "events", "schedule"],
    },
    {
      label: "FAQ",
      path: "/faq",
      type: "Page",
      keywords: ["faq", "help", "questions"],
    },
  ];

  const employeeEntries = employees.map((emp) => ({
    label: `${emp.firstName || ""} ${emp.lastName || ""}`.trim(),
    path: `/hrm/employee-profile/${emp.id}`,
    type: "Employee",
    keywords: [
      emp.firstName,
      emp.lastName,
      "employee",
      "staff",
      "profile",
    ].filter(Boolean),
  }));

  return [...staticRoutes, ...employeeEntries];
};

const searchLocalData = (query, index) => {
  const lower = query.trim().toLowerCase();

  if (!lower) return [];

  return index
    .filter((item) => {
      const labelMatch = item.label.toLowerCase().includes(lower);
      const keywordMatch = item.keywords?.some((keyword) =>
        keyword.toLowerCase().includes(lower)
      );

      return labelMatch || keywordMatch;
    })
    .slice(0, 8);
};

const Topbar = ({ setIsSidebar, employees = [] }) => {
  const theme = useTheme();
  const styles = theme.topbar;
  const colorMode = useContext(ColorModeContext);
  const navigate = useNavigate();

  const searchRef = useRef(null);
  const searchTimeout = useRef(null);

  const indexData = useMemo(() => buildSearchIndex(employees), [employees]);

  const [anchorNotif, setAnchorNotif] = useState(null);
  const [anchorUser, setAnchorUser] = useState(null);
  const [anchorSearch, setAnchorSearch] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState([]);

  const handleNotifOpen = (event) => setAnchorNotif(event.currentTarget);
  const handleNotifClose = () => setAnchorNotif(null);

  const handleUserOpen = (event) => setAnchorUser(event.currentTarget);
  const handleUserClose = () => setAnchorUser(null);

  const closeSearch = useCallback(() => {
    setAnchorSearch(null);
  }, []);

  const clearSearch = useCallback(() => {
    setSearchTerm("");
    setResults([]);
    setAnchorSearch(null);
  }, []);

  const handleSettings = useCallback(() => {
    handleUserClose();
    navigate("/settings");
  }, [navigate]);

  const handleSearchChange = (event) => {
    const value = event.target.value;
    setSearchTerm(value);

    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    if (!value.trim()) {
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

      setAnchorSearch(searchRef.current);
    }, 180);
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();

    const term = searchTerm.trim().toLowerCase();

    if (!term) return;

    const match = indexData.find(
      (item) =>
        item.label.toLowerCase().includes(term) ||
        item.keywords?.some((keyword) => keyword.toLowerCase().includes(term))
    );

    if (match?.path && match.path !== "#") {
      navigate(match.path);
      clearSearch();
      return;
    }

    setResults([{ label: "No matches found", type: "Info", path: "#" }]);
    setAnchorSearch(searchRef.current);
  };

  const handleResultClick = (path) => {
    if (!path || path === "#") return;

    navigate(path);
    clearSearch();
  };

  const handleLogout = () => {
    try {
      secureStore.remove("user_data");
      secureStore.remove("accessToken");
      secureStore.remove("refreshToken");
      secureStore.remove("secret_key");

      localStorage.clear();
      sessionStorage.clear();

      navigate("/login", { replace: true });

      setTimeout(() => {
        window.location.reload();
      }, 100);
    } catch (err) {
      console.error("Logout failed:", err);
      window.location.href = "/login";
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        closeSearch();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);

      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
    };
  }, [closeSearch]);

  return (
    <Box sx={styles.root}>
      <Box
        component="form"
        onSubmit={handleSearchSubmit}
        ref={searchRef}
        sx={styles.searchWrap}
      >
        <InputBase
          sx={styles.searchInput}
          placeholder="Search modules, pages, employees..."
          value={searchTerm}
          onChange={handleSearchChange}
          inputProps={{
            "aria-label": "Search",
          }}
        />

        <IconButton type="submit" sx={styles.searchButton}>
          <SearchIcon fontSize="small" />
        </IconButton>

        <Popover
          open={Boolean(anchorSearch)}
          anchorEl={anchorSearch}
          onClose={closeSearch}
          anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
          transformOrigin={{ vertical: "top", horizontal: "left" }}
          disableAutoFocus
          disableEnforceFocus
          PaperProps={{
            sx: {
              ...styles.searchPopoverPaper,
              width: searchRef.current ? searchRef.current.clientWidth : 320,
            },
          }}
        >
          <List dense sx={styles.searchList}>
            {results.map((item, index) => (
              <ListItemButton
                key={`${item.label}-${index}`}
                disabled={item.path === "#"}
                onClick={() => handleResultClick(item.path)}
                sx={styles.searchItem}
              >
                <ListItemText
                  primary={item.label}
                  secondary={item.type}
                  primaryTypographyProps={styles.searchPrimary}
                  secondaryTypographyProps={styles.searchSecondary}
                />
              </ListItemButton>
            ))}
          </List>
        </Popover>
      </Box>

      <Box sx={styles.actions}>
        <Tooltip
          title={
            theme.palette.mode === "dark"
              ? "Switch to light mode"
              : "Switch to dark mode"
          }
        >
          <IconButton onClick={colorMode.toggleColorMode} sx={styles.actionButton}>
            {theme.palette.mode === "dark" ? (
              <LightModeOutlinedIcon fontSize="small" />
            ) : (
              <DarkModeOutlinedIcon fontSize="small" />
            )}
          </IconButton>
        </Tooltip>

        <Tooltip title="Notifications">
          <IconButton onClick={handleNotifOpen} sx={styles.actionButton}>
            <NotificationsOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        <Tooltip title="Settings">
          <IconButton onClick={handleSettings} sx={styles.actionButton}>
            <SettingsOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        <Tooltip title="Profile and logout">
          <IconButton onClick={handleUserOpen} sx={styles.actionButton}>
            <PersonOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      <Popover
        open={Boolean(anchorNotif)}
        anchorEl={anchorNotif}
        onClose={handleNotifClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        PaperProps={{
          sx: styles.popoverPaper,
        }}
      >
        <Box sx={styles.notificationBox}>
          <Typography sx={styles.notificationTitle}>Notifications</Typography>
          <Typography sx={styles.notificationText}>
            No new notifications
          </Typography>
        </Box>
      </Popover>

      <Menu
        anchorEl={anchorUser}
        open={Boolean(anchorUser)}
        onClose={handleUserClose}
        PaperProps={{
          sx: styles.menuPaper,
        }}
        MenuListProps={{
          sx: styles.menuList,
        }}
      >
        <MenuItem
          sx={styles.menuItem}
          onClick={() => {
            handleUserClose();
            navigate("/user/profile");
          }}
        >
          Profile
        </MenuItem>

        <MenuItem sx={styles.menuItem} onClick={handleSettings}>
          Settings
        </MenuItem>

        <MenuItem sx={styles.dangerMenuItem} onClick={handleLogout}>
          Logout
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default Topbar;