// Topbar.jsx
import { 
  Box, 
  IconButton, 
  InputBase, 
  useTheme, 
  Tooltip, 
  Divider,
  Menu,
  MenuItem,
  ListItemIcon,
  Typography,
  Avatar
} from "@mui/material";
import { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ColorModeContext, tokens } from "../../../theme";
import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import SearchIcon from "@mui/icons-material/Search";
import NotificationsOutlinedIcon from "@mui/icons-material/NotificationsOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import AccountCircleOutlinedIcon from "@mui/icons-material/AccountCircleOutlined";
import LogoutIcon from "@mui/icons-material/Logout";
import PersonIcon from "@mui/icons-material/Person";
import SettingsIcon from "@mui/icons-material/Settings";

const Topbar = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const colorMode = useContext(ColorModeContext);
  const navigate = useNavigate();
  
  // State for account menu
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const bgColor = theme.palette.background.paper;
  const borderColor =
    theme.palette.mode === "dark" ? colors.grey[800] : colors.grey[300];
  const iconHoverBg =
    theme.palette.mode === "dark" ? colors.primary[700] : colors.primary[100];

  // Logout function
  const handleLogout = () => {
    // Clear user data from localStorage/sessionStorage
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    sessionStorage.removeItem('authToken');
    
    // Clear any app-specific state if needed
    // You might want to use context or Redux for this
    
    // Redirect to login page
    navigate('/login');
    
    // Close the menu
    handleClose();
  };

  // Menu handlers
  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  // Profile handler
  const handleProfile = () => {
    // Navigate to profile page or open profile modal
    console.log('Navigate to profile');
    handleClose();
  };

  // Settings handler
  const handleSettings = () => {
    // Navigate to settings page
    console.log('Navigate to settings');
    handleClose();
  };

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        px: 2.5,
        py: 1,
        backgroundColor: bgColor,
        borderBottom: `1px solid ${borderColor}`,
        position: "sticky",
        top: 0,
        zIndex: 1000,
        height: "60px",
      }}
    >
      {/* SEARCH BAR */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          backgroundColor:
            theme.palette.mode === "dark"
              ? colors.primary[600]
              : colors.primary[50],
          border: `1px solid ${borderColor}`,
          borderRadius: "8px",
          px: 1.5,
          py: 0.25,
          width: "260px",
          transition: "all 0.2s ease-in-out",
          "&:hover": {
            borderColor: theme.palette.secondary.main,
          },
        }}
      >
        <SearchIcon
          sx={{
            color: theme.palette.text.secondary,
            fontSize: "1.2rem",
            mr: 1,
          }}
        />
        <InputBase
          sx={{
            flex: 1,
            fontSize: "0.9rem",
            color: theme.palette.text.primary,
          }}
          placeholder="Search..."
        />
      </Box>

      {/* RIGHT SIDE ICONS */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
        }}
      >
        <Tooltip title="Notifications">
          <IconButton
            sx={{
              color: theme.palette.text.secondary,
              "&:hover": {
                backgroundColor: iconHoverBg,
                color: theme.palette.secondary.main,
              },
            }}
          >
            <NotificationsOutlinedIcon />
          </IconButton>
        </Tooltip>

        <Tooltip title="Settings">
          <IconButton
            sx={{
              color: theme.palette.text.secondary,
              "&:hover": {
                backgroundColor: iconHoverBg,
                color: theme.palette.secondary.main,
              },
            }}
          >
            <SettingsOutlinedIcon />
          </IconButton>
        </Tooltip>

        {/* Account Dropdown */}
        <Tooltip title="Account">
          <IconButton
            onClick={handleClick}
            sx={{
              color: theme.palette.text.secondary,
              "&:hover": {
                backgroundColor: iconHoverBg,
                color: theme.palette.secondary.main,
              },
            }}
          >
            <AccountCircleOutlinedIcon />
          </IconButton>
        </Tooltip>

        {/* Account Dropdown Menu */}
        <Menu
          anchorEl={anchorEl}
          open={open}
          onClose={handleClose}
          onClick={handleClose}
          PaperProps={{
            elevation: 3,
            sx: {
              overflow: 'visible',
              filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
              mt: 1.5,
              minWidth: 200,
              '& .MuiAvatar-root': {
                width: 32,
                height: 32,
                ml: -0.5,
                mr: 1,
              },
              '&:before': {
                content: '""',
                display: 'block',
                position: 'absolute',
                top: 0,
                right: 14,
                width: 10,
                height: 10,
                bgcolor: 'background.paper',
                transform: 'translateY(-50%) rotate(45deg)',
                zIndex: 0,
              },
            },
          }}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        >
          {/* User Info */}
          <MenuItem onClick={handleProfile}>
            <ListItemIcon>
              <Avatar sx={{ width: 24, height: 24, fontSize: '0.8rem' }}>
                JD
              </Avatar>
            </ListItemIcon>
            <Box>
              <Typography variant="body2" fontWeight="medium">
                John Doe
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Administrator
              </Typography>
            </Box>
          </MenuItem>
          
          <Divider />
          
          <MenuItem onClick={handleProfile}>
            <ListItemIcon>
              <PersonIcon fontSize="small" />
            </ListItemIcon>
            Profile
          </MenuItem>
          
          <MenuItem onClick={handleSettings}>
            <ListItemIcon>
              <SettingsIcon fontSize="small" />
            </ListItemIcon>
            Settings
          </MenuItem>
          
          <Divider />
          
          <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
            <ListItemIcon>
              <LogoutIcon fontSize="small" color="error" />
            </ListItemIcon>
            Logout
          </MenuItem>
        </Menu>

        <Divider
          orientation="vertical"
          flexItem
          sx={{
            mx: 1,
            borderColor: borderColor,
          }}
        />

        <Tooltip
          title={
            theme.palette.mode === "dark"
              ? "Switch to Light Mode"
              : "Switch to Dark Mode"
          }
        >
          <IconButton
            onClick={colorMode.toggleColorMode}
            sx={{
              color: theme.palette.text.secondary,
              "&:hover": {
                backgroundColor: iconHoverBg,
                color: theme.palette.secondary.main,
              },
            }}
          >
            {theme.palette.mode === "dark" ? (
              <DarkModeOutlinedIcon />
            ) : (
              <LightModeOutlinedIcon />
            )}
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
};

export default Topbar;