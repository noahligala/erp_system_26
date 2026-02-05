import { useState, useEffect } from "react";
import { Sidebar, Menu, MenuItem } from "react-pro-sidebar";
import {
    Box,
    IconButton,
    Typography,
    useTheme,
    } from "@mui/material";
    import { Link, useLocation } from "react-router-dom";
    import {
    Dashboard,
    PeopleOutlined,
    ContactsOutlined,
    ReceiptOutlined,
    PersonOutlined,
    CalendarTodayOutlined,
    HelpOutlineOutlined,
    BarChartOutlined,
    PieChartOutlineOutlined,
    TimelineOutlined,
    MenuOutlined,
    MapOutlined,
    Business,
    } from "@mui/icons-material";
    import { tokens } from "../../../theme";

    const SidebarItem = ({ title, to, icon, isCollapsed }) => {
    const theme = useTheme();
    const colors = tokens(theme.palette.mode);
    const location = useLocation();
    const isActive = location.pathname === to;

    return (
        <MenuItem
        active={isActive}
        icon={icon}
        component={<Link to={to} />}
        style={{
            color: isActive ? theme.palette.secondary.main : theme.palette.text.secondary,
            backgroundColor: isActive
            ? theme.palette.mode === "dark"
                ? colors.primary[700]
                : colors.primary[100]
            : "transparent",
            borderLeft: isActive
            ? `3px solid ${theme.palette.secondary.main}`
            : "3px solid transparent",
            borderRadius: "6px",
            margin: "3px 0",
            padding: "6px 10px",
            transition: "all 0.25s ease-in-out",
        }}
        >
        {!isCollapsed && (
            <Typography
            sx={{
                fontWeight: isActive ? 600 : 400,
                fontSize: "0.85rem",
                ml: 0.5,
                color: isActive
                ? theme.palette.secondary.main
                : theme.palette.text.primary,
            }}
            >
            {title}
            </Typography>
        )}
        </MenuItem>
    );
    };

    const AppSidebar = () => {
    const theme = useTheme();
    const colors = tokens(theme.palette.mode);

    const [isCollapsed, setIsCollapsed] = useState(() => {
        const saved = localStorage.getItem("sidebarCollapsed");
        return saved ? JSON.parse(saved) : false;
    });

    useEffect(() => {
        localStorage.setItem("sidebarCollapsed", JSON.stringify(isCollapsed));
    }, [isCollapsed]);

    const sidebarBg = theme.palette.background.paper;
    const hoverBg =
        theme.palette.mode === "dark"
        ? colors.primary[800]
        : colors.primary[50];
    // const borderColor =
    //     theme.palette.mode === "dark" ? colors.grey[700] : colors.grey[300];

    return (
        <Box
        sx={{
            height: "100vh",
            display: "flex",
            "& .ps-sidebar-root": {
            border: "none",
            background: `${sidebarBg} !important`,
            },
            "& .ps-menu-button": {
            background: "transparent !important",
            padding: "6px 8px !important",
            minHeight: "32px !important",
            },
            "& .ps-menu-button:hover": {
            background: `${hoverBg} !important`,
            color: `${theme.palette.secondary.main} !important`,
            },
            "& .ps-menu-icon": {
            fontSize: "20px !important",
            color: `${theme.palette.text.secondary} !important`,
            },
            "& .ps-menu-button.active": {
            background: `${hoverBg} !important`,
            color: `${theme.palette.secondary.main} !important`,
            },
        }}
        >
        <Sidebar collapsed={isCollapsed} backgroundColor={sidebarBg}>
            <Menu>
            {/* HEADER */}
            <Box
                sx={{
                display: "flex",
                justifyContent: isCollapsed ? "center" : "space-between",
                alignItems: "center",
                px: isCollapsed ? 0 : 1.2,
                py: 1,
                }}
            >
                {!isCollapsed && (
                <Box display="flex" alignItems="center" gap={1}>
                    <Business sx={{ fontSize: 22, color: theme.palette.secondary.main }} />
                    <Box>
                    <Typography
                        variant="h6"
                        color={theme.palette.text.primary}
                        fontWeight={600}
                        sx={{ fontSize: "1rem" }}
                    >
                        VeSpo
                    </Typography>
                    <Typography
                        variant="caption"
                        color={theme.palette.secondary.main}
                        sx={{ fontSize: "0.65rem" }}
                    >
                        Enterprise Platform
                    </Typography>
                    </Box>
                </Box>
                )}
                <IconButton
                onClick={() => setIsCollapsed(!isCollapsed)}
                sx={{
                    color: theme.palette.text.secondary,
                    "&:hover": {
                    color: theme.palette.secondary.main,
                    backgroundColor: hoverBg,
                    },
                }}
                >
                <MenuOutlined fontSize="small" />
                </IconButton>
            </Box>

            {/* PROFILE */}
            {!isCollapsed && (
                <Box
                mt={5}
                mb={12}
                px={1.5}
                pt={5}
                display="flex"
                alignItems="center"
                gap={1.2}
                >
                <Box
                    sx={{
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                    fontWeight: 600,
                    fontSize: "0.9rem",
                    }}
                >
                    ER
                </Box>
                <Box>
                    <Typography
                    color={theme.palette.text.primary}
                    fontWeight={500}
                    sx={{ fontSize: "0.85rem" }}
                    >
                    Enterprise Admin
                    </Typography>
                    <Typography
                    variant="caption"
                    color={theme.palette.secondary.main}
                    sx={{ fontSize: "0.65rem" }}
                    >
                    Administrator
                    </Typography>
                </Box>
                </Box>
            )}

            {/* MENU ITEMS */}
            <Box sx={{ px: isCollapsed ? "2px" : "10px", mt: 0.5 }}>
                <SidebarItem title="Dashboard" to="/dashboard" icon={<Dashboard />} isCollapsed={isCollapsed} />
                <SidebarItem title="HRM" to="/hrm" icon={<PeopleOutlined />} isCollapsed={isCollapsed} />
                <SidebarItem title="Team" to="/team" icon={<PeopleOutlined />} isCollapsed={isCollapsed} />
                <SidebarItem title="Contacts" to="/contacts" icon={<ContactsOutlined />} isCollapsed={isCollapsed} />
                <SidebarItem title="Invoices" to="/invoices" icon={<ReceiptOutlined />} isCollapsed={isCollapsed} />
                <SidebarItem title="Profile" to="/form" icon={<PersonOutlined />} isCollapsed={isCollapsed} />
                <SidebarItem title="Calendar" to="/calendar" icon={<CalendarTodayOutlined />} isCollapsed={isCollapsed} />
                <SidebarItem title="Help Center" to="/faq" icon={<HelpOutlineOutlined />} isCollapsed={isCollapsed} />
                <SidebarItem title="Bar Charts" to="/bar" icon={<BarChartOutlined />} isCollapsed={isCollapsed} />
                <SidebarItem title="Pie Charts" to="/pie" icon={<PieChartOutlineOutlined />} isCollapsed={isCollapsed} />
                <SidebarItem title="Line Charts" to="/line" icon={<TimelineOutlined />} isCollapsed={isCollapsed} />
                <SidebarItem title="Geography Maps" to="/geography" icon={<MapOutlined />} isCollapsed={isCollapsed} />
            </Box>

            {/* FOOTER */}
            {!isCollapsed && (
                <Box
                sx={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    p: 1,
                    
                }}
                >
                <Typography
                    variant="caption"
                    color={theme.palette.text.secondary}
                    sx={{ fontSize: "0.6rem", display: "block", textAlign: "center"}}
                >
                    ERP System v1.0
                </Typography>
                {/* <Typography
                    variant="caption"
                    color={theme.palette.text.disabled}
                    sx={{ fontSize: "0.5rem", display: "block" }}
                >
                    ©2025 Ligco Technologies
                </Typography> */}
                </Box>
            )}
            </Menu>
        </Sidebar>
        </Box>
    );
};

export default AppSidebar;
