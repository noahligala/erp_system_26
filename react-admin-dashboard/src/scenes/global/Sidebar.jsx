// SidebarComponent.jsx
import React, { useState, useEffect, useRef } from "react";
import { Sidebar, Menu, MenuItem, SubMenu } from "react-pro-sidebar";
import { Box, Typography, Avatar, useTheme, IconButton } from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";
import { tokens } from "../../theme";
import { secureStore } from "../../utils/storage";

import {
  HomeOutlined,
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
  GroupWorkOutlined,
  BusinessCenterOutlined,
  BeachAccessOutlined,
  DataUsageOutlined,
  ArticleOutlined,
  AssignmentIndOutlined,
  WorkOutlineOutlined,
  AccountBalanceOutlined,
  ReceiptLongOutlined,
  RequestQuoteOutlined,
  AssessmentOutlined,
  AccountTreeOutlined,
  SyncAltOutlined,
  MoneyOutlined,
  CardMembershipRounded,
  PaymentOutlined,
  SettingsOutlined,
  StorageOutlined,
  BackupOutlined,
  UploadFileOutlined
} from "@mui/icons-material";

/*
  Behavior summary:
  - `isSidebar` (prop) is the "source of truth" (open/closed).
  - We keep an internal `internalCollapsed` that lags when closing so text can fade/slide first.
  - `textVisible` toggles the text fade+slide.
  - CSS classes (.collapsed / .expanded / .text-hidden / .text-visible) control transitions.
*/

// --- Item Component (menu text wrapped in .menu-text span) ---
const Item = ({ title, to, icon, selected, handleNavigate }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  return (
    <MenuItem
      active={selected}
      style={{ color: colors.grey[100] }}
      onClick={() => handleNavigate(to)}
      icon={icon}
      rootStyles={{
        ['& .ps-menu-button:hover']: {
          backgroundColor: `${colors.primary[800]} !important`,
          color: `${colors.greenAccent[400]} !important`,
        },
        ['&.ps-active > .ps-menu-button']: {
          backgroundColor: `${colors.primary[700]} !important`,
          color: `${colors.greenAccent[500]} !important`,
          fontWeight: "bold",
          borderRadius: "6px",
        },
      }}
    >
      <span className="menu-text" style={{ display: "inline-block" }}>{title}</span>
    </MenuItem>
  );
};

