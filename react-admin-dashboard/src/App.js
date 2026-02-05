// src/App.jsx (Complete file)
import { useState } from "react";
import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import { CssBaseline, ThemeProvider, Box } from "@mui/material";
import { ColorModeContext, useMode } from "./theme";
import Topbar from "./scenes/global/Topbar";
import Sidebar from "./scenes/global/Sidebar";
import Dashboard from "./scenes/dashboard";
import Team from "./scenes/team";
// import Invoices from "./scenes/invoices";
import Contacts from "./scenes/contacts";
import Bar from "./scenes/bar";
import Form from "./scenes/form";
import Line from "./scenes/line";
import Pie from "./scenes/pie";
import FAQ from "./scenes/faq";
import Calendar from "./scenes/calendar/calendar";
import Geography from "./scenes/geography";
import Login from "./scenes/auth/Login";
import Register from "./scenes/auth/Register";
import Footer from "./scenes/global/Footer";
import { useAuth } from "./api/AuthProvider";
import HrmDashboard from "./scenes/hrm";
import AddEmployee from "./scenes/hrm/AddEmployee";
import EditEmployee from "./scenes/hrm/EditEmployee";
import EmployeeProfile from "./scenes/hrm/EmployeeProfile";
import LeaveRequestForm from "./scenes/hrm/LeaveRequestForm";
import LeaveManagement from "./scenes/hrm/LeaveManagement";
import JobOpeningsList from "./scenes/hrm/recruitment/JobOpeningsList";
import EditJobOpeningForm from "./scenes/hrm/recruitment/EditJobOpeningForm";
import AddJobOpeningForm from "./scenes/hrm/recruitment/AddJobOpeningForm";
import ApplicantTracking from "./scenes/hrm/recruitment/ApplicantTracking";
import AddApplicantForm from "./scenes/hrm/recruitment/AddApplicantForm";
import ApplicantProfileView from "./scenes/hrm/recruitment/ApplicantProfileView";
import AccountsDashboard from "./scenes/accounting";
import ChartOfAccounts from "./scenes/accounting/ChartOfAccounts";
import JournalEntries from "./scenes/accounting/JournalEntries";
import NewJournalEntry from "./scenes/accounting/NewJournalEntry";
import Expenses from "./scenes/accounting/expenses/index";
import Payroll from "./scenes/accounting/Payroll";
import ReportsHub from "./scenes/accounting/ReportsHub";
import Payslips from "./scenes/accounting/Payslips";
import "react-toastify/dist/ReactToastify.css";
import PayrollSummaries from "./scenes/accounting/PayrollSummaries";
import AccountingReports from "./scenes/accounting/reports/AccountingReports";
import ProfitAndLoss from "./scenes/accounting/reports/ProfitAndLoss";
import BalanceSheet from "./scenes/accounting/reports/BalanceSheet";
import TrialBalance from "./scenes/accounting/reports/TrialBalance";
import GeneralLedger from "./scenes/accounting/reports/GeneralLedger";
import PaymentVoucher from "./scenes/accounting/tools/PaymentVoucher";
import CreateInvoice from "./scenes/accounting/sales/invoicing/CreateInvoice";
import Invoices from "./scenes/accounting/sales/invoicing/Invoices";

import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterLuxon } from "@mui/x-date-pickers/AdapterLuxon";
import CustomerPayments from "./scenes/accounting/payments/CustomerPayments";
import InvoicesReport from "./scenes/accounting/sales/invoicing/InvoicesReport";

import AccountsPayable from "./scenes/accounting/payables/index";
import BankReconciliation from "./scenes/accounting/reconciliation/BankReconciliation";
import FixedAssets from "./scenes/accounting/reports/FixedAssets";
import ArchivedReportsList from "./scenes/accounting/reports/ArchivedReportsList";
import ArchivedReportViewer from "./scenes/accounting/reports/ArchivedReportViewer";
import StockAdjustment from "./scenes/accounting/inventory/StockAdjustment";
import CashFlowStatement from "./scenes/accounting/reports/CashFlowStatement";
import Budget from "./scenes/accounting/reports/Budget.";

