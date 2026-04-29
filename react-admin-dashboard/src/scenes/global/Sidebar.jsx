import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Sidebar, Menu, MenuItem, SubMenu } from "react-pro-sidebar";
import { Box, Avatar, useTheme, IconButton } from "@mui/material";
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
  UploadFileOutlined,
} from "@mui/icons-material";

const getInitials = (name) => {
  if (!name) return "U";

  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();

  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
};

const resolveSelectedTitle = (path) => {
  if (path === "/") return "Dashboard";
  if (path.startsWith("/hrm") || path.startsWith("/team")) return "Human Resources";
  if (path.startsWith("/recruitment")) return "Recruitment";
  if (
    path.startsWith("/accounts") ||
    path.startsWith("/accounting") ||
    path.startsWith("/bills")
  ) {
    return "Accounting";
  }
  if (path.startsWith("/sales")) return "Sales";
  if (path.startsWith("/data")) return "Data";
  if (
    path.startsWith("/form") ||
    path.startsWith("/calendar") ||
    path.startsWith("/faq")
  ) {
    return "Pages";
  }
  if (
    path.startsWith("/bar") ||
    path.startsWith("/pie") ||
    path.startsWith("/line") ||
    path.startsWith("/geography") ||
    path.startsWith("/pages/settings")
  ) {
    return "Charts";
  }

  return "Dashboard";
};

const Item = ({ title, to, icon, selected, handleNavigate }) => {
  const theme = useTheme();
  const styles = theme.sidebar;

  return (
    <MenuItem
      active={selected}
      icon={icon}
      onClick={() => handleNavigate(to)}
      rootStyles={styles.itemRoot(selected)}
    >
      <span className="menu-text">{title}</span>
    </MenuItem>
  );
};

const AppSubMenu = ({
  title,
  icon,
  active,
  collapsed,
  setIsSidebar,
  children,
}) => {
  const theme = useTheme();
  const styles = theme.sidebar;

  const handleClick = () => {
    if (collapsed) {
      setIsSidebar(true);
    }
  };

  return (
    <SubMenu
      label={<span className="menu-text">{title}</span>}
      icon={icon}
      onClick={handleClick}
      rootStyles={styles.submenuRoot(active)}
    >
      {children}
    </SubMenu>
  );
};