const SidebarComponent = ({ isSidebar, setIsSidebar }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const location = useLocation();
  const navigate = useNavigate();
  const sidebarRef = useRef(null);

  const [selectedTitle, setSelectedTitle] = useState("Dashboard");

  // internal state that lags to allow text animation first
  const [internalCollapsed, setInternalCollapsed] = useState(!isSidebar);
  // controls menu text visibility/transform
  const [textVisible, setTextVisible] = useState(isSidebar);

  useEffect(() => {
    const path = location.pathname;
    if (path === "/") setSelectedTitle("Dashboard");
    else if (path.startsWith("/hrm") || path.startsWith("/team")) setSelectedTitle("Human Resources");
    else if (path.startsWith("/recruitment")) setSelectedTitle("Recruitment");
    else if (path.startsWith("/accounts") || path.startsWith("/accounting") || path.startsWith("/bills")) setSelectedTitle("Accounting");
    else if (path.startsWith("/sales")) setSelectedTitle("Sales");
    else if (path.startsWith("/data")) setSelectedTitle("Data");
    else if (path.startsWith("/form") || path.startsWith("/calendar") || path.startsWith("/faq")) setSelectedTitle("Pages");
    else if (path.startsWith("/bar") || path.startsWith("/pie") || path.startsWith("/line") || path.startsWith("/geography")) setSelectedTitle("Charts");
    else setSelectedTitle("Dashboard");
  }, [location.pathname]);

  const user = secureStore.get("user_data") || { name: "User", profileImage: null };
  const getInitials = (name) => {
    if (!name) return "U";
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return parts[0].charAt(0).toUpperCase() + parts[parts.length - 1].charAt(0).toUpperCase();
  };
  const initials = getInitials(user.name);

  // When parent prop changes, orchestrate sequence:
  // Close: textVisible -> false (fade+slide) => after delay setInternalCollapsed(true)
  // Open: setInternalCollapsed(false) => after delay setTextVisible(true)
  useEffect(() => {
    let t1;
    if (!isSidebar) {
      // closing: hide text first
      setTextVisible(false);
      // then collapse after text animation completes
      t1 = setTimeout(() => setInternalCollapsed(true), 140); // 120-180ms works well
    } else {
      // opening: expand width first, then show text
      setInternalCollapsed(false);
      t1 = setTimeout(() => setTextVisible(true), 160);
    }
    return () => clearTimeout(t1);
  }, [isSidebar]);

  // initial mount: ensure internal states reflect prop nicely
  useEffect(() => {
    setInternalCollapsed(!isSidebar);
    setTextVisible(isSidebar);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const collapsed = internalCollapsed; // passed to react-pro-sidebar
  const toggleSidebar = () => {
    // still notify parent immediately (parent state flip)
    setIsSidebar(!isSidebar);
    // internal state will animate as effect above handles timing
  };

  // Auto-expand if submenu clicked while collapsed
  const handleSubMenuClick = () => {
    if (collapsed) {
      setIsSidebar(true);
    }
  };

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isSidebar && sidebarRef.current && !sidebarRef.current.contains(event.target)) {
        setIsSidebar(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isSidebar, setIsSidebar]);

  const isSelected = (pathPrefix) => location.pathname.startsWith(pathPrefix);
  const isExactlySelected = (path) => location.pathname === path;
  const handleNavigate = (to) => navigate(to);

  // Wrapper width transitions — delay when collapsing (so text fades first),
  // no extra delay when opening (expand quickly then reveal text)
  const wrapperWidth = collapsed ? "80px" : "270px";
  const wrapperTransition = collapsed
    ? "width 240ms cubic-bezier(.2,.8,.2,1) 120ms" // collapse delayed
    : "width 200ms cubic-bezier(.2,.8,.2,1) 0ms";    // expand immediate

  return (
    <Box
      ref={sidebarRef}
      className={`${collapsed ? "collapsed" : "expanded"} ${textVisible ? "text-visible" : "text-hidden"}`}
      sx={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        zIndex: 1000,
        width: wrapperWidth,
        minWidth: wrapperWidth,
        transition: wrapperTransition,
        // root styles for react-pro-sidebar internals
        "& .ps-sidebar-root": {
          border: "none !important",
          backgroundColor: `${colors.primary[400]} !important`,
          height: "100%",
        },
        "& .ps-sidebar-container": {
          height: "100% !important",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: `${colors.primary[400]} !important`,
          overflowY: "auto !important",
          overflowX: "hidden !important",
          paddingRight: collapsed ? "0px" : "6px",
          // ensure the inner width smoothly follows parent; we do not want it to snap
          transition: "padding-right 180ms ease-in-out, background 180ms",
        },
        "& .ps-menu-root": { flexGrow: 1, paddingBottom: "20px" },

        /* menu button baseline */
        "& .ps-menuitem-root > .ps-menu-button": {
          color: colors.grey[100],
          borderRadius: "6px",
          margin: "2px 0",
          transition: "background-color 180ms ease, color 180ms ease",
        },
        "& .ps-submenu-root > .ps-menu-button": {
          color: colors.grey[100],
          borderRadius: "6px",
          margin: "2px 0",
          transition: "background-color 180ms ease, color 180ms ease",
        },
        "& .ps-menu-button:hover": {
          backgroundColor: `${colors.primary[800]} !important`,
          color: `${colors.greenAccent[400]} !important`,
        },
        "& .ps-menuitem-root.ps-active > .ps-menu-button": {
          backgroundColor: `${colors.primary[700]} !important`,
          color: `${colors.greenAccent[500]} !important`,
          fontWeight: "bold",
          borderRadius: "6px",
        },
        "& .ps-submenu-content": {
          backgroundColor: "transparent !important",
          paddingLeft: collapsed ? "0px" : "15px",
        },
        "& .ps-submenu-root .ps-menuitem-root > .ps-menu-button": {
          margin: "1px 0",
          fontSize: "0.9rem",
        },
        "& .ps-submenu-expand-icon": { color: `${colors.grey[300]} !important` },

        /* --- Menu text animation (fade + slide) --- */
        // menu-text default
        "& .menu-text": {
          display: "inline-block",
          whiteSpace: "nowrap",
          verticalAlign: "middle",
          transition: "opacity 140ms cubic-bezier(.2,.8,.2,1), transform 160ms cubic-bezier(.2,.8,.2,1)",
          opacity: 1,
          transform: "translateX(0)",
          lineHeight: 1,
        },

        // when text-hidden class present (we set on root via className)
        "&.text-hidden .menu-text": {
          opacity: 0,
          transform: "translateX(-8px)",
          pointerEvents: "none",
        },

        // when collapsed and still text-visible (edge cases), keep small padding
        "&.collapsed .ps-menu-button": {
          paddingLeft: "12px !important",
        },

        // logo styles: we use .logo-text class to animate similarly
        "& .logo-text": {
          display: "inline-block",
          transition: "opacity 160ms ease, transform 160ms ease",
          opacity: 1,
          transform: "translateX(0)",
        },
        "&.text-hidden .logo-text": {
          opacity: 0,
          transform: "translateX(-10px)",
        },

        // ensure avatar & icons do not shift abruptly
        "& .MuiAvatar-root": {
          transition: "width 200ms ease, height 200ms ease",
        },
      }}
    >
      {/* react-pro-sidebar expects collapsed prop */}
      <Sidebar collapsed={collapsed} backgroundColor={colors.primary[400]} width={collapsed ? "80px" : "270px"}>
        <Menu iconShape="square">
          {/* LOGO + TOGGLE ICON */}
          <MenuItem
            onClick={toggleSidebar}
            icon={collapsed ? <MenuOutlined /> : undefined}
            style={{ margin: "10px 0 20px 0", color: colors.grey[100], backgroundColor: "transparent" }}
            rootStyles={{ ['& > .ps-menu-button:hover']: { backgroundColor: 'transparent !important', color: `${colors.grey[100]} !important` } }}
          >
            {/* logo text uses logo-text class so it fades+slides with menu-text */}
            <Box display="flex" justifyContent="space-between" alignItems="center" ml="15px" width="100%">
              <span className="logo-text menu-text" style={{ fontSize: "1.25rem", fontWeight: 700 }}>
                LigcoSync
              </span>

              {!collapsed && (
                <IconButton onClick={toggleSidebar} sx={{ color: colors.grey[100] }}>
                  <MenuOutlined />
                </IconButton>
              )}
            </Box>
          </MenuItem>

          {/* USER PROFILE */}
          <Box sx={{ mb: collapsed ? 0 : "25px", px: collapsed ? "6px" : "0px" }}>
            {!collapsed ? (
              <Box mb="10px" textAlign="center">
                <Box display="flex" justifyContent="center" alignItems="center">
                  {user.profileImage ? (
                    <Avatar alt={user.name} src={user.profileImage} sx={{ width: 90, height: 90, cursor: "pointer" }} />
                  ) : (
                    <Avatar sx={{ width: 90, height: 90, cursor: "pointer", fontSize: "2.2rem", bgcolor: colors.greenAccent[600], color: colors.grey[100] }}>
                      {initials}
                    </Avatar>
                  )}
                </Box>
                <Box textAlign="center" mt="10px">
                  <span className="menu-text" style={{ fontSize: "1rem", fontWeight: 600 }}>{user.name}</span>
                </Box>
              </Box>
            ) : (
              // when fully collapsed, show only avatar (smaller)
              <Box display="flex" justifyContent="center" alignItems="center" py="10px">
                {user.profileImage ? (
                  <Avatar alt={user.name} src={user.profileImage} sx={{ width: 36, height: 36, cursor: "pointer" }} />
                ) : (
                  <Avatar sx={{ width: 36, height: 36, fontSize: "1rem", bgcolor: colors.greenAccent[600], color: colors.grey[100] }}>{initials}</Avatar>
                )}
              </Box>
            )}
          </Box>

          {/* MENU ITEMS */}
          <Box paddingLeft={collapsed ? undefined : "10%"}>
            <Item title="Dashboard" to="/" icon={<HomeOutlined />} selected={isExactlySelected("/")} handleNavigate={handleNavigate} />

            {/* HRM */}
            <SubMenu
              label={<span className="menu-text">Human Resources</span>}
              icon={<GroupWorkOutlined />}
              onClick={handleSubMenuClick}
              style={{ backgroundColor: "transparent" }}
              rootStyles={{
                ['& > .ps-menu-button']: { color: selectedTitle === "Human Resources" ? colors.greenAccent[400] : colors.grey[100] },
                ['& > .ps-menu-button:hover']: { backgroundColor: `${colors.primary[800]} !important`, color: `${colors.greenAccent[400]} !important` },
              }}
            >
              <Item title="HRM Dashboard" to="/hrm/dashboard" icon={<HomeOutlined />} selected={isExactlySelected("/hrm/dashboard")} handleNavigate={handleNavigate} />
              <Item title="Employee List" to="/team" icon={<PeopleOutlined />} selected={isSelected("/team") || isSelected("/hrm/employee-profile")} handleNavigate={handleNavigate} />
              <Item title="Leave Management" to="/hrm/manage-leave" icon={<BeachAccessOutlined />} selected={isSelected("/hrm/manage-leave")} handleNavigate={handleNavigate} />
            </SubMenu>

            {/* Recruitment */}
            <SubMenu
              label={<span className="menu-text">Recruitment</span>}
              icon={<BusinessCenterOutlined />}
              onClick={handleSubMenuClick}
              style={{ backgroundColor: "transparent" }}
              rootStyles={{
                ['& > .ps-menu-button']: { color: selectedTitle === "Recruitment" ? colors.greenAccent[400] : colors.grey[100] },
                ['& > .ps-menu-button:hover']: { backgroundColor: `${colors.primary[800]} !important`, color: `${colors.greenAccent[400]} !important` },
              }}
            >
              <Item title="Job Openings" to="/recruitment/openings" icon={<WorkOutlineOutlined />} selected={isSelected("/recruitment/openings")} handleNavigate={handleNavigate} />
              <Item title="Applicants" to="/recruitment/applicants" icon={<AssignmentIndOutlined />} selected={isSelected("/recruitment/applicants")} handleNavigate={handleNavigate} />
            </SubMenu>

            {/* Accounting */}
            <SubMenu
              label={<span className="menu-text">Accounting</span>}
              icon={<AccountBalanceOutlined />}
              onClick={handleSubMenuClick}
              style={{ backgroundColor: "transparent" }}
              rootStyles={{
                ['& > .ps-menu-button']: { color: selectedTitle === "Accounting" ? colors.greenAccent[400] : colors.grey[100] },
                ['& > .ps-menu-button:hover']: { backgroundColor: `${colors.primary[800]} !important`, color: `${colors.greenAccent[400]} !important` },
              }}
            >
              <Item title="Accounts Dashboard" to="/accounts" icon={<HomeOutlined />} selected={isExactlySelected("/accounts")} handleNavigate={handleNavigate} />
              <Item title="Chart of Accounts" to="/accounts/chart-of-accounts" icon={<AccountTreeOutlined />} selected={isSelected("/accounts/chart-of-accounts")} handleNavigate={handleNavigate} />
              <Item title="Journal Entries" to="/accounts/journal-entries" icon={<ReceiptLongOutlined />} selected={isSelected("/accounts/journal-entries")} handleNavigate={handleNavigate} />
              <Item title="Expense Claims" to="/accounts/expenses" icon={<RequestQuoteOutlined />} selected={isSelected("/accounts/expenses")} handleNavigate={handleNavigate} />
              <Item title="Supplier Bills (AP)" to="/accounts/bills" icon={<ArticleOutlined />} selected={isSelected("/accounts/bills")} handleNavigate={handleNavigate} />
              <Item title="Bank Reconciliation" to="/accounts/reconciliation/bank" icon={<SyncAltOutlined />} selected={isSelected("/accounts/reconciliation/bank")} handleNavigate={handleNavigate} />
              <Item title="Payroll" to="/accounts/payroll" icon={<PaymentOutlined />} selected={isSelected("/accounts/payroll")} handleNavigate={handleNavigate} />
              <Item title="Payslips" to="/accounts/payslips" icon={<ArticleOutlined />} selected={isSelected("/accounts/payslips")} handleNavigate={handleNavigate} />
              <Item title="Financial Reports" to="/accounts/reports" icon={<AssessmentOutlined />} selected={isSelected("/accounts/reports")} handleNavigate={handleNavigate} />
            </SubMenu>

            {/* Sales */}
            <SubMenu
              label={<span className="menu-text">Sales</span>}
              icon={<DataUsageOutlined />}
              onClick={handleSubMenuClick}
              style={{ backgroundColor: "transparent" }}
              rootStyles={{
                ['& > .ps-menu-button']: { color: selectedTitle === "Sales" ? colors.greenAccent[400] : colors.grey[100] },
                ['& > .ps-menu-button:hover']: { backgroundColor: `${colors.primary[800]} !important`, color: `${colors.greenAccent[400]} !important` },
              }}
            >
              <Item title="Invoices" to="/sales/invoices" icon={<ReceiptOutlined />} selected={isSelected("/sales/invoices") && !isSelected("/sales/invoices/reports")} handleNavigate={handleNavigate} />
              <Item title="Customer Payments" to="/sales/payments/customer-payments" icon={<MoneyOutlined />} selected={isSelected("/sales/payments/customer-payments")} handleNavigate={handleNavigate} />
              <Item title="Invoice Reports" to="/sales/invoices/reports" icon={<CardMembershipRounded />} selected={isSelected("/sales/invoices/reports")} handleNavigate={handleNavigate} />
              <Item title="Stock Adjustment" to="/accounts/inventory/stock_adjustment" icon={<StorageOutlined />} selected={isSelected("/accounts/inventory/stock_adjustment")} handleNavigate={handleNavigate} />
            </SubMenu>

            {/* System Data */}
            <SubMenu
              label={<span className="menu-text">System Data</span>}
              icon={<StorageOutlined />}
              onClick={handleSubMenuClick}
              style={{ backgroundColor: "transparent" }}
              rootStyles={{
                ['& > .ps-menu-button']: { color: selectedTitle === "Data" ? colors.greenAccent[400] : colors.grey[100] },
                ['& > .ps-menu-button:hover']: { backgroundColor: `${colors.primary[800]} !important`, color: `${colors.greenAccent[400]} !important` },
              }}
            >
               <Item title="Contacts" to="/contacts" icon={<ContactsOutlined />} selected={isSelected("/contacts")} handleNavigate={handleNavigate} />
               <Item title="Imports" to="/data/imports" icon={<UploadFileOutlined />} selected={isSelected("/data/imports")} handleNavigate={handleNavigate} />
               <Item title="Backups" to="/data/backups" icon={<BackupOutlined />} selected={isSelected("/data/backups")} handleNavigate={handleNavigate} />
            </SubMenu>

            {/* Pages */}
            <SubMenu
              label={<span className="menu-text">Pages</span>}
              icon={<ArticleOutlined />}
              onClick={handleSubMenuClick}
              style={{ backgroundColor: "transparent" }}
              rootStyles={{
                ['& > .ps-menu-button']: { color: selectedTitle === "Pages" ? colors.greenAccent[400] : colors.grey[100] },
                ['& > .ps-menu-button:hover']: { backgroundColor: `${colors.primary[800]} !important`, color: `${colors.greenAccent[400]} !important` },
              }}
            >
              <Item title="Profile" to="/form" icon={<PersonOutlined />} selected={isSelected("/form")} handleNavigate={handleNavigate} />
              <Item title="Calendar" to="/calendar" icon={<CalendarTodayOutlined />} selected={isSelected("/calendar")} handleNavigate={handleNavigate} />
              <Item title="FAQ" to="/faq" icon={<HelpOutlineOutlined />} selected={isSelected("/faq")} handleNavigate={handleNavigate} />
            </SubMenu>

            {/* Charts */}
            <SubMenu
              label={<span className="menu-text">Charts</span>}
              icon={<BarChartOutlined />}
              onClick={handleSubMenuClick}
              style={{ backgroundColor: "transparent" }}
              rootStyles={{
                ['& > .ps-menu-button']: { color: selectedTitle === "Charts" ? colors.greenAccent[400] : colors.grey[100] },
                ['& > .ps-menu-button:hover']: { backgroundColor: `${colors.primary[800]} !important`, color: `${colors.greenAccent[400]} !important` },
              }}
            >
              <Item title="Bar Chart" to="/bar" icon={<BarChartOutlined />} selected={isSelected("/bar")} handleNavigate={handleNavigate} />
              <Item title="Pie Chart" to="/pie" icon={<PieChartOutlineOutlined />} selected={isSelected("/pie")} handleNavigate={handleNavigate} />
              <Item title="Line Chart" to="/line" icon={<TimelineOutlined />} selected={isSelected("/line")} handleNavigate={handleNavigate} />
              <Item title="Geography" to="/geography" icon={<MapOutlined />} selected={isSelected("/geography")} handleNavigate={handleNavigate} />
              <Item title="Settings" to="/pages/settings" icon={<SettingsOutlined />} selected={isSelected("/pages/settings")} handleNavigate={handleNavigate} />
            </SubMenu>
          </Box>
        </Menu>

        {/* FOOTER */}
        {!collapsed && (
          <Box textAlign="center" p="10px" sx={{ backgroundColor: colors.primary[400] }}>
            <span className="menu-text" style={{ display: "block", color: colors.grey[300] }}>LigcoSync</span>
            <span className="menu-text" style={{ display: "block", color: colors.grey[500], fontSize: "0.75rem" }}>Version 0.0.1</span>
          </Box>
        )}
      </Sidebar>
    </Box>
  );
};

export default SidebarComponent;