// --- Layout for Protected Routes ---
const ProtectedLayout = ({ theme, isSidebar, setIsSidebar }) => {
  const { isAuthenticated } = useAuth();
  
  // Define sidebar width based on the SidebarComponent logic (80px collapsed, 270px expanded)
  const sidebarWidth = isSidebar ? '270px' : '80px'; 
  const transitionDuration = '0.3s'; // Matches the transition set in SidebarComponent.jsx

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <Box display="flex" height="100vh" width="100%">
      {/* Sidebar is rendered, its width is controlled internally */}
      <Box
          sx={{
            width: isSidebar ? "270px" : "80px",
            minWidth: isSidebar ? "270px" : "80px",
            transition: "width 0.3s ease-in-out, min-width 0.3s ease-in-out",
            overflow: "hidden",
            display: "flex",
          }}
        >
          <Sidebar isSidebar={isSidebar} setIsSidebar={setIsSidebar} />
        </Box>

      {/* --- Main Content (FIX APPLIED HERE) --- */}
      <Box
          component="main"
          sx={{
            flexGrow: 1,
            display: "flex",
            flexDirection: "column",
            height: "100vh",
            overflow: "hidden",
            transition: "margin 0.3s ease-in-out, padding 0.3s ease-in-out",
          }}
        >
        {/* --- Sticky Topbar --- */}
        <Box
          sx={{
            position: "sticky",
            top: 0,
            zIndex: 1100,
            backgroundColor: theme.palette.background.default,
          }}
        >
          <Topbar setIsSidebar={setIsSidebar} />
        </Box>

        {/* --- Scrollable Content --- */}
        <Box sx={{ flexGrow: 1, overflowY: "auto", p: 2 }}>
          <Outlet /> {/* Child routes will render here */}
        </Box>

        {/* --- Fixed Footer --- */}
        <Box
          sx={{
            position: "sticky",
            bottom: 0,
            zIndex: 1000,
            backgroundColor: theme.palette.background.default,
            borderTop: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Footer />
        </Box>
      </Box>
    </Box>
  );
};

// --- Main App ---
function App() {
  const [theme, colorMode] = useMode();
  const [isSidebar, setIsSidebar] = useState(true);
  const { isAuthenticated } = useAuth();

  return (
    <ColorModeContext.Provider value={colorMode}>
      <ThemeProvider theme={theme}>
        <LocalizationProvider dateAdapter={AdapterLuxon}>
            <ToastContainer
              position="top-right"
              autoClose={5000}
              hideProgressBar={false}
              newestOnTop={false}
              closeOnClick
              rtl={false}
              pauseOnFocusLoss
              draggable
              pauseOnHover
              theme={theme.palette.mode === "dark" ? "dark" : "light"}
            />
            <CssBaseline />

            <Routes>
              {/* Public routes */}
              <Route
                path="/login"
                element={isAuthenticated ? <Navigate to="/" replace /> : <Login />}
              />
              <Route
                path="/register"
                element={
                  isAuthenticated ? <Navigate to="/" replace /> : <Register />
                }
              />

              {/* Protected routes */}
              <Route
                element={
                  <ProtectedLayout
                    theme={theme}
                    isSidebar={isSidebar}
                    setIsSidebar={setIsSidebar}
                  />
                }
              >
                <Route path="/" element={<Dashboard />} />
                <Route path="/team" element={<Team />} />

                {/* HRM */}
                <Route path="/hrm/dashboard" element={<HrmDashboard />} />
                <Route path="/hrm/add-employee" element={<AddEmployee />} />
                <Route path="/hrm/edit-employee/:id" element={<EditEmployee />} />
                <Route
                  path="/hrm/employee-profile/:id"
                  element={<EmployeeProfile />}
                />
                <Route path="/hrm/request-leave" element={<LeaveRequestForm />} />
                <Route path="/hrm/manage-leave" element={<LeaveManagement />} />

                {/* Recruitment */}
                <Route path="/recruitment/openings" element={<JobOpeningsList />} />
                <Route
                  path="/recruitment/add-opening"
                  element={<AddJobOpeningForm />}
                />
                <Route
                  path="/recruitment/edit-opening/:id"
                  element={<EditJobOpeningForm />}
                />
                <Route
                  path="/recruitment/applicants/:jobId?"
                  element={<ApplicantTracking />}
                />
                <Route
                  path="/recruitment/add-applicant/:jobId?"
                  element={<AddApplicantForm />}
                />
                <Route
                  path="/recruitment/applicant-profile/:applicantId"
                  element={<ApplicantProfileView />}
                />

                {/* Accounting */}
                <Route path="/accounts" element={<AccountsDashboard />} />
                <Route path="/accounts/reports" element={<AccountingReports />} />
                <Route path="/accounts/reports/profit-loss" element={<ProfitAndLoss />} />
                <Route path="accounts/reports/balance-sheet" element={<BalanceSheet />} />
                <Route path="accounts/reports/trial-balance" element={<TrialBalance />} />
                <Route path="/accounts/reports/general-ledger" element={<GeneralLedger />} />
                <Route path="accounts/reports/payment-vouchers" element={<PaymentVoucher />} />
                <Route path="/accounting/reports/cashflowstatement" element={<CashFlowStatement />} />
                <Route path="/accounting/reports/budgeting" element={<Budget />} />

                {/* Sales / AR */}
                <Route path="/sales/invoices/add-invoices" element={<CreateInvoice />} />
                <Route path="/sales/invoices" element={<Invoices />} />
                <Route path="/sales/payments/customer-payments" element={< CustomerPayments /> } />
                <Route path="/sales/invoices/reports" element={<InvoicesReport />} />

                {/* Purchasing / AP */}
                <Route path="/accounts/bills" element={<AccountsPayable />} />

                {/* Inventory */}
                <Route path="/accounts/inventory/stock_adjustment" element={<StockAdjustment />} />


                {/* General Accounting */}
                <Route
                  path="/accounts/chart-of-accounts"
                  element={<ChartOfAccounts />}
                />
                <Route
                  path="/accounts/journal-entries"
                  element={<JournalEntries />}
                />
                <Route
                  path="/accounts/journal-entries/new"
                  element={<NewJournalEntry />}
                />
                <Route path="/accounts/expenses" element={<Expenses />} />
                <Route path="/accounts/payroll" element={<Payroll />} />
                <Route path="/accounts/payroll/summaries" element={<PayrollSummaries />} />
                <Route path="/accounts/payslips" element={<Payslips />} />
                <Route path="/accounts/reports/fixedassets" element={<FixedAssets />} />
                
                {/* 💡 --- FIX: Changed path to match sidebar --- */}
                <Route path="/accounts/reconciliation/bank" element={<BankReconciliation />} />
                {/* --} New Financial Archive Routes ---- */}
                <Route path="/accounting/reports/archive" element={<ArchivedReportsList />} />
                <Route path="/accounting/reports/archive/:id" element={<ArchivedReportViewer />} />

                {/* Others */}
                <Route path="/contacts" element={<Contacts />} />
                <Route path="/form" element={<Form />} />
                <Route path="/bar" element={<Bar />} />
                <Route path="/pie" element={<Pie />} />
                <Route path="/line" element={<Line />} />
                <Route path="/faq" element={<FAQ />} />
                <Route path="/calendar" element={<Calendar />} />
                <Route path="/geography" element={<Geography />} />

                {/* Fallback for authenticated users */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
        </LocalizationProvider>
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}

export default App;