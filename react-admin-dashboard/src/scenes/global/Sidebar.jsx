import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Sidebar, Menu, MenuItem, SubMenu } from "react-pro-sidebar";
import { Box, Avatar, useTheme, IconButton, Tooltip } from "@mui/material";
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

const routeMatches = (pathname, matcher) => {
  if (Array.isArray(matcher)) {
    return matcher.some((item) => routeMatches(pathname, item));
  }

  if (typeof matcher === "function") {
    return matcher(pathname);
  }

  return pathname.startsWith(matcher);
};

const MENU_GROUPS = [
  {
    section: "Main",
    items: [
      {
        type: "item",
        title: "Dashboard",
        to: "/",
        icon: <HomeOutlined fontSize="small" />,
        match: (path) => path === "/",
      },
    ],
  },
  {
    section: "People",
    items: [
      {
        type: "submenu",
        title: "Human Resources",
        icon: <GroupWorkOutlined fontSize="small" />,
        match: ["/hrm", "/team"],
        children: [
          {
            title: "HRM Dashboard",
            to: "/hrm/dashboard",
            icon: <HomeOutlined fontSize="small" />,
            match: (path) => path === "/hrm/dashboard",
          },
          {
            title: "Employee List",
            to: "/team",
            icon: <PeopleOutlined fontSize="small" />,
            match: ["/team", "/hrm/employee-profile"],
          },
          {
            title: "Leave Management",
            to: "/hrm/manage-leave",
            icon: <BeachAccessOutlined fontSize="small" />,
            match: "/hrm/manage-leave",
          },
        ],
      },
      {
        type: "submenu",
        title: "Recruitment",
        icon: <BusinessCenterOutlined fontSize="small" />,
        match: "/recruitment",
        children: [
          {
            title: "Job Openings",
            to: "/recruitment/openings",
            icon: <WorkOutlineOutlined fontSize="small" />,
            match: "/recruitment/openings",
          },
          {
            title: "Applicants",
            to: "/recruitment/applicants",
            icon: <AssignmentIndOutlined fontSize="small" />,
            match: "/recruitment/applicants",
          },
        ],
      },
    ],
  },
  {
    section: "Operations",
    items: [
      {
        type: "submenu",
        title: "Accounting",
        icon: <AccountBalanceOutlined fontSize="small" />,
        match: ["/accounts", "/accounting", "/bills"],
        children: [
          {
            title: "Accounts Dashboard",
            to: "/accounts",
            icon: <HomeOutlined fontSize="small" />,
            match: (path) => path === "/accounts",
          },
          {
            title: "Chart of Accounts",
            to: "/accounts/chart-of-accounts",
            icon: <AccountTreeOutlined fontSize="small" />,
            match: "/accounts/chart-of-accounts",
          },
          {
            title: "Journal Entries",
            to: "/accounts/journal-entries",
            icon: <ReceiptLongOutlined fontSize="small" />,
            match: "/accounts/journal-entries",
          },
          {
            title: "Expense Claims",
            to: "/accounts/expenses",
            icon: <RequestQuoteOutlined fontSize="small" />,
            match: "/accounts/expenses",
          },
          {
            title: "Supplier Bills",
            to: "/accounts/bills",
            icon: <ArticleOutlined fontSize="small" />,
            match: "/accounts/bills",
          },
          {
            title: "Bank Reconciliation",
            to: "/accounts/reconciliation/bank",
            icon: <SyncAltOutlined fontSize="small" />,
            match: "/accounts/reconciliation/bank",
          },
          {
            title: "Payroll",
            to: "/accounts/payroll",
            icon: <PaymentOutlined fontSize="small" />,
            match: "/accounts/payroll",
          },
          {
            title: "Payslips",
            to: "/accounts/payslips",
            icon: <ArticleOutlined fontSize="small" />,
            match: "/accounts/payslips",
          },
          {
            title: "Financial Reports",
            to: "/accounts/reports",
            icon: <AssessmentOutlined fontSize="small" />,
            match: "/accounts/reports",
          },
        ],
      },
      {
        type: "submenu",
        title: "Sales",
        icon: <DataUsageOutlined fontSize="small" />,
        match: ["/sales", "/accounts/inventory"],
        children: [
          {
            title: "Invoices",
            to: "/sales/invoices",
            icon: <ReceiptOutlined fontSize="small" />,
            match: (path) =>
              path.startsWith("/sales/invoices") &&
              !path.startsWith("/sales/invoices/reports"),
          },
          {
            title: "Customer Payments",
            to: "/sales/payments/customer-payments",
            icon: <MoneyOutlined fontSize="small" />,
            match: "/sales/payments/customer-payments",
          },
          {
            title: "Invoice Reports",
            to: "/sales/invoices/reports",
            icon: <CardMembershipRounded fontSize="small" />,
            match: "/sales/invoices/reports",
          },
          {
            title: "Stock Adjustment",
            to: "/accounts/inventory/stock_adjustment",
            icon: <StorageOutlined fontSize="small" />,
            match: "/accounts/inventory/stock_adjustment",
          },
        ],
      },
      {
        type: "submenu",
        title: "System Data",
        icon: <StorageOutlined fontSize="small" />,
        match: ["/data", "/contacts"],
        children: [
          {
            title: "Contacts",
            to: "/contacts",
            icon: <ContactsOutlined fontSize="small" />,
            match: "/contacts",
          },
          {
            title: "Imports",
            to: "/data/imports",
            icon: <UploadFileOutlined fontSize="small" />,
            match: "/data/imports",
          },
          {
            title: "Backups",
            to: "/data/backups",
            icon: <BackupOutlined fontSize="small" />,
            match: "/data/backups",
          },
        ],
      },
    ],
  },
  {
    section: "Workspace",
    items: [
      {
        type: "submenu",
        title: "Pages",
        icon: <ArticleOutlined fontSize="small" />,
        match: ["/form", "/calendar", "/faq"],
        children: [
          {
            title: "Profile",
            to: "/form",
            icon: <PersonOutlined fontSize="small" />,
            match: "/form",
          },
          {
            title: "Calendar",
            to: "/calendar",
            icon: <CalendarTodayOutlined fontSize="small" />,
            match: "/calendar",
          },
          {
            title: "FAQ",
            to: "/faq",
            icon: <HelpOutlineOutlined fontSize="small" />,
            match: "/faq",
          },
        ],
      },
      {
        type: "submenu",
        title: "Charts",
        icon: <BarChartOutlined fontSize="small" />,
        match: ["/bar", "/pie", "/line", "/geography", "/pages/settings"],
        children: [
          {
            title: "Bar Chart",
            to: "/bar",
            icon: <BarChartOutlined fontSize="small" />,
            match: "/bar",
          },
          {
            title: "Pie Chart",
            to: "/pie",
            icon: <PieChartOutlineOutlined fontSize="small" />,
            match: "/pie",
          },
          {
            title: "Line Chart",
            to: "/line",
            icon: <TimelineOutlined fontSize="small" />,
            match: "/line",
          },
          {
            title: "Geography",
            to: "/geography",
            icon: <MapOutlined fontSize="small" />,
            match: "/geography",
          },
          {
            title: "Settings",
            to: "/pages/settings",
            icon: <SettingsOutlined fontSize="small" />,
            match: "/pages/settings",
          },
        ],
      },
    ],
  },
];

const SidebarItem = ({ item, collapsed, pathname, onNavigate }) => {
  const theme = useTheme();
  const styles = theme.sidebar;
  const selected = routeMatches(pathname, item.match);

  const content = (
    <MenuItem
      active={selected}
      icon={item.icon}
      onClick={() => onNavigate(item.to)}
      rootStyles={styles.itemRoot(selected)}
    >
      <span className="menu-text">{item.title}</span>
    </MenuItem>
  );

  if (!collapsed) return content;

  return (
    <Tooltip title={item.title} placement="right" arrow>
      <Box>{content}</Box>
    </Tooltip>
  );
};

const SidebarSubMenu = ({
  item,
  collapsed,
  pathname,
  setIsSidebar,
  onNavigate,
}) => {
  const theme = useTheme();
  const styles = theme.sidebar;
  const active = routeMatches(pathname, item.match);

  const handleOpenWhenCollapsed = () => {
    if (collapsed) {
      setIsSidebar(true);
    }
  };

  const submenu = (
    <SubMenu
      label={<span className="menu-text">{item.title}</span>}
      icon={item.icon}
      rootStyles={styles.submenuRoot(active)}
      onClick={handleOpenWhenCollapsed}
    >
      {item.children.map((child) => (
        <SidebarItem
          key={child.to}
          item={child}
          collapsed={collapsed}
          pathname={pathname}
          onNavigate={onNavigate}
        />
      ))}
    </SubMenu>
  );

  if (!collapsed) return submenu;

  return (
    <Tooltip title={item.title} placement="right" arrow>
      <Box>{submenu}</Box>
    </Tooltip>
  );
};

const SidebarGroupTitle = ({ title }) => {
  const theme = useTheme();
  const styles = theme.sidebar;

  return (
    <Box sx={styles.groupLabel}>
      <Box component="span">{title}</Box>
      <Box sx={styles.groupRule} />
    </Box>
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

  const user = useMemo(() => {
    return (
      secureStore.get("user_data") || {
        name: "User",
        company_role: "User",
        profileImage: null,
      }
    );
  }, []);

  const initials = useMemo(() => getInitials(user.name), [user.name]);

  useEffect(() => {
    let timer;

    if (!isSidebar) {
      setTextVisible(false);
      timer = setTimeout(() => {
        setInternalCollapsed(true);
      }, 80);
    } else {
      setInternalCollapsed(false);
      timer = setTimeout(() => {
        setTextVisible(true);
      }, 80);
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

  const toggleSidebar = useCallback(
    (event) => {
      event?.stopPropagation?.();
      setIsSidebar((prev) => !prev);
    },
    [setIsSidebar]
  );

  const handleNavigate = useCallback(
    (to) => {
      navigate(to);
    },
    [navigate]
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
        collapsedWidth={`${styles.collapsedWidth}px`}
      >
        <Menu closeOnClick>
          <MenuItem
            onClick={toggleSidebar}
            icon={
              collapsed ? (
                <MenuOutlined fontSize="small" />
              ) : (
                <Box sx={styles.brandMark}>L</Box>
              )
            }
            style={styles.logoMenuItem}
            rootStyles={styles.logoMenuRoot}
          >
            <Box sx={styles.logoBox}>
              <Box display="flex" alignItems="center" minWidth={0}>
                <Box component="span" className="logo-text menu-text" sx={styles.logoText}>
                  LigcoSync
                </Box>
              </Box>

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

                <Box minWidth={0}>
                  <Box component="span" className="menu-text" sx={styles.userName}>
                    {user.name || "User"}
                  </Box>

                  <Box component="span" className="menu-text" sx={styles.userRole}>
                    {user.company_role || "User"}
                  </Box>
                </Box>
              </Box>
            ) : (
              <Box display="flex" justifyContent="center" alignItems="center" py={1}>
                <Tooltip title={user.name || "User"} placement="right" arrow>
                  {user.profileImage ? (
                    <Avatar
                      alt={user.name}
                      src={user.profileImage}
                      sx={styles.avatarSmall}
                    />
                  ) : (
                    <Avatar sx={styles.avatarSmall}>{initials}</Avatar>
                  )}
                </Tooltip>
              </Box>
            )}
          </Box>

          <Box sx={styles.menuWrap}>
            {MENU_GROUPS.map((group) => (
              <Box key={group.section} sx={styles.groupBlock}>
                {!collapsed && <SidebarGroupTitle title={group.section} />}

                {group.items.map((item) =>
                  item.type === "submenu" ? (
                    <SidebarSubMenu
                      key={item.title}
                      item={item}
                      collapsed={collapsed}
                      pathname={location.pathname}
                      setIsSidebar={setIsSidebar}
                      onNavigate={handleNavigate}
                    />
                  ) : (
                    <SidebarItem
                      key={item.to}
                      item={item}
                      collapsed={collapsed}
                      pathname={location.pathname}
                      onNavigate={handleNavigate}
                    />
                  )
                )}
              </Box>
            ))}
          </Box>
        </Menu>

        {!collapsed && (
          <Box sx={styles.footer}>
            <Box component="span" className="menu-text" sx={styles.footerBrand}>
              LigcoSync
            </Box>
            <Box component="span" className="menu-text" sx={styles.footerVersion}>
              Version 0.0.1
            </Box>
          </Box>
        )}
      </Sidebar>
    </Box>
  );
};

export default SidebarComponent;