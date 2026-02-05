// src/scenes/accounting/reports/ArchivedReportViewer.jsx

import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Divider,
  Button,
  Chip,
} from "@mui/material";
import { useParams } from "react-router-dom"; // To get the ID from URL
import { apiClient } from "../../../api/apiClient";
import { toast } from "react-toastify";
import Header from "../../../components/Header";
import { DateTime } from "luxon"; // Assuming DateTime is available for display

// --- Helper Functions ---
const formatCurrency = (amount) => {
  return (amount ?? 0).toLocaleString("en-US", {
    style: "currency",
    currency: "KES",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

// Helper to filter accounts by subtype (copied from BalanceSheet.jsx)
const getGroupedData = (allAccounts, subtypes) => {
    if (!Array.isArray(allAccounts)) return [];
    return allAccounts.filter((acc) => subtypes.includes(acc.account_subtype));
};

// --- RENDER SECTION HELPER (Shared between PNL and BS) ---
const renderAccountSection = (title, accounts, total, totalLabel, headerColor, isSubSection = false) => {
    // Determine the color for the header based on the section type
    const colorStyle = isSubSection 
        ? { color: 'text.primary', pl: 4, mt: 1 } 
        : { color: headerColor, pl: 0, mt: 2, borderBottom: '1px solid #ccc' };
    
    return (
        <Box mb={3}>
            <Typography variant="h6" fontWeight="bold" sx={{ ...colorStyle, mb: 1, fontSize: isSubSection ? '1rem' : '1.25rem' }}>
                {title}
            </Typography>
            <TableContainer component={Paper} elevation={0} sx={{ border: isSubSection ? 'none' : '1px solid #eee' }}>
                <Table size="small">
                    <TableBody>
                        {Array.isArray(accounts) && accounts.length > 0 ? (
                            accounts.map((acc, index) => (
                                <TableRow key={index}>
                                    <TableCell sx={{ pl: isSubSection ? 6 : 4, border: 0, py: 0.5 }}>{acc.account_name}</TableCell>
                                    <TableCell align="right" sx={{ border: 0, py: 0.5 }}>{formatCurrency(acc.balance)}</TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow><TableCell colSpan={2} align="center" sx={{ fontStyle: 'italic', color: 'grey.500', border: 0 }}>No accounts found.</TableCell></TableRow>
                        )}
                        <TableRow>
                            <TableCell colSpan={2} sx={{ pt: 1, border: 0, paddingBottom: 0 }}>
                                <Divider sx={{ my: 0.5, borderColor: '#eee' }} />
                            </TableCell>
                        </TableRow>
                        <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                            <TableCell sx={{ fontWeight: 'bold' }}>{totalLabel || `Total ${title}`}</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>{formatCurrency(total)}</TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
};


const ArchivedReportViewer = () => {
    const { id } = useParams(); // Get archive ID from URL /archive/:id
    const [archive, setArchive] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) fetchArchive(id);
    }, [id]);

    const fetchArchive = async (archiveId) => {
        setLoading(true);
        try {
            // Assuming the backend route for showing an archive is '/accounting/archived-reports/{id}'
            const res = await apiClient.get(`/accounting/archived-reports/${archiveId}`);
            setArchive(res.data);
        } catch (e) {
            console.error("Error fetching archive details:", e.response || e);
            toast.error("Failed to load archived report data.");
        } finally {
            setLoading(false);
        }
    };
    
    if (loading) {
        return <Box display="flex" justifyContent="center" mt={5}><CircularProgress /></Box>;
    }

    if (!archive) {
        return <Typography m={3}>Report not found or failed to load.</Typography>;
    }

    const report = archive.report_data; // The actual structured financial data

    // Determine report type for conditional rendering
    const isPnl = archive.report_type.includes('P&L'); 
    const isBs = archive.report_type.includes('Balance Sheet'); 

    // --- Data Grouping (for BS) ---
    const allAssets = report.assets?.accounts || [];
    const allLiabilities = report.liabilities?.accounts || [];
    const allEquity = report.equity?.accounts || [];
    
    // Grouping assets/liabilities by subtype for presentation
    const currentAssets = getGroupedData(allAssets, ["Current Asset"]);
    const nonCurrentAssets = getGroupedData(allAssets, ["Fixed Asset", "Non-Current Asset"]);
    const currentLiabilities = getGroupedData(allLiabilities, ["Current Liability"]);
    const nonCurrentLiabilities = getGroupedData(allLiabilities, ["Non-Current Liability"]);

    return (
        <Box m={3}>
            <Header 
                title={`${archive.report_type} Archive`}
                subtitle={`Immutable Record ID: ${archive.id} | Generated on: ${new Date(archive.created_at).toLocaleDateString()}`}
            />
            
            <Paper sx={{ p: 3, mt: 3 }}>
                <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
                    {isBs ? 'Financial Position' : 'Financial Performance'}
                </Typography>
                
                <Typography variant="subtitle1" gutterBottom sx={{ fontStyle: 'italic' }}>
                    Report Period: {isBs ? `As of ${report.report_date}` : report.report_period}
                </Typography>
                
                <Divider sx={{ my: 2 }} />

                {/* --- RENDER P&L DATA (Original Logic) --- */}
                {isPnl && report.revenue && (
                    <>
                        {renderAccountSection('Revenue', report.revenue.accounts, report.revenue.total, 'Total Revenue', 'green')}
                        {renderAccountSection('Expenses', report.expenses.accounts, report.expenses.total, 'Total Expenses', 'red')}
                        
                        <Box mt={3} p={2} sx={{ backgroundColor: report.net_income >= 0 ? '#d4edda' : '#f8d7da', borderRadius: 1 }}>
                            <Typography variant="h5" fontWeight="bold" display="flex" justifyContent="space-between">
                                <span>Net Income</span>
                                <span>{formatCurrency(report.net_income)}</span>
                            </Typography>
                        </Box>
                    </>
                )}
                
                {/* --- RENDER BALANCE SHEET DATA (FIXED SECTIONAL RENDERING) --- */}
                {isBs && report.assets && (
                    <Grid container spacing={3}>
                        {/* ASSETS SIDE */}
                        <Grid item xs={12} md={6}>
                            <Typography variant="h4" sx={{ color: 'primary.main', mb: 2, borderBottom: '2px solid #ddd' }}>ASSETS</Typography>
                            
                            {/* Current Assets */}
                            {renderAccountSection('Current Assets', currentAssets, report.assets.total, 'Total Current Assets', 'text.secondary', true)}
                            
                            {/* Non-Current Assets */}
                            {renderAccountSection('Non-Current Assets', nonCurrentAssets, report.assets.total, 'Total Non-Current Assets', 'text.secondary', true)}

                            <Box mt={3} sx={{ borderTop: '2px solid black', pt: 1, px: 2 }}>
                                <Typography variant="h5" fontWeight="bold" display="flex" justifyContent="space-between">
                                    <span>TOTAL ASSETS</span>
                                    <span style={{ color: '#1e88e5' }}>{formatCurrency(report.assets.total)}</span>
                                </Typography>
                            </Box>
                        </Grid>
                        
                        {/* LIABILITIES & EQUITY SIDE */}
                        <Grid item xs={12} md={6}>
                            <Typography variant="h4" sx={{ color: 'success.main', mb: 2, borderBottom: '2px solid #ddd' }}>LIABILITIES & EQUITY</Typography>
                            
                            {/* Current Liabilities */}
                            {renderAccountSection('Current Liabilities', currentLiabilities, report.liabilities.total, 'Total Current Liabilities', 'text.secondary', true)}
                            
                            {/* Non-Current Liabilities */}
                            {renderAccountSection('Non-Current Liabilities', nonCurrentLiabilities, report.liabilities.total, 'Total Non-Current Liabilities', 'text.secondary', true)}
                            
                            {/* Equity Section */}
                            {renderAccountSection('Equity', allEquity, report.equity.total, 'Total Equity', 'text.secondary', true)}
                            
                            <Box mt={3} sx={{ borderTop: '2px solid black', pt: 1, px: 2 }}>
                                <Typography variant="h5" fontWeight="bold" display="flex" justifyContent="space-between">
                                    <span>TOTAL L&E</span>
                                    <span style={{ color: '#43a047' }}>{formatCurrency(report.total_liabilities_and_equity)}</span>
                                </Typography>
                            </Box>

                            <Box mt={3} p={2} sx={{ backgroundColor: report.check === 'Balanced' ? '#e8f5e9' : '#ffebee', borderRadius: 1, border: '1px solid #ccc' }}>
                                <Typography variant="h6" fontWeight="bold" display="flex" justifyContent="space-between">
                                    <span>Balance Check</span>
                                    <Chip label={report.check} color={report.check === 'Balanced' ? 'success' : 'error'} size="small"/>
                                </Typography>
                            </Box>
                        </Grid>
                    </Grid>
                )}

                <Box mt={4} textAlign="right">
                    <Button variant="outlined" onClick={() => window.print()}>Print Archived</Button>
                </Box>
            </Paper>
        </Box>
    );
};

export default ArchivedReportViewer;