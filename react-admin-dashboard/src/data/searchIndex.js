// src/data/searchIndex.js
import { secureStore } from "../utils/storage";

export function buildSearchIndex() {
  // ✅ Static routes and module pages
  const staticIndex = [
    { label: "Main Dashboard", path: "/", type: "Page", keywords: ["dashboard", "overview", "home"] },
    { label: "Team", path: "/team", type: "Page", keywords: ["staff", "team", "members"] },
    { label: "Contacts", path: "/contacts", type: "Page", keywords: ["contacts", "clients", "directory"] },
    { label: "Invoices", path: "/invoices", type: "Page", keywords: ["billing", "invoices", "payments"] },
    { label: "FAQ", path: "/faq", type: "Page", keywords: ["help", "support", "faq"] },
    { label: "Calendar", path: "/calendar", type: "Page", keywords: ["calendar", "schedule"] },

    // ✅ HRM Module
    { label: "HRM Dashboard", path: "/hrm/dashboard", type: "Module", keywords: ["hrm", "employees", "hr", "human resources"] },
    { label: "Add Employee", path: "/hrm/add-employee", type: "Page", keywords: ["add employee", "new staff", "recruitment"] },
    { label: "Edit Employee", path: "/hrm/edit-employee", type: "Page", keywords: ["edit employee", "update staff"] },
    { label: "Employee Profile", path: "/hrm/employee-profile", type: "Page", keywords: ["employee profile", "staff details", "personnel"] },
    { label: "Leave Request Form", path: "/hrm/request-leave", type: "Page", keywords: ["leave", "vacation", "request"] },
    { label: "Leave Management", path: "/hrm/manage-leave", type: "Page", keywords: ["manage leave", "approval", "requests"] },

    // ✅ Recruitment
    { label: "Job Openings", path: "/recruitment/openings", type: "Module", keywords: ["recruitment", "jobs", "vacancies"] },
    { label: "Add Job Opening", path: "/recruitment/add-opening", type: "Page", keywords: ["add job", "recruit", "new opening"] },
    { label: "Edit Job Opening", path: "/recruitment/edit-opening", type: "Page", keywords: ["edit job", "update opening"] },
    { label: "Applicant Tracking", path: "/recruitment/applicants", type: "Module", keywords: ["applicants", "recruitment", "tracking"] },
    { label: "Add Applicant", path: "/recruitment/add-applicant", type: "Page", keywords: ["add applicant", "candidate", "recruitment"] },
  ];

  // ✅ Optionally enrich index with cached employee names or applicants
  const employees = secureStore.get("employees") || [];
  const employeeIndex = employees.map((emp) => ({
    label: `${emp.firstName} ${emp.lastName}`,
    path: `/hrm/employee-profile/${emp.id}`,
    type: "Employee",
    keywords: [emp.firstName, emp.lastName, "employee", "profile"],
  }));

  const applicants = secureStore.get("applicants") || [];
  const applicantIndex = applicants.map((app) => ({
    label: app.name,
    path: `/recruitment/applicant-profile/${app.id}`,
    type: "Applicant",
    keywords: [app.name, "candidate", "recruitment"],
  }));

  return [...staticIndex, ...employeeIndex, ...applicantIndex];
}

/** 🔍 Simple client-side fuzzy search */
export function searchLocalData(query, index = buildSearchIndex()) {
  if (!query || query.trim() === "") return [];

  const lower = query.toLowerCase();

  return index.filter(
    (item) =>
      item.label.toLowerCase().includes(lower) ||
      (item.keywords && item.keywords.some((k) => k.toLowerCase().includes(lower)))
  );
}
