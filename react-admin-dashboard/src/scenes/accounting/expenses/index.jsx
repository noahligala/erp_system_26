import React, { useState, useEffect, useCallback } from "react";
import { Box, useTheme, Tabs, Tab, Button } from "@mui/material";
import { tokens } from "../../../theme";
import Header from "../../../components/Header";
import AddIcon from "@mui/icons-material/Add";
import ExpensesList from "./ExpensesList";
import ExpensesAnalytics from "./ExpensesAnalytics";
import ExpenseFormDialog from "./ExpenseFormDialog";
import { apiClient } from "../../../api/apiClient";
import { toast, ToastContainer } from "react-toastify";

const Expenses = () => {
    const theme = useTheme();
    const colors = tokens(theme.palette.mode);

    const [currentTab, setCurrentTab] = useState("list");
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expenseAccounts, setExpenseAccounts] = useState([]);

    // --- Fetch Data ---
    const fetchExpenses = useCallback(async () => {
        setLoading(true);
        try {
        const { data } = await apiClient.get("/expenses");
        setExpenses(data || []);
        } catch (err) {
        console.error(err);
        toast.error("Failed to load expenses");
        } finally {
        setLoading(false);
        }
    }, []);

    // Fetch Expense Accounts for the dropdown
    const fetchAccounts = useCallback(async () => {
        try {
        const { data } = await apiClient.get("/accounting/chart-of-accounts");
        // Filter only 'Expense' type accounts
        const expAccounts = data.filter((acc) => acc.account_type === "Expense");
        setExpenseAccounts(expAccounts);
        } catch (err) {
        console.error("Failed to load accounts", err);
        }
    }, []);

    useEffect(() => {
        fetchExpenses();
        fetchAccounts();
    }, [fetchExpenses, fetchAccounts]);

    const handleTabChange = (event, newValue) => {
        setCurrentTab(newValue);
    };

    return (
        <Box m="20px">
        {/* Header & Actions */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Header title="EXPENSES" subtitle="Manage claims and view spending reports" />
            <Button
            variant="contained"
            color="secondary"
            startIcon={<AddIcon />}
            onClick={() => setIsFormOpen(true)}
            sx={{ fontWeight: "bold" }}
            >
            New Expense
            </Button>
        </Box>

        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
            <Tabs
            value={currentTab}
            onChange={handleTabChange}
            textColor="secondary"
            indicatorColor="secondary"
            >
            <Tab value="list" label="All Expenses" />
            <Tab value="analytics" label="Analytics & Reports" />
            </Tabs>
        </Box>

        {/* Tab Content */}
        <Box>
            {currentTab === "list" && (
            <ExpensesList
                expenses={expenses}
                loading={loading}
                onRefresh={fetchExpenses}
                accounts={expenseAccounts}
            />
            )}
            {currentTab === "analytics" && (
            <ExpensesAnalytics expenses={expenses} />
            )}
        </Box>

        {/* Create Dialog */}
        <ExpenseFormDialog
            open={isFormOpen}
            onClose={() => setIsFormOpen(false)}
            onSuccess={() => {
            fetchExpenses();
            setIsFormOpen(false);
            }}
            accounts={expenseAccounts}
        />

        <ToastContainer position="bottom-right" theme={theme.palette.mode} />
        </Box>
    );
    };

export default Expenses;