import React, { useState, useEffect, useCallback } from "react";
import { Box, useTheme, Tabs, Tab, Button } from "@mui/material";
import { tokens } from "../../../theme";
import Header from "../../../components/Header";
import AddIcon from "@mui/icons-material/Add";
import PaymentIcon from "@mui/icons-material/Payment";
import { apiClient } from "../../../api/apiClient";
import { toast, ToastContainer } from "react-toastify";

import ApAnalytics from "./ApAnalytics";
import BillList from "./BillList";
import PaymentList from "./PaymentList";
import BillFormDialog from "./BillFormDialog";
import PaymentFormDialog from "./PaymentFormDialog";

const AccountsPayable = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  const [currentTab, setCurrentTab] = useState("analytics");
  const [loading, setLoading] = useState(true);

  // Data State
  const [bills, setBills] = useState([]);
  const [payments, setPayments] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [expenseAccounts, setExpenseAccounts] = useState([]);
  const [assetAccounts, setAssetAccounts] = useState([]);

  // Dialog State
  const [isBillFormOpen, setIsBillFormOpen] = useState(false);
  const [isPaymentFormOpen, setIsPaymentFormOpen] = useState(false);

  // --- Data Fetching ---
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Use Promise.allSettled for parallel fetching
      const [
        billsRes,
        paymentsRes,
        suppliersRes,
        accountsRes
      ] = await Promise.allSettled([
        apiClient.get("/bills"), // Assumes this returns { data: [...] } from pagination
        apiClient.get("/bill-payments"), // Assumes this returns { data: [...] } from pagination
        apiClient.get("/suppliers"), // Assumes this returns a flat array [...]
        apiClient.get("/accounting/chart-of-accounts"), // Assumes this returns a flat array [...]
      ]);

      if (billsRes.status === "fulfilled") setBills(billsRes.value.data.data || []);
      else toast.error("Failed to load supplier bills");

      if (paymentsRes.status === "fulfilled") setPayments(paymentsRes.value.data.data || []);
      else toast.error("Failed to load bill payments");

      // 💡 --- THIS IS THE FIX ---
      // Your suppliers and accounts routes likely return a flat array, not a paginated 'data.data' object.
      if (suppliersRes.status === "fulfilled") {
        setSuppliers(suppliersRes.value.data || []); // Changed from data.data
      } else {
        toast.error("Failed to load suppliers");
      }
      
      if (accountsRes.status === "fulfilled") {
        setExpenseAccounts(accountsRes.value.data.filter(a => a.account_type === "Expense"));
        setAssetAccounts(accountsRes.value.data.filter(a => a.account_type === "Asset"));
      } else {
        toast.error("Failed to load accounts");
      }
      // 💡 --- END OF FIX ---

    } catch (err) {
      console.error(err);
      toast.error("An error occurred while loading data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  const handleSuccess = () => {
    setIsBillFormOpen(false);
    setIsPaymentFormOpen(false);
    fetchData(); // Refresh all data
  };

  return (
    <Box m="20px">
      {/* Header & Actions */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Header title="Accounts Payable" subtitle="Manage supplier bills and payments" />
        <Box display="flex" gap={2}>
          <Button
            variant="contained"
            color="secondary"
            startIcon={<PaymentIcon />}
            onClick={() => setIsPaymentFormOpen(true)}
            sx={{ fontWeight: "bold" }}
          >
            Make Payment
          </Button>
          <Button
            variant="contained"
            color="secondary"
            startIcon={<AddIcon />}
            onClick={() => setIsBillFormOpen(true)}
            sx={{ fontWeight: "bold" }}
          >
            Enter Bill
          </Button>
        </Box>
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
        <Tabs
          value={currentTab}
          onChange={handleTabChange}
          textColor="secondary"
          indicatorColor="secondary"
        >
          <Tab value="analytics" label="AP Aging (Dashboard)" />
          <Tab value="bills" label="All Bills" />
          <Tab value="payments" label="Payment History" />
        </Tabs>
      </Box>

      {/* Tab Content */}
      <Box>
        {currentTab === "analytics" && <ApAnalytics bills={bills} loading={loading} />}
        {currentTab === "bills" && <BillList bills={bills} loading={loading} onRefresh={fetchData} />}
        {currentTab === "payments" && <PaymentList payments={payments} loading={loading} onRefresh={fetchData} />}
      </Box>

      {/* Dialogs */}
      <BillFormDialog
        open={isBillFormOpen}
        onClose={() => setIsBillFormOpen(false)}
        onSuccess={handleSuccess}
        suppliers={suppliers}
        expenseAccounts={expenseAccounts}
      />
      <PaymentFormDialog
        open={isPaymentFormOpen}
        onClose={() => setIsPaymentFormOpen(false)}
        onSuccess={handleSuccess}
        suppliers={suppliers}
        assetAccounts={assetAccounts}
        bills={bills} // Pass the 'bills' prop here
      />

      <ToastContainer position="bottom-right" theme={theme.palette.mode} />
    </Box>
  );
};

export default AccountsPayable;