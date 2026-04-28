// SidebarComponent.jsx
import React, { useState, useEffect, useRef } from "react";
import { Sidebar, Menu, MenuItem, SubMenu } from "react-pro-sidebar";
import { Box, Avatar, useTheme, IconButton } from "@mui/material";
import { alpha } from "@mui/material/styles"; // Imported for modern hover states
import { useLocation, useNavigate } from "react-router-dom";
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

// --- Item Component (menu text wrapped in .menu-text span) ---
const Item = ({ title, to, icon, selected, handleNavigate }) => {
  const theme = useTheme();

  return (
    <MenuItem
      active={selected}
      style={{ color: theme.palette.text.primary }}
      onClick={() => handleNavigate(to)}
      icon={icon}
      rootStyles={{
        ['& .ps-menu-button:hover']: {
          backgroundColor: `${alpha(theme.palette.primary.main, 0.08)} !important`,
          color: `${theme.palette.primary.main} !important`,
        },
        ['&.ps-active > .ps-menu-button']: {
          backgroundColor: `${alpha(theme.palette.primary.main, 0.12)} !important`,
          color: `${theme.palette.primary.main} !important`,
          fontWeight: 600,
          borderRadius: `${theme.shape.borderRadius}px`,
        },
      }}
    >
      <span className="menu-text" style={{ display: "inline-block" }}>{title}</span>
    </MenuItem>
  );
};

