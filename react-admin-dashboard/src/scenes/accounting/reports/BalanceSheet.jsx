// src/scenes/accounting/reports/BalanceSheet.jsx
import React, { useState, useRef, useCallback } from "react";
import {
  Box,
  Paper,
  Typography,
  useTheme,
  Grid,
  TextField,
  Button,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Divider,
  IconButton,
  Tooltip,
  Stack,
  Chip,
} from "@mui/material";
import { DatePicker } from '@mui/x-date-pickers/DatePicker'; // ⬅️ IMPORTED MUI DATE PICKER
import { tokens } from "../../../theme";
import Header from "../../../components/Header";
import {apiClient} from "../../../api/apiClient";
import { toast } from "react-toastify";
import { useAuth } from "../../../api/AuthProvider";
import { DateTime } from 'luxon'; // ⬅️ LUXON IMPORTED

// Icons
import PrintOutlinedIcon from "@mui/icons-material/PrintOutlined";
import PictureAsPdfOutlinedIcon from "@mui/icons-material/PictureAsPdfOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";

// Print & Export Libs
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// 💡 NEW: Import globalPrint (Assuming location)
import { globalPrint } from "../../../utils/print";

// --- Helper Functions ---
const formatCurrency = (amount) => {
  const numericAmount = Number(amount);
  if (isNaN(numericAmount)) {
    return "";
  }
  return numericAmount.toLocaleString("en-US", {
    style: "currency",
    currency: "KES",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const todayDate = DateTime.local().toISODate(); // Initialize with Luxon ISO date string

/**
 * Helper component to render a section of the report (e.g., "Current Assets")
 */
const ReportSection = ({
  title,
  accounts,
  subtypes,
  total,
  totalLabel,
  colors,
}) => {
  const filteredAccounts =
    Array.isArray(accounts) && subtypes
      ? accounts.filter((acc) => subtypes.includes(acc.account_subtype))
      : Array.isArray(accounts)
      ? accounts
      : [];

  const calculatedTotal =
    total !== undefined
      ? total
      : filteredAccounts.reduce((sum, acc) => sum + (Number(acc.balance) || 0), 0);

  return (
    <Box mb={2}>
      <Typography variant="h6" fontWeight="600" sx={{ mb: 1, color: colors.grey[200], textAlign: 'left', pl: 2 }}>
        {title}
      </Typography>
      <TableContainer>
        <Table size="small">
          <TableBody>
            {filteredAccounts.length > 0 ? (
              filteredAccounts.map((acc) => (
                <TableRow
                  key={acc.account_name}
                  sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
                >
                  <TableCell sx={{ pl: 4, fontSize: "0.9rem", border: 0, py: 0.5, textAlign: 'left' }}>
                    {acc.account_name}
                  </TableCell>
                  <TableCell align="right" sx={{ fontSize: "0.9rem", border: 0, py: 0.5 }}>
                    {formatCurrency(acc.balance)}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={2} align="center" sx={{ border: 0, py: 0.5, fontStyle: 'italic', color: colors.grey[500] }}>
                  No accounts found.
                </TableCell>
              </TableRow>
            )}
            <TableRow>
              <TableCell
                colSpan={2}
                sx={{ pt: 1, border: 0, paddingBottom: 0 }}
              >
                <Divider sx={{ borderColor: colors.grey[700] }} />
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell
                sx={{
                  pl: 2,
                  fontWeight: "bold",
                  fontSize: "0.95rem",
                  border: 0,
                  pt: 1,
                  textAlign: 'left'
                }}
              >
                {totalLabel || `Total ${title}`}
              </TableCell>
              <TableCell
                align="right"
                sx={{
                  fontWeight: "bold",
                  fontSize: "0.95rem",
                  border: 0,
                  pt: 1,
                }}
              >
                {formatCurrency(calculatedTotal)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

const TotalSection = ({ label, amount, colors }) => (
  <Box
    p={2}
    sx={{
      backgroundColor: colors.primary[900],
      borderRadius: "8px",
      mt: 2,
    }}
  >
    <Box display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="h5" fontWeight="600" textAlign="left">
            {label}
        </Typography>
        <Typography
            variant="h5"
            fontWeight="600"
            color={colors.greenAccent[400]}
            textAlign="right"
        >
            {formatCurrency(amount)}
        </Typography>
    </Box>
  </Box>
);

const BalanceSheetReport = React.forwardRef(({ data, metadata, colors }, ref) => {
  const allAssets = data.assets.accounts || [];
  const allLiabilities = data.liabilities.accounts || [];
  const allEquity = data.equity.accounts || [];

  const renderSectionHtml = (title, accounts, subtypes, total, totalLabel) => {
    const filteredAccounts =
      Array.isArray(accounts) && subtypes
        ? accounts.filter((acc) => subtypes.includes(acc.account_subtype))
        : Array.isArray(accounts)
        ? accounts
        : [];
    
    const calculatedTotal =
      total !== undefined
        ? total
        : filteredAccounts.reduce((sum, acc) => sum + (Number(acc.balance) || 0), 0);

    const accountsHtml = filteredAccounts.length > 0 
      ? filteredAccounts.map(acc => `
        <tr style="border: none;">
          <td style="padding-left: 20px;">${acc.account_name}</td>
          <td style="text-align: right;">${formatCurrency(acc.balance)}</td>
        </tr>
      `).join('')
      : `<tr><td colspan="2" style="text-align: center; font-style: italic;">No accounts found.</td></tr>`;

    return `
      <h3 style="font-size: 14px; font-weight: 600; margin-top: 15px; margin-bottom: 5px; padding-left: 5px; border-bottom: 1px solid #ccc;">${title}</h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
        <tbody>
          ${accountsHtml}
          <tr><td colspan="2"><hr style="border-top: 1px dashed #ddd; margin: 4px 0;"></td></tr>
          <tr style="font-weight: bold; background-color: #f7f7f7;">
            <td style="padding-left: 10px;">${totalLabel || `Total ${title}`}</td>
            <td style="text-align: right;">${formatCurrency(calculatedTotal)}</td>
          </tr>
        </tbody>
      </table>
    `;
  };

  return (
    <Box ref={ref} sx={{ p: { xs: 1, md: 2 }, display: 'flex', justifyContent: 'space-between', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
      {/* Report Header - Centered */}
      <Box textAlign="center" mb={4}>
        <Typography variant="h4" fontWeight="600">
          Ligco Technologies
        </Typography>
        <Typography variant="h5" fontWeight="500">
          Balance Sheet
        </Typography>
        <Typography variant="h6" color={colors.grey[300]}>
          As of {data.report_date}
        </Typography>
      </Box>

      {/* Side-by-Side Layout */}
      <Grid container spacing={4}>
        {/* --- LEFT COLUMN: ASSETS --- */}
        <Grid item xs={12} md={6}>
          <Box pr={{ md: 2 }}>
            {/* --- HEADER LEFT ALIGNED --- */}
            <Typography variant="h4" sx={{ color: colors.greenAccent[400], mb: 2, textAlign: 'left', pl: 2 }}>
              ASSETS
            </Typography>
            <ReportSection
              title="Current Assets"
              accounts={allAssets}
              subtypes={["Current Asset"]}
              colors={colors}
            />
            <ReportSection
              title="Non-Current Assets"
              accounts={allAssets}
              subtypes={["Fixed Asset", "Non-Current Asset"]}
              totalLabel="Total Non-Current Assets"
              colors={colors}
            />
          </Box>
        </Grid>

        {/* --- RIGHT COLUMN: LIABILITIES & EQUITY --- */}
        <Grid item xs={12} md={6}>
           <Box pl={{ md: 2 }}>
            {/* --- HEADER LEFT ALIGNED --- */}
            <Typography variant="h4" sx={{ color: colors.blueAccent[300], mb: 2, textAlign: 'left', pl: 2 }}>
              LIABILITIES & EQUITY
            </Typography>
            <ReportSection
              title="Current Liabilities"
              accounts={allLiabilities}
              subtypes={["Current Liability"]}
              colors={colors}
            />
            <ReportSection
              title="Non-Current Liabilities"
              accounts={allLiabilities}
              subtypes={["Non-Current Liability"]}
              totalLabel="Total Non-Current Liabilities"
              colors={colors}
            />
            <ReportSection
              title="Equity"
              accounts={allEquity}
              total={data.equity.total}
              totalLabel="TOTAL EQUITY"
              colors={colors}
            />
          </Box>
        </Grid>
      </Grid>

      {/* ALIGNED TOTALS ROW */}
      <Grid container spacing={4} mt={1}>
        <Grid item xs={12} md={6}>
            <Box pr={{ md: 2 }}>
                <TotalSection
                    label="TOTAL ASSETS"
                    amount={data.assets.total}
                    colors={colors}
                />
            </Box>
        </Grid>
        <Grid item xs={12} md={6}>
            <Box pl={{ md: 2 }}>
                <TotalSection
                    label="TOTAL LIABILITIES & EQUITY"
                    amount={data.total_liabilities_and_equity}
                    colors={colors}
                />
            </Box>
        </Grid>
      </Grid>

      {/* Balance Check (Full Width, Centered) */}
      <Box display="flex" justifyContent="center" alignItems="center" my={3} gap={1}>
        {data.check === "Balanced" ? (
          <Chip
            icon={<CheckCircleOutlineIcon />}
            label="Balanced"
            color="success"
            sx={{ fontSize: "1rem", px: 2, py: 3, fontWeight: 600 }}
          />
        ) : (
          <>
            <Chip
                icon={<ErrorOutlineIcon />}
                label="Unbalanced"
                color="error"
                sx={{ fontSize: "1rem", px: 2, py: 3, fontWeight: 600 }}
            />
            {/* Display the difference amount */}
            <Typography sx={{ color: colors.redAccent[300], fontSize: '0.9rem' }}>
                (Difference: {formatCurrency(Math.abs(data.assets.total - data.total_liabilities_and_equity))})
            </Typography>
          </>
        )}
      </Box>

      {/* Metadata Footer (Full Width, Centered) */}
      {metadata && (
        <Box mt={4} pt={2} borderTop={1} borderColor={colors.grey[700]} textAlign="center">
          <Typography variant="body2" color={colors.grey[300]}>
            Report ID: {metadata.serial} | Generated At: {metadata.generatedAt} | Generated By: {metadata.generatedBy}
          </Typography>
        </Box>
      )}
    </Box>
  );
});


// --- Main Component ---
export default function BalanceSheet() {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const reportContentRef = useRef();
  const { user } = useAuth() || {}; // Crash-proof auth hook

  // State
  const [endDate, setEndDate] = useState(todayDate);
  const [reportData, setReportData] = useState(null);
  const [reportMetadata, setReportMetadata] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleGenerateReport = async () => {
    if (!endDate) {
      toast.error("Please select an 'As of Date'.");
      return;
    }
    setLoading(true);
    setReportData(null);
    setReportMetadata(null);
    toast.dismiss();

    try {
      const res = await apiClient.get("/accounting/balance-sheet", {
        params: {
          end_date: endDate,
        },
      });
      setReportData(res.data);
      const meta = {
        serial: `BS-${Date.now()}`,
        generatedAt: new Date().toLocaleString(),
        generatedBy: user ? user.name : "N/A",
      };
      setReportMetadata(meta);
      toast.success("Report generated successfully!");
    } catch (err) {
      console.error("Error fetching Balance Sheet:", err);
      toast.error(err.response?.data?.message || "Failed to generate report.");
    } finally {
      setLoading(false);
    }
  };

  // --- Helper to get grouped accounts for exports ---
  const getGroupedData = (allAccounts, subtypes) => {
    if (!Array.isArray(allAccounts)) return [];
    return allAccounts.filter((acc) => subtypes.includes(acc.account_subtype));
  };


  // 💡 NEW: Global Print Handler
  const handlePrint = useCallback(() => {
    if (!reportData || !reportMetadata) {
      toast.error("Generate the report first.");
      return;
    }

    const allAssets = reportData.assets.accounts || [];
    const allLiabilities = reportData.liabilities.accounts || [];
    const allEquity = reportData.equity.accounts || [];
    const reportDate = reportData.report_date;

    const renderSectionHtml = (title, accounts, subtypes, total, totalLabel) => {
      const filteredAccounts = getGroupedData(accounts, subtypes);
      const calculatedTotal =
        total !== undefined
          ? total
          : filteredAccounts.reduce((sum, acc) => sum + (Number(acc.balance) || 0), 0);

      const accountsHtml = filteredAccounts.length > 0 
        ? filteredAccounts.map(acc => `
          <tr style="border: none;">
            <td style="padding-left: 20px;">${acc.account_name}</td>
            <td style="text-align: right;">${formatCurrency(acc.balance)}</td>
          </tr>
        `).join('')
        : `<tr><td colspan="2" style="text-align: center; font-style: italic;">No accounts found.</td></tr>`;

      return `
        <div style="margin-bottom: 15px;">
            <h3 style="font-size: 14px; font-weight: 600; margin-top: 15px; margin-bottom: 5px; padding-left: 5px; border-bottom: 1px solid #ccc;">${title}</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                <tbody>
                    ${accountsHtml}
                    <tr><td colspan="2"><hr style="border-top: 1px dashed #ddd; margin: 4px 0;"></td></tr>
                    <tr style="font-weight: bold; background-color: #f7f7f7;">
                        <td style="padding-left: 10px; width: 70%;">${totalLabel || `Total ${title}`}</td>
                        <td style="text-align: right; width: 30%;">${formatCurrency(calculatedTotal)}</td>
                    </tr>
                </tbody>
            </table>
        </div>
      `;
    };

    // --- LEFT SIDE HTML (ASSETS) ---
    const assetsHtml = `
        <div style="width: 100%; border-right: 1px solid #ccc; padding-right: 10px;">
            <h2 style="font-size: 18px; color: #1e88e5; text-align: left; margin-bottom: 10px;">ASSETS</h2>
            ${renderSectionHtml("Current Assets", allAssets, ["Current Asset"], undefined, "Total Current Assets")}
            ${renderSectionHtml("Non-Current Assets", allAssets, ["Fixed Asset", "Non-Current Asset"], undefined, "Total Non-Current Assets")}
        </div>
    `;
    
    // --- RIGHT SIDE HTML (L&E) ---
    const liaEquHtml = `
        <div style="width: 100%; padding-left: 10px;">
            <h2 style="font-size: 18px; color: #43a047; text-align: left; margin-bottom: 10px;">LIABILITIES & EQUITY</h2>
            ${renderSectionHtml("Current Liabilities", allLiabilities, ["Current Liability"], undefined, "Total Current Liabilities")}
            ${renderSectionHtml("Non-Current Liabilities", allLiabilities, ["Non-Current Liability"], undefined, "Total Non-Current Liabilities")}
            ${renderSectionHtml("Equity", allEquity, ["Equity"], reportData.equity.total, "TOTAL EQUITY")}
        </div>
    `;

    // --- GRAND TOTALS HTML ---
    const grandTotalsHtml = `
        <div style="display: flex; width: 100%; margin-top: 20px; border-top: 2px solid #000;">
            <div style="width: 50%; padding-right: 10px;">
                <p style="font-size: 16px; font-weight: bold; margin: 5px 0;">TOTAL ASSETS: <span style="float: right;">${formatCurrency(reportData.assets.total)}</span></p>
            </div>
            <div style="width: 50%; padding-left: 10px;">
                <p style="font-size: 16px; font-weight: bold; margin: 5px 0;">TOTAL L&E: <span style="float: right;">${formatCurrency(reportData.total_liabilities_and_equity)}</span></p>
            </div>
        </div>
        <p style="text-align: center; font-weight: bold; margin-top: 15px; color: ${reportData.check === 'Balanced' ? '#4CAF50' : '#F44336'};">
            STATUS: ${reportData.check}
        </p>
    `;

    // --- Combine Sections for Global Print ---
    const printableContent = `
        <div style="display: flex; flex-direction: row; width: 100%; justify-content: space-between;">
            <div style="width: 50%;">${assetsHtml}</div>
            <div style="width: 50%;">${liaEquHtml}</div>
        </div>
        ${grandTotalsHtml}
    `;
    
    // --- Call globalPrint ---
    globalPrint({
        title: `Balance Sheet - ${reportDate}`,
        content: printableContent,
        orientation: 'portrait', // Balance Sheet is usually Portrait
        header: `
            <div style="text-align: center; font-size: 18px; font-weight: bold;">Ligco Technologies</div>
            <div style="text-align: center; font-size: 14px; margin-bottom: 5px;">Balance Sheet</div>
            <div style="text-align: center; font-size: 12px; color: #555;">As of ${reportDate}</div>
        `,
        footer: `
            <div style="text-align: center; font-size: 9px; color: #888;">Report ID: ${reportMetadata.serial} | Page {pageNumber} of {totalPages}</div>
        `,
        styles: `
            body { font-family: Arial, sans-serif; }
            table { border-collapse: collapse; page-break-inside: avoid; }
            td { padding: 3px 5px; }
        `
    });
  }, [reportData, reportMetadata, getGroupedData, formatCurrency]);


  // --- Export Handlers (Updated for Left Align & Amount Consistency) ---
  const handleExportPDF = useCallback(() => {
// ... (PDF export logic remains unchanged) ...
    if (!reportData || !reportMetadata) return;

    const doc = new jsPDF();
    const companyName = "Ligco Technologies";
    const reportTitle = "Balance Sheet";
    const reportPeriod = `As of ${reportData.report_date}`;
    const pageContentWidth = doc.internal.pageSize.width - 28;
    const halfWidth = pageContentWidth / 2;

    // PDF Header (Centered)
    doc.setFontSize(18);
    doc.text(companyName, doc.internal.pageSize.width / 2, 22, { align: 'center' });
    doc.setFontSize(14);
    doc.text(reportTitle, doc.internal.pageSize.width / 2, 30, { align: 'center' });
    doc.setFontSize(10);
    doc.text(reportPeriod, doc.internal.pageSize.width / 2, 36, { align: 'center' });

    // Metadata (Centered)
    doc.setFontSize(9);
    const metaText = `Report ID: ${reportMetadata.serial} | Generated At: ${reportMetadata.generatedAt} | Generated By: ${reportMetadata.generatedBy}`;
    doc.text(metaText, doc.internal.pageSize.width / 2, 46, { align: 'center' });

    // --- Prepare Data (Using Raw Numbers) ---
    const allAssets = reportData.assets.accounts || [];
    const allLiabilities = reportData.liabilities.accounts || [];
    const allEquity = reportData.equity.accounts || [];

    const currentAssets = getGroupedData(allAssets, ["Current Asset"]);
    const nonCurrentAssets = getGroupedData(allAssets, ["Fixed Asset", "Non-Current Asset"]);
    const currentLiabilities = getGroupedData(allLiabilities, ["Current Liability"]);
    const nonCurrentLiabilities = getGroupedData(allLiabilities, ["Non-Current Liability"]);

    // Calculate subtotals using raw numbers
    const totalCurrentAssets = currentAssets.reduce((sum, acc) => sum + (Number(acc.balance) || 0), 0);
    const totalNonCurrentAssets = nonCurrentAssets.reduce((sum, acc) => sum + (Number(acc.balance) || 0), 0);
    const totalCurrentLiabilities = currentLiabilities.reduce((sum, acc) => sum + (Number(acc.balance) || 0), 0);
    const totalNonCurrentLiabilities = nonCurrentLiabilities.reduce((sum, acc) => sum + (Number(acc.balance) || 0), 0);
    const rawTotalEquity = Number(reportData.equity.total) || 0; // Use raw API total

    // Build Asset Rows [Item Object, Amount Object]
    const assetRows = [
      [{ content: 'Current Assets', styles: { fontStyle: 'bold', halign: 'left'} }, ''], // Left Section Title
      ...currentAssets.map(acc => [{ content: `  ${acc.account_name}`, styles: { halign: 'left'} }, acc.balance]), // Left Account Name
      [{ content: 'Total Current Assets', styles: { fontStyle: 'bold', halign: 'left'} }, { content: totalCurrentAssets, styles: { fontStyle: 'bold', halign: 'right' } }], // Keep amount right aligned in PDF
      ['', ''], // Spacer
      [{ content: 'Non-Current Assets', styles: { fontStyle: 'bold', halign: 'left'} }, ''], // Left Section Title
      ...nonCurrentAssets.map(acc => [{ content: `  ${acc.account_name}`, styles: { halign: 'left'} }, acc.balance]), // Left Account Name
      [{ content: 'Total Non-Current Assets', styles: { fontStyle: 'bold', halign: 'left'} }, { content: totalNonCurrentAssets, styles: { fontStyle: 'bold', halign: 'right' } }],
    ];

    // Build L&E Rows [Item Object, Amount Object]
    const liaEquRows = [
      [{ content: 'Current Liabilities', styles: { fontStyle: 'bold', halign: 'left'} }, ''], // Left Section Title
      ...currentLiabilities.map(acc => [{ content: `  ${acc.account_name}`, styles: { halign: 'left'} }, acc.balance]), // Left Account Name
      [{ content: 'Total Current Liabilities', styles: { fontStyle: 'bold', halign: 'left'} }, { content: totalCurrentLiabilities, styles: { fontStyle: 'bold', halign: 'right' } }],
      ['', ''], // Spacer
      [{ content: 'Non-Current Liabilities', styles: { fontStyle: 'bold', halign: 'left'} }, ''], // Left Section Title
      ...nonCurrentLiabilities.map(acc => [{ content: `  ${acc.account_name}`, styles: { halign: 'left'} }, acc.balance]), // Left Account Name
      [{ content: 'Total Non-Current Liabilities', styles: { fontStyle: 'bold', halign: 'left'} }, { content: totalNonCurrentLiabilities, styles: { fontStyle: 'bold', halign: 'right' } }],
      ['', ''], // Spacer
      [{ content: 'Equity', styles: { fontStyle: 'bold', halign: 'left'} }, ''], // Left Section Title
      ...allEquity.map(acc => [{ content: `  ${acc.account_name}`, styles: { halign: 'left'} }, acc.balance]), // Left Account Name
      [{ content: 'TOTAL EQUITY', styles: { fontStyle: 'bold', halign: 'left'} }, { content: rawTotalEquity, styles: { fontStyle: 'bold', halign: 'right' } }],
    ];

    // --- Combine rows ---
    const tableBody = [];
    const maxLength = Math.max(assetRows.length, liaEquRows.length);

    for (let i = 0; i < maxLength; i++) {
      const assetRow = assetRows[i] || ['', ''];
      const liaEquRow = liaEquRows[i] || ['', ''];

      tableBody.push([
        assetRow[0], // Cell content/style object
        { content: formatCurrency(assetRow[1]), styles: { halign: 'right' } }, // Format amount for display
        liaEquRow[0], // Cell content/style object
        { content: formatCurrency(liaEquRow[1]), styles: { halign: 'right' } } // Format amount for display
      ]);
    }

    // --- Main Table ---
    autoTable(doc, {
      startY: 54, // Start below metadata
      head: [['Assets', '', 'Liabilities & Equity', '']],
      body: tableBody,
      theme: "plain",
      styles: { textColor: [0, 0, 0], fontSize: 9 },
      headStyles: { fontStyle: 'bold', fillColor: [255, 255, 255], textColor: [0, 0, 0], halign: 'left' }, // Left Align Headers
      columnStyles: {
        0: { cellWidth: halfWidth * 0.8, halign: 'left' },  // Asset Name Left
        1: { cellWidth: halfWidth * 0.2, halign: 'right' }, // Asset Amount Right
        2: { cellWidth: halfWidth * 0.8, halign: 'left' },  // L&E Name Left
        3: { cellWidth: halfWidth * 0.2, halign: 'right' }  // L&E Amount Right
      },
       didDrawPage: (data) => {
           // Draw vertical line separator on each page if table spans
           const startYLine = data.settings.startY - 5; // Slightly above table start
           const endYLine = data.cursor.y + 5; // Slightly below table end on current page
           doc.setLineWidth(0.1);
           doc.line(doc.internal.pageSize.width / 2, startYLine, doc.internal.pageSize.width / 2, endYLine);
       }
    });

    // --- Totals Table ---
    const totalsBody = [
      [
        { content: 'TOTAL ASSETS', styles: { fontStyle: 'bold', halign: 'left' } }, // Left Total Label
        { content: formatCurrency(reportData.assets.total), styles: { fontStyle: 'bold', halign: 'right' } },
        { content: 'TOTAL LIABILITIES & EQUITY', styles: { fontStyle: 'bold', halign: 'left' } }, // Left Total Label
        { content: formatCurrency(reportData.total_liabilities_and_equity), styles: { fontStyle: 'bold', halign: 'right' } }
      ]
    ];

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 2, // Position below main table
      body: totalsBody,
      theme: "grid",
      styles: { textColor: [0, 0, 0], lineColor: [100, 100, 100], fontSize: 10 },
      columnStyles: { // Match main table widths/alignment
        0: { cellWidth: halfWidth * 0.8, halign: 'left' },
        1: { cellWidth: halfWidth * 0.2, halign: 'right' },
        2: { cellWidth: halfWidth * 0.8, halign: 'left' },
        3: { cellWidth: halfWidth * 0.2, halign: 'right' }
      },
    });

    // --- Final Check (Centered Below Totals) ---
    doc.setFontSize(10);
    const checkText = reportData.check === 'Balanced'
        ? 'Balanced'
        : `Unbalanced (Difference: ${formatCurrency(Math.abs(reportData.assets.total - reportData.total_liabilities_and_equity))})`;
    doc.text(checkText, doc.internal.pageSize.width / 2, doc.lastAutoTable.finalY + 10, { align: 'center' });


    doc.save(`Balance-Sheet-${reportMetadata.serial}.pdf`);
  }, [reportData, reportMetadata, getGroupedData, formatCurrency]);


  const handleExportCSV = useCallback(() => {
// ... (CSV export logic remains unchanged) ...
    if (!reportData || !reportMetadata) return;

    let csv = "data:text/csv;charset=utf-8,\uFEFF"; // BOM for Excel
    csv += "Balance Sheet\n";
    csv += `As of,${reportData.report_date}\n`;
    csv += `Report ID,${reportMetadata.serial}\n`;
    csv += `Generated At,${reportMetadata.generatedAt}\n`;
    csv += `Generated By,${reportMetadata.generatedBy}\n\n`;

    // --- Prepare Data (Raw Numbers) ---
    const allAssets = reportData.assets.accounts || [];
    const allLiabilities = reportData.liabilities.accounts || [];
    const allEquity = reportData.equity.accounts || [];

    const currentAssets = getGroupedData(allAssets, ["Current Asset"]);
    const nonCurrentAssets = getGroupedData(allAssets, ["Fixed Asset", "Non-Current Asset"]);
    const currentLiabilities = getGroupedData(allLiabilities, ["Current Liability"]);
    const nonCurrentLiabilities = getGroupedData(allLiabilities, ["Non-Current Liability"]);

    const totalCurrentAssets = currentAssets.reduce((sum, acc) => sum + (Number(acc.balance) || 0), 0);
    const totalNonCurrentAssets = nonCurrentAssets.reduce((sum, acc) => sum + (Number(acc.balance) || 0), 0);
    const totalCurrentLiabilities = currentLiabilities.reduce((sum, acc) => sum + (Number(acc.balance) || 0), 0);
    const totalNonCurrentLiabilities = nonCurrentLiabilities.reduce((sum, acc) => sum + (Number(acc.balance) || 0), 0);
    const rawTotalEquity = Number(reportData.equity.total) || 0;

    // Build Asset Rows [Item, Amount (Raw)]
    const assetRows = [
      ['Current Assets', ''],
      ...currentAssets.map(acc => [`  ${acc.account_name}`, acc.balance]),
      ['Total Current Assets', totalCurrentAssets],
      ['', ''], // Spacer
      ['Non-Current Assets', ''],
      ...nonCurrentAssets.map(acc => [`  ${acc.account_name}`, acc.balance]),
      ['Total Non-Current Assets', totalNonCurrentAssets],
    ];

    // Build L&E Rows [Item, Amount (Raw)]
    const liaEquRows = [
      ['Current Liabilities', ''],
      ...currentLiabilities.map(acc => [`  ${acc.account_name}`, acc.balance]),
      ['Total Current Liabilities', totalCurrentLiabilities],
      ['', ''], // Spacer
      ['Non-Current Liabilities', ''],
      ...nonCurrentLiabilities.map(acc => [`  ${acc.account_name}`, acc.balance]),
      ['Total Non-Current Liabilities', totalNonCurrentLiabilities],
      ['', ''], // Spacer
      ['Equity', ''],
      ...allEquity.map(acc => [`  ${acc.account_name}`, acc.balance]),
      ['TOTAL EQUITY', rawTotalEquity],
    ];

    // --- Combine rows ---
    csv += "Assets,Amount,Liabilities & Equity,Amount\n"; // Headers remain left-aligned
    const maxLength = Math.max(assetRows.length, liaEquRows.length);

    for (let i = 0; i < maxLength; i++) {
      const assetRow = assetRows[i] || ['', ''];
      const liaEquRow = liaEquRows[i] || ['', ''];

      const assetName = `"${assetRow[0].toString().replace(/"/g, '""')}"`;
      const liaEquName = `"${liaEquRow[0].toString().replace(/"/g, '""')}"`;
      // Use raw numbers, handle potential non-numeric values gracefully
      const assetAmount = assetRow[1] === '' ? '' : (Number(assetRow[1]) || 0);
      const liaEquAmount = liaEquRow[1] === '' ? '' : (Number(liaEquRow[1]) || 0);

      csv += `${assetName},${assetAmount},${liaEquName},${liaEquAmount}\n`;
    }

    // --- Totals Row ---
    csv += "\n"; // Spacer
    // Use raw numbers from API data
    const rawTotalAssets = Number(reportData.assets.total) || 0;
    const rawTotalLiabilitiesEquity = Number(reportData.total_liabilities_and_equity) || 0;
    csv += `"TOTAL ASSETS",${rawTotalAssets},"TOTAL LIABILITIES & EQUITY",${rawTotalLiabilitiesEquity}\n`;

    // --- Final Check ---
    const difference = Math.abs(rawTotalAssets - rawTotalLiabilitiesEquity);
    const checkText = reportData.check === 'Balanced' ? 'Balanced' : `Unbalanced (Diff: ${difference.toFixed(2)})`;
    csv += `"Check:",${checkText},,\n`; // Add difference info if unbalanced

    // --- Download ---
    const encodedUri = encodeURI(csv);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Balance-Sheet-${reportMetadata.serial}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [reportData, reportMetadata, getGroupedData, formatCurrency]);


  return (
    <Box m={{ xs: "10px", md: "20px" }}>
      <Header
        title="Balance Sheet"
        subtitle="A snapshot of your company's financial position"
      />

      {/* --- Date Selection Form --- */}
      <Paper
        elevation={3}
        sx={{
          p: { xs: 2, md: 3 },
          mb: 3,
          backgroundColor: colors.primary[400],
        }}
      >
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={8}>
            <TextField
              fullWidth
              label="As of Date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              variant="outlined"
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <Button
              fullWidth
              variant="contained"
              color="secondary"
              onClick={handleGenerateReport}
              disabled={loading}
              sx={{ height: "56px", fontSize: "16px" }}
            >
              {loading ? <CircularProgress size={24} /> : "Generate"}
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* --- Loading Spinner --- */}
      {loading && (
        <Box display="flex" justifyContent="center" p={5}>
          <CircularProgress />
        </Box>
      )}

      {/* --- Report Display --- */}
      {reportData && (
        <Paper
          elevation={3}
          sx={{
            p: { xs: 2, md: 3 },
            backgroundColor: colors.primary[400],
          }}
        >
          {/* Action Buttons */}
          <Box display="flex" justifyContent="flex-end" mb={2}>
            <Stack direction="row" spacing={1}>
              <Tooltip title="Print Report">
                <IconButton
                  onClick={handlePrint}
                  sx={{ color: colors.grey[100] }}
                >
                  <PrintOutlinedIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Export as PDF">
                <IconButton
                  onClick={handleExportPDF}
                  sx={{ color: colors.grey[100] }}
                >
                  <PictureAsPdfOutlinedIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Export as CSV">
                <IconButton
                  onClick={handleExportCSV}
                  sx={{ color: colors.grey[100] }}
                >
                  <DescriptionOutlinedIcon />
                </IconButton>
              </Tooltip>
            </Stack>
          </Box>
          <Divider sx={{ mb: 2 }} />

          {/* The Report itself */}
          <BalanceSheetReport
            ref={reportContentRef}
            data={reportData}
            metadata={reportMetadata}
            colors={colors}
          />
        </Paper>
      )}
    </Box>
  );
}