const SidebarComponent = ({ isSidebar, setIsSidebar }) => {
  const theme = useTheme();
  const styles = theme.sidebar;
  const location = useLocation();
  const navigate = useNavigate();
  const sidebarRef = useRef(null);

  const [internalCollapsed, setInternalCollapsed] = useState(!isSidebar);
  const [textVisible, setTextVisible] = useState(isSidebar);

  const selectedTitle = useMemo(
    () => resolveSelectedTitle(location.pathname),
    [location.pathname]
  );

  const user = useMemo(() => {
    return secureStore.get("user_data") || {
      name: "User",
      profileImage: null,
    };
  }, []);

  const initials = useMemo(() => getInitials(user.name), [user.name]);

  useEffect(() => {
    let timer;

    if (!isSidebar) {
      setTextVisible(false);
      timer = setTimeout(() => {
        setInternalCollapsed(true);
      }, 90);
    } else {
      setInternalCollapsed(false);
      timer = setTimeout(() => {
        setTextVisible(true);
      }, 90);
    }

    return () => clearTimeout(timer);
  }, [isSidebar]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        isSidebar &&
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target)
      ) {
        setIsSidebar(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isSidebar, setIsSidebar]);

  const collapsed = internalCollapsed;

  const toggleSidebar = useCallback(() => {
    setIsSidebar((prev) => !prev);
  }, [setIsSidebar]);

  const handleNavigate = useCallback(
    (to) => {
      navigate(to);
    },
    [navigate]
  );

  const isSelected = useCallback(
    (pathPrefix) => location.pathname.startsWith(pathPrefix),
    [location.pathname]
  );

  const isExactlySelected = useCallback(
    (path) => location.pathname === path,
    [location.pathname]
  );

  return (
    <Box
      ref={sidebarRef}
      className={`${collapsed ? "collapsed" : "expanded"} ${
        textVisible ? "text-visible" : "text-hidden"
      }`}
      sx={styles.root(collapsed, textVisible)}
    >
      <Sidebar
        collapsed={collapsed}
        backgroundColor={theme.palette.background.paper}
        width={collapsed ? `${styles.collapsedWidth}px` : `${styles.width}px`}
      >
        <Menu iconShape="square">
          <MenuItem
            onClick={toggleSidebar}
            icon={collapsed ? <MenuOutlined /> : undefined}
            style={styles.logoMenuItem}
            rootStyles={styles.logoMenuRoot}
          >
            <Box sx={styles.logoBox}>
              <span className="logo-text menu-text" style={styles.logoText}>
                LigcoSync
              </span>

              {!collapsed && (
                <IconButton onClick={toggleSidebar} sx={styles.toggleButton}>
                  <MenuOutlined fontSize="small" />
                </IconButton>
              )}
            </Box>
          </MenuItem>

          <Box sx={styles.profileWrap(collapsed)}>
            {!collapsed ? (
              <Box sx={styles.profileExpanded}>
                {user.profileImage ? (
                  <Avatar
                    alt={user.name}
                    src={user.profileImage}
                    sx={styles.avatarLarge}
                  />
                ) : (
                  <Avatar sx={styles.avatarLarge}>{initials}</Avatar>
                )}

                <span className="menu-text" style={styles.userName}>
                  {user.name || "User"}
                </span>
              </Box>
            ) : (
              <Box display="flex" justifyContent="center" alignItems="center" py={1}>
                {user.profileImage ? (
                  <Avatar
                    alt={user.name}
                    src={user.profileImage}
                    sx={styles.avatarSmall}
                  />
                ) : (
                  <Avatar sx={styles.avatarSmall}>{initials}</Avatar>
                )}
              </Box>
            )}
          </Box>

          <Box sx={styles.menuWrap(collapsed)}>
            <Item
              title="Dashboard"
              to="/"
              icon={<HomeOutlined />}
              selected={isExactlySelected("/")}
              handleNavigate={handleNavigate}
            />

            <AppSubMenu
              title="Human Resources"
              icon={<GroupWorkOutlined />}
              active={selectedTitle === "Human Resources"}
              collapsed={collapsed}
              setIsSidebar={setIsSidebar}
            >
              <Item
                title="HRM Dashboard"
                to="/hrm/dashboard"
                icon={<HomeOutlined />}
                selected={isExactlySelected("/hrm/dashboard")}
                handleNavigate={handleNavigate}
              />
              <Item
                title="Employee List"
                to="/team"
                icon={<PeopleOutlined />}
                selected={isSelected("/team") || isSelected("/hrm/employee-profile")}
                handleNavigate={handleNavigate}
              />
              <Item
                title="Leave Management"
                to="/hrm/manage-leave"
                icon={<BeachAccessOutlined />}
                selected={isSelected("/hrm/manage-leave")}
                handleNavigate={handleNavigate}
              />
            </AppSubMenu>

            <AppSubMenu
              title="Recruitment"
              icon={<BusinessCenterOutlined />}
              active={selectedTitle === "Recruitment"}
              collapsed={collapsed}
              setIsSidebar={setIsSidebar}
            >
              <Item
                title="Job Openings"
                to="/recruitment/openings"
                icon={<WorkOutlineOutlined />}
                selected={isSelected("/recruitment/openings")}
                handleNavigate={handleNavigate}
              />
              <Item
                title="Applicants"
                to="/recruitment/applicants"
                icon={<AssignmentIndOutlined />}
                selected={isSelected("/recruitment/applicants")}
                handleNavigate={handleNavigate}
              />
            </AppSubMenu>

            <AppSubMenu
              title="Accounting"
              icon={<AccountBalanceOutlined />}
              active={selectedTitle === "Accounting"}
              collapsed={collapsed}
              setIsSidebar={setIsSidebar}
            >
              <Item
                title="Accounts Dashboard"
                to="/accounts"
                icon={<HomeOutlined />}
                selected={isExactlySelected("/accounts")}
                handleNavigate={handleNavigate}
              />
              <Item
                title="Chart of Accounts"
                to="/accounts/chart-of-accounts"
                icon={<AccountTreeOutlined />}
                selected={isSelected("/accounts/chart-of-accounts")}
                handleNavigate={handleNavigate}
              />
              <Item
                title="Journal Entries"
                to="/accounts/journal-entries"
                icon={<ReceiptLongOutlined />}
                selected={isSelected("/accounts/journal-entries")}
                handleNavigate={handleNavigate}
              />
              <Item
                title="Expense Claims"
                to="/accounts/expenses"
                icon={<RequestQuoteOutlined />}
                selected={isSelected("/accounts/expenses")}
                handleNavigate={handleNavigate}
              />
              <Item
                title="Supplier Bills (AP)"
                to="/accounts/bills"
                icon={<ArticleOutlined />}
                selected={isSelected("/accounts/bills")}
                handleNavigate={handleNavigate}
              />
              <Item
                title="Bank Reconciliation"
                to="/accounts/reconciliation/bank"
                icon={<SyncAltOutlined />}
                selected={isSelected("/accounts/reconciliation/bank")}
                handleNavigate={handleNavigate}
              />
              <Item
                title="Payroll"
                to="/accounts/payroll"
                icon={<PaymentOutlined />}
                selected={isSelected("/accounts/payroll")}
                handleNavigate={handleNavigate}
              />
              <Item
                title="Payslips"
                to="/accounts/payslips"
                icon={<ArticleOutlined />}
                selected={isSelected("/accounts/payslips")}
                handleNavigate={handleNavigate}
              />
              <Item
                title="Financial Reports"
                to="/accounts/reports"
                icon={<AssessmentOutlined />}
                selected={isSelected("/accounts/reports")}
                handleNavigate={handleNavigate}
              />
            </AppSubMenu>

            <AppSubMenu
              title="Sales"
              icon={<DataUsageOutlined />}
              active={selectedTitle === "Sales"}
              collapsed={collapsed}
              setIsSidebar={setIsSidebar}
            >
              <Item
                title="Invoices"
                to="/sales/invoices"
                icon={<ReceiptOutlined />}
                selected={
                  isSelected("/sales/invoices") &&
                  !isSelected("/sales/invoices/reports")
                }
                handleNavigate={handleNavigate}
              />
              <Item
                title="Customer Payments"
                to="/sales/payments/customer-payments"
                icon={<MoneyOutlined />}
                selected={isSelected("/sales/payments/customer-payments")}
                handleNavigate={handleNavigate}
              />
              <Item
                title="Invoice Reports"
                to="/sales/invoices/reports"
                icon={<CardMembershipRounded />}
                selected={isSelected("/sales/invoices/reports")}
                handleNavigate={handleNavigate}
              />
              <Item
                title="Stock Adjustment"
                to="/accounts/inventory/stock_adjustment"
                icon={<StorageOutlined />}
                selected={isSelected("/accounts/inventory/stock_adjustment")}
                handleNavigate={handleNavigate}
              />
            </AppSubMenu>

            <AppSubMenu
              title="System Data"
              icon={<StorageOutlined />}
              active={selectedTitle === "Data"}
              collapsed={collapsed}
              setIsSidebar={setIsSidebar}
            >
              <Item
                title="Contacts"
                to="/contacts"
                icon={<ContactsOutlined />}
                selected={isSelected("/contacts")}
                handleNavigate={handleNavigate}
              />
              <Item
                title="Imports"
                to="/data/imports"
                icon={<UploadFileOutlined />}
                selected={isSelected("/data/imports")}
                handleNavigate={handleNavigate}
              />
              <Item
                title="Backups"
                to="/data/backups"
                icon={<BackupOutlined />}
                selected={isSelected("/data/backups")}
                handleNavigate={handleNavigate}
              />
            </AppSubMenu>

            <AppSubMenu
              title="Pages"
              icon={<ArticleOutlined />}
              active={selectedTitle === "Pages"}
              collapsed={collapsed}
              setIsSidebar={setIsSidebar}
            >
              <Item
                title="Profile"
                to="/form"
                icon={<PersonOutlined />}
                selected={isSelected("/form")}
                handleNavigate={handleNavigate}
              />
              <Item
                title="Calendar"
                to="/calendar"
                icon={<CalendarTodayOutlined />}
                selected={isSelected("/calendar")}
                handleNavigate={handleNavigate}
              />
              <Item
                title="FAQ"
                to="/faq"
                icon={<HelpOutlineOutlined />}
                selected={isSelected("/faq")}
                handleNavigate={handleNavigate}
              />
            </AppSubMenu>

            <AppSubMenu
              title="Charts"
              icon={<BarChartOutlined />}
              active={selectedTitle === "Charts"}
              collapsed={collapsed}
              setIsSidebar={setIsSidebar}
            >
              <Item
                title="Bar Chart"
                to="/bar"
                icon={<BarChartOutlined />}
                selected={isSelected("/bar")}
                handleNavigate={handleNavigate}
              />
              <Item
                title="Pie Chart"
                to="/pie"
                icon={<PieChartOutlineOutlined />}
                selected={isSelected("/pie")}
                handleNavigate={handleNavigate}
              />
              <Item
                title="Line Chart"
                to="/line"
                icon={<TimelineOutlined />}
                selected={isSelected("/line")}
                handleNavigate={handleNavigate}
              />
              <Item
                title="Geography"
                to="/geography"
                icon={<MapOutlined />}
                selected={isSelected("/geography")}
                handleNavigate={handleNavigate}
              />
              <Item
                title="Settings"
                to="/pages/settings"
                icon={<SettingsOutlined />}
                selected={isSelected("/pages/settings")}
                handleNavigate={handleNavigate}
              />
            </AppSubMenu>
          </Box>
        </Menu>

        {!collapsed && (
          <Box sx={styles.footer}>
            <span className="menu-text" style={styles.footerBrand}>
              LigcoSync
            </span>
            <span className="menu-text" style={styles.footerVersion}>
              Version 0.0.1
            </span>
          </Box>
        )}
      </Sidebar>
    </Box>
  );
};

export default SidebarComponent;