const SidebarComponent = ({ isSidebar, setIsSidebar }) => {
  const theme = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const sidebarRef = useRef(null);

  const [selectedTitle, setSelectedTitle] = useState("Dashboard");
  const [internalCollapsed, setInternalCollapsed] = useState(!isSidebar);
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

  useEffect(() => {
    let t1;
    if (!isSidebar) {
      setTextVisible(false);
      t1 = setTimeout(() => setInternalCollapsed(true), 140); 
    } else {
      setInternalCollapsed(false);
      t1 = setTimeout(() => setTextVisible(true), 160);
    }
    return () => clearTimeout(t1);
  }, [isSidebar]);

  useEffect(() => {
    setInternalCollapsed(!isSidebar);
    setTextVisible(isSidebar);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const collapsed = internalCollapsed; 
  const toggleSidebar = () => setIsSidebar(!isSidebar);

  const handleSubMenuClick = () => {
    if (collapsed) setIsSidebar(true);
  };

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

  const wrapperWidth = collapsed ? "80px" : "270px";
  const wrapperTransition = collapsed
    ? "width 240ms cubic-bezier(.2,.8,.2,1) 120ms" 
    : "width 200ms cubic-bezier(.2,.8,.2,1) 0ms";    

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
        borderRight: `1px solid ${theme.palette.divider}`,
        "& .ps-sidebar-root": {
          border: "none !important",
          backgroundColor: `${theme.palette.background.paper} !important`,
          height: "100%",
        },
        "& .ps-sidebar-container": {
          height: "100% !important",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: `${theme.palette.background.paper} !important`,
          overflowY: "auto !important",
          overflowX: "hidden !important",
          paddingRight: collapsed ? "0px" : "6px",
          transition: "padding-right 180ms ease-in-out, background 180ms",
        },
        "& .ps-menu-root": { flexGrow: 1, paddingBottom: "20px" },

        /* menu button baseline */
        "& .ps-menuitem-root > .ps-menu-button, & .ps-submenu-root > .ps-menu-button": {
          color: theme.palette.text.primary,
          borderRadius: `${theme.shape.borderRadius}px`,
          margin: "2px 0",
          transition: "background-color 180ms ease, color 180ms ease",
        },
        "& .ps-menu-button:hover": {
          backgroundColor: `${alpha(theme.palette.primary.main, 0.08)} !important`,
          color: `${theme.palette.primary.main} !important`,
        },
        "& .ps-menuitem-root.ps-active > .ps-menu-button": {
          backgroundColor: `${alpha(theme.palette.primary.main, 0.12)} !important`,
          color: `${theme.palette.primary.main} !important`,
          fontWeight: 600,
          borderRadius: `${theme.shape.borderRadius}px`,
        },
        "& .ps-submenu-content": {
          backgroundColor: "transparent !important",
          paddingLeft: collapsed ? "0px" : "15px",
        },
        "& .ps-submenu-root .ps-menuitem-root > .ps-menu-button": {
          margin: "1px 0",
          fontSize: "0.9rem",
        },
        "& .ps-submenu-expand-icon": { color: `${theme.palette.text.secondary} !important` },

        /* --- Menu text animation (fade + slide) --- */
        "& .menu-text": {
          display: "inline-block",
          whiteSpace: "nowrap",
          verticalAlign: "middle",
          transition: "opacity 140ms cubic-bezier(.2,.8,.2,1), transform 160ms cubic-bezier(.2,.8,.2,1)",
          opacity: 1,
          transform: "translateX(0)",
          lineHeight: 1,
        },
        "&.text-hidden .menu-text": {
          opacity: 0,
          transform: "translateX(-8px)",
          pointerEvents: "none",
        },
        "&.collapsed .ps-menu-button": {
          paddingLeft: "12px !important",
        },
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
        "& .MuiAvatar-root": {
          transition: "width 200ms ease, height 200ms ease",
        },
      }}
    >
      <Sidebar collapsed={collapsed} backgroundColor={theme.palette.background.paper} width={collapsed ? "80px" : "270px"}>
        <Menu iconShape="square">
          {/* LOGO + TOGGLE ICON */}
          <MenuItem
            onClick={toggleSidebar}
            icon={collapsed ? <MenuOutlined /> : undefined}
            style={{ margin: "10px 0 20px 0", color: theme.palette.text.primary, backgroundColor: "transparent" }}
            rootStyles={{ ['& > .ps-menu-button:hover']: { backgroundColor: 'transparent !important', color: `${theme.palette.text.primary} !important` } }}
          >
            <Box display="flex" justifyContent="space-between" alignItems="center" ml="15px" width="100%">
              <span className="logo-text menu-text" style={{ fontSize: "1.25rem", fontWeight: 700 }}>
                LigcoSync
              </span>

              {!collapsed && (
                <IconButton onClick={toggleSidebar} sx={{ color: theme.palette.text.primary }}>
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
                    <Avatar alt={user.name} src={user.profileImage} sx={{ width: 90, height: 90, cursor: "pointer", boxShadow: theme.shadows[2] }} />
                  ) : (
                    <Avatar sx={{ width: 90, height: 90, cursor: "pointer", fontSize: "2rem", bgcolor: theme.palette.primary.main, color: "#fff", boxShadow: theme.shadows[2] }}>
                      {initials}
                    </Avatar>
                  )}
                </Box>
                <Box textAlign="center" mt="10px">
                  <span className="menu-text" style={{ fontSize: "1rem", fontWeight: 600, color: theme.palette.text.primary }}>{user.name}</span>
                </Box>
              </Box>
            ) : (
              <Box display="flex" justifyContent="center" alignItems="center" py="10px">
                {user.profileImage ? (
                  <Avatar alt={user.name} src={user.profileImage} sx={{ width: 36, height: 36, cursor: "pointer" }} />
                ) : (
                  <Avatar sx={{ width: 36, height: 36, fontSize: "0.9rem", bgcolor: theme.palette.primary.main, color: "#fff" }}>{initials}</Avatar>
                )}
              </Box>
            )}
          </Box>

          {/* MENU ITEMS */}
          <Box paddingLeft={collapsed ? undefined : "10%"}>
            <Item title="Dashboard" to="/" icon={<HomeOutlined />} selected={isExactlySelected("/")} handleNavigate={handleNavigate} />

            <SubMenu
              label={<span className="menu-text">Human Resources</span>}
              icon={<GroupWorkOutlined />}
              onClick={handleSubMenuClick}
              style={{ backgroundColor: "transparent" }}
              rootStyles={{
                ['& > .ps-menu-button']: { color: selectedTitle === "Human Resources" ? theme.palette.primary.main : theme.palette.text.primary },
                ['& > .ps-menu-button:hover']: { backgroundColor: `${alpha(theme.palette.primary.main, 0.08)} !important`, color: `${theme.palette.primary.main} !important` },
              }}
            >
              <Item title="HRM Dashboard" to="/hrm/dashboard" icon={<HomeOutlined />} selected={isExactlySelected("/hrm/dashboard")} handleNavigate={handleNavigate} />
              <Item title="Employee List" to="/team" icon={<PeopleOutlined />} selected={isSelected("/team") || isSelected("/hrm/employee-profile")} handleNavigate={handleNavigate} />
              <Item title="Leave Management" to="/hrm/manage-leave" icon={<BeachAccessOutlined />} selected={isSelected("/hrm/manage-leave")} handleNavigate={handleNavigate} />
            </SubMenu>

            <SubMenu
              label={<span className="menu-text">Recruitment</span>}
              icon={<BusinessCenterOutlined />}
              onClick={handleSubMenuClick}
              style={{ backgroundColor: "transparent" }}
              rootStyles={{
                ['& > .ps-menu-button']: { color: selectedTitle === "Recruitment" ? theme.palette.primary.main : theme.palette.text.primary },
                ['& > .ps-menu-button:hover']: { backgroundColor: `${alpha(theme.palette.primary.main, 0.08)} !important`, color: `${theme.palette.primary.main} !important` },
              }}
            >
              <Item title="Job Openings" to="/recruitment/openings" icon={<WorkOutlineOutlined />} selected={isSelected("/recruitment/openings")} handleNavigate={handleNavigate} />
              <Item title="Applicants" to="/recruitment/applicants" icon={<AssignmentIndOutlined />} selected={isSelected("/recruitment/applicants")} handleNavigate={handleNavigate} />
            </SubMenu>

            <SubMenu
              label={<span className="menu-text">Accounting</span>}
              icon={<AccountBalanceOutlined />}
              onClick={handleSubMenuClick}
              style={{ backgroundColor: "transparent" }}
              rootStyles={{
                ['& > .ps-menu-button']: { color: selectedTitle === "Accounting" ? theme.palette.primary.main : theme.palette.text.primary },
                ['& > .ps-menu-button:hover']: { backgroundColor: `${alpha(theme.palette.primary.main, 0.08)} !important`, color: `${theme.palette.primary.main} !important` },
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

            <SubMenu
              label={<span className="menu-text">Sales</span>}
              icon={<DataUsageOutlined />}
              onClick={handleSubMenuClick}
              style={{ backgroundColor: "transparent" }}
              rootStyles={{
                ['& > .ps-menu-button']: { color: selectedTitle === "Sales" ? theme.palette.primary.main : theme.palette.text.primary },
                ['& > .ps-menu-button:hover']: { backgroundColor: `${alpha(theme.palette.primary.main, 0.08)} !important`, color: `${theme.palette.primary.main} !important` },
              }}
            >
              <Item title="Invoices" to="/sales/invoices" icon={<ReceiptOutlined />} selected={isSelected("/sales/invoices") && !isSelected("/sales/invoices/reports")} handleNavigate={handleNavigate} />
              <Item title="Customer Payments" to="/sales/payments/customer-payments" icon={<MoneyOutlined />} selected={isSelected("/sales/payments/customer-payments")} handleNavigate={handleNavigate} />
              <Item title="Invoice Reports" to="/sales/invoices/reports" icon={<CardMembershipRounded />} selected={isSelected("/sales/invoices/reports")} handleNavigate={handleNavigate} />
              <Item title="Stock Adjustment" to="/accounts/inventory/stock_adjustment" icon={<StorageOutlined />} selected={isSelected("/accounts/inventory/stock_adjustment")} handleNavigate={handleNavigate} />
            </SubMenu>

            <SubMenu
              label={<span className="menu-text">System Data</span>}
              icon={<StorageOutlined />}
              onClick={handleSubMenuClick}
              style={{ backgroundColor: "transparent" }}
              rootStyles={{
                ['& > .ps-menu-button']: { color: selectedTitle === "Data" ? theme.palette.primary.main : theme.palette.text.primary },
                ['& > .ps-menu-button:hover']: { backgroundColor: `${alpha(theme.palette.primary.main, 0.08)} !important`, color: `${theme.palette.primary.main} !important` },
              }}
            >
               <Item title="Contacts" to="/contacts" icon={<ContactsOutlined />} selected={isSelected("/contacts")} handleNavigate={handleNavigate} />
               <Item title="Imports" to="/data/imports" icon={<UploadFileOutlined />} selected={isSelected("/data/imports")} handleNavigate={handleNavigate} />
               <Item title="Backups" to="/data/backups" icon={<BackupOutlined />} selected={isSelected("/data/backups")} handleNavigate={handleNavigate} />
            </SubMenu>

            <SubMenu
              label={<span className="menu-text">Pages</span>}
              icon={<ArticleOutlined />}
              onClick={handleSubMenuClick}
              style={{ backgroundColor: "transparent" }}
              rootStyles={{
                ['& > .ps-menu-button']: { color: selectedTitle === "Pages" ? theme.palette.primary.main : theme.palette.text.primary },
                ['& > .ps-menu-button:hover']: { backgroundColor: `${alpha(theme.palette.primary.main, 0.08)} !important`, color: `${theme.palette.primary.main} !important` },
              }}
            >
              <Item title="Profile" to="/form" icon={<PersonOutlined />} selected={isSelected("/form")} handleNavigate={handleNavigate} />
              <Item title="Calendar" to="/calendar" icon={<CalendarTodayOutlined />} selected={isSelected("/calendar")} handleNavigate={handleNavigate} />
              <Item title="FAQ" to="/faq" icon={<HelpOutlineOutlined />} selected={isSelected("/faq")} handleNavigate={handleNavigate} />
            </SubMenu>

            <SubMenu
              label={<span className="menu-text">Charts</span>}
              icon={<BarChartOutlined />}
              onClick={handleSubMenuClick}
              style={{ backgroundColor: "transparent" }}
              rootStyles={{
                ['& > .ps-menu-button']: { color: selectedTitle === "Charts" ? theme.palette.primary.main : theme.palette.text.primary },
                ['& > .ps-menu-button:hover']: { backgroundColor: `${alpha(theme.palette.primary.main, 0.08)} !important`, color: `${theme.palette.primary.main} !important` },
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
          <Box textAlign="center" p="10px" sx={{ backgroundColor: "transparent" }}>
            <span className="menu-text" style={{ display: "block", color: theme.palette.text.secondary }}>LigcoSync</span>
            <span className="menu-text" style={{ display: "block", color: theme.palette.text.disabled, fontSize: "0.75rem" }}>Version 0.0.1</span>
          </Box>
        )}
      </Sidebar>
    </Box>
  );
};

export default SidebarComponent;