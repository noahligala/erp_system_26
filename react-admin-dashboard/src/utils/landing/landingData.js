export const fallbackPlans = [
  {
    id: 1,
    name: "Starter",
    slug: "free",
    price: 0,
    billing_cycle: "monthly",
    description: "For testing the ERP with essential modules.",
    features: [
      "Company registration",
      "Dashboard overview",
      "Basic HRM",
      "Basic accounting",
      "Limited users",
    ],
  },
  {
    id: 2,
    name: "Business",
    slug: "basic",
    price: 3500,
    billing_cycle: "monthly",
    description: "For growing companies that need daily ERP operations.",
    features: [
      "HRM and payroll",
      "Accounting reports",
      "Inventory management",
      "Sales and purchasing",
      "Customer and supplier records",
    ],
  },
  {
    id: 3,
    name: "Enterprise",
    slug: "pro",
    price: 8500,
    billing_cycle: "monthly",
    description: "For organizations that need full scalable ERP control.",
    features: [
      "Full finance suite",
      "Advanced dashboards",
      "Multi-branch inventory",
      "Recruitment and leave management",
      "Priority support",
    ],
  },
];

export const industries = [
  "Technology",
  "Law Firm",
  "School",
  "Hospital",
  "Supermarket",
  "Construction",
  "Restaurant",
  "Logistics",
  "Real Estate",
  "Agriculture",
  "Other",
];

export const companySizes = [
  "1 - 5 employees",
  "6 - 20 employees",
  "21 - 50 employees",
  "51 - 100 employees",
  "101 - 250 employees",
  "250+ employees",
];

export const stats = [
  { label: "Core Modules", value: "10+" },
  { label: "Business Types", value: "Multi" },
  { label: "Deployment", value: "SaaS" },
  { label: "Data Scope", value: "Tenant" },
];

export const modules = [
  {
    title: "Finance",
    text: "Chart of accounts, journals, reports, cashflow, assets, bills, and payments.",
    icon: "ReceiptLongRounded",
  },
  {
    title: "HRM",
    text: "Employees, payroll, payslips, allowances, loans, advances, leave, and approvals.",
    icon: "GroupsRounded",
  },
  {
    title: "Inventory",
    text: "Products, stock movements, adjustments, purchasing, and multi-location control.",
    icon: "Inventory2Rounded",
  },
  {
    title: "Sales",
    text: "Customers, invoices, sales orders, payments, reporting, and receivables.",
    icon: "PaymentsRounded",
  },
  {
    title: "Recruitment",
    text: "Job openings, applicants, hiring workflows, and employee onboarding.",
    icon: "BadgeRounded",
  },
  {
    title: "Dashboards",
    text: "Real-time KPIs across finance, HR, stock, sales, purchasing, and operations.",
    icon: "AnalyticsRounded",
  },
  {
    title: "Calendar",
    text: "Company events, reminders, schedules, and operational planning.",
    icon: "CalendarMonthRounded",
  },
  {
    title: "Administration",
    text: "Company setup, users, roles, permissions, subscriptions, and secure access.",
    icon: "AccountTreeRounded",
  },
];

export const benefits = [
  {
    title: "Fast deployment",
    description:
      "Register a company, assign a plan, and begin testing core ERP workflows immediately.",
    icon: "RocketLaunchRounded",
  },
  {
    title: "Enterprise-ready",
    description:
      "Built around tenant-scoped data, user roles, company ownership, and scalable modules.",
    icon: "SecurityRounded",
  },
  {
    title: "Operational visibility",
    description:
      "Give managers and owners a single command center for finance, staff, stock, and sales.",
    icon: "DashboardRounded",
  },
];

export const workflow = [
  {
    title: "Register company",
    description: "Create the company profile and owner account.",
    icon: "BusinessRounded",
  },
  {
    title: "Choose subscription",
    description: "Select a test, business, or enterprise plan.",
    icon: "CreditCardRounded",
  },
  {
    title: "Test modules",
    description: "Explore finance, HRM, inventory, sales, and dashboards.",
    icon: "PlayCircleRounded",
  },
  {
    title: "Scale operations",
    description: "Add users, roles, branches, data, and business workflows.",
    icon: "AutoGraphRounded",
  },
];

export const currentUsers = [
  {
    name: "Apex Legal Partners",
    industry: "Law Firm",
    location: "Nairobi",
    quote:
      "LigcoSync gives our team a unified workspace for billing, finance, HR, and operational reporting.",
    metrics: ["15 staff", "Finance", "HRM"],
  },
  {
    name: "Sunrise Academy",
    industry: "Education",
    location: "Nakuru",
    quote:
      "The platform gives school leadership visibility across staff, fees, payroll, reporting, and administration.",
    metrics: ["50 staff", "Payroll", "Reports"],
  },
  {
    name: "QuickMart Grocers",
    industry: "Retail",
    location: "Nairobi",
    quote:
      "Inventory, sales, purchasing, and finance workflows are easier to manage from one tenant-scoped system.",
    metrics: ["4 branches", "Inventory", "Sales"],
  },
  {
    name: "City General Hospital",
    industry: "Healthcare",
    location: "Kisumu",
    quote:
      "The ERP structure supports multi-department operations, supplies, staff, and financial summaries.",
    metrics: ["100 staff", "Supplies", "Finance"],
  },
];

export const faqItems = [
  {
    q: "Can companies test before paying?",
    a: "Yes. Select Trial / Test mode during registration to create a test workspace before moving to a paid subscription.",
  },
  {
    q: "Does each company have separate data?",
    a: "Yes. The backend should scope operational data by company_id so each organization only accesses its own records.",
  },
  {
    q: "Which modules are included?",
    a: "Finance, HRM, payroll, leave, recruitment, CRM, inventory, sales, purchasing, calendar, dashboards, and administration.",
  },
  {
    q: "Can the ERP support different industries?",
    a: "Yes. The platform is designed for schools, hospitals, law firms, supermarkets, logistics companies, restaurants, agriculture, real estate, and general businesses.",
  },
];

export const navItems = [
  ["Modules", "modules"],
  ["Workflow", "workflow"],
  ["Users", "users"],
  ["Plans", "plans"],
  ["Contact", "contact"],
];

export const sectionLabelSx = {
  color: "primary.main",
  fontSize: "0.74rem",
  fontWeight: 800,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
};