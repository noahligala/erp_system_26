import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Typography,
  IconButton,
  TextField,
  CircularProgress,
  Tooltip,
  Grid,
  Paper,
  Alert,
  useTheme,
  Divider,
} from "@mui/material";
import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  FirstPage as FirstPageIcon,
  LastPage as LastPageIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Lock as LockIcon,
  Refresh as RefreshIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Bolt as GenerateIcon,
  Print as PrintIcon, // Import Print Icon
  Dashboard as DashboardIcon, // Import Dashboard Icon
} from "@mui/icons-material";
import { DateTime } from "luxon";
import Header from "../../components/Header.jsx"; // Assuming path relative to scenes folder
import {apiClient} from "../../api/apiClient.js"; // Assuming path relative to scenes folder
import { LocalizationProvider, DesktopDatePicker } from "@mui/x-date-pickers";
import { AdapterLuxon } from "@mui/x-date-pickers/AdapterLuxon";
import { tokens } from "../../theme.js"; // Assuming path relative to scenes folder
import { toast } from 'react-toastify';
import { useNavigate } from "react-router-dom"; // Import useNavigate

// --- Helper Component for Dynamic Fields ---
const DynamicFieldList = ({
  title,
  items,
  onChange,
  onAdd,
  onRemove,
  isEditable,
}) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const displayItems = Array.isArray(items) ? items : [];

  return (
    <Box sx={{ p: 2, border: `1px solid ${colors.grey[700]}`, borderRadius: '4px', mt: 1 }}>
      <Typography variant="h6" sx={{ color: colors.grey[300], mb: 2 }}>
        {title}
      </Typography>
      {displayItems.length === 0 && !isEditable && (
         <Typography variant="body2" color="textSecondary" sx={{fontStyle: 'italic'}}>No {title.toLowerCase()} recorded.</Typography>
      )}
      {displayItems.map((item, index) => (
        <Grid container spacing={1} key={`${title}-${index}`} sx={{ mb: 1.5 }} alignItems="center">
          <Grid item xs={6} sm={5}>
            <TextField
              label="Item Name"
              value={item.name || ''}
              disabled={!item.isCustom || !isEditable}
              onChange={(e) => onChange(index, "name", e.target.value)}
              fullWidth
              size="small"
              variant="outlined"
            />
          </Grid>
          <Grid item xs={5} sm={6}>
            <TextField
              label="Amount"
              type="number"
              value={item.amount || 0}
              disabled={!isEditable}
              onChange={(e) => onChange(index, "amount", e.target.value)}
              fullWidth
              size="small"
              variant="outlined"
              InputProps={{ inputProps: { min: 0, step: 0.01 } }}
            />
          </Grid>
          <Grid item xs={1}>
            {item.isCustom && isEditable && (
              <Tooltip title={`Remove ${item.name || 'item'}`}>
                  <IconButton onClick={() => onRemove(index)} size="small" color="error" sx={{ml: -1}}>
                    <DeleteIcon fontSize="small"/>
                  </IconButton>
              </Tooltip>
            )}
          </Grid>
        </Grid>
      ))}
      {isEditable && (
        <Button startIcon={<AddIcon />} onClick={onAdd} size="small" sx={{ mt: 1 }}>
          Add Custom {title.slice(0, -1)}
        </Button>
      )}
    </Box>
  );
};
// --- End Helper Component ---

const Payslips = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const navigate = useNavigate();

  const [payslips, setPayslips] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [form, setForm] = useState({});
  const [formExtras, setFormExtras] = useState({ allowances: [], deductions: [] });
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [activeMonth, setActiveMonth] = useState("");
  const [selectedDate, setSelectedDate] = useState(null);

  const defaultAllowances = [
    { name: "House", amount: 0, isCustom: false }, { name: "Commuter", amount: 0, isCustom: false },
    { name: "Responsibility", amount: 0, isCustom: false }, { name: "Disability", amount: 0, isCustom: false },
  ];
  const defaultDeductions = [];

  // Effect to parse and structure allowances/deductions
  useEffect(() => {
    const parseItems = (rawData, defaults) => {
        const currentDefaults = defaults.map(item => ({ ...item, amount: 0 }));
        const customItems = [];
        let data = rawData;
        if (typeof data === 'string') {
            try { data = JSON.parse(data); } catch (e) { console.error("Failed to parse JSON:", data, e); data = {}; }
        } else if (data === null || typeof data !== 'object') {
            data = {};
        }
        for (const key in data) {
            const amount = parseFloat(data[key]) || 0;
            const defaultItem = currentDefaults.find(item => item.name === key);
            if (defaultItem) { defaultItem.amount = amount; }
            else { customItems.push({ name: key, amount: amount, isCustom: true }); }
        }
        return [...currentDefaults, ...customItems];
    };
    setFormExtras({
        allowances: parseItems(form.allowances, defaultAllowances),
        deductions: parseItems(form.deductions, defaultDeductions),
    });
  }, [form.id, form.allowances, form.deductions]);

  // Initial data fetch
  useEffect(() => {
    fetchPayslips();
  }, []);

  // --- Utility Functions ---
  const formatMonth = (monthStr) => {
    if (!monthStr) return "";
    const [m, y] = monthStr.split("-");
    const dt = DateTime.fromObject({ month: Number(m), year: Number(y) });
    return dt.isValid ? dt.toFormat("LLL yyyy") : monthStr;
  };

  const formatDate = (date) =>
    date ? DateTime.fromISO(date).toFormat("dd LLL yyyy") : "—";

  const formatCurrency = (amount) => {
      const num = parseFloat(amount) || 0;
      // Adjust 'KES' and locale 'en-KE' as needed for Kenya Shillings
      return num.toLocaleString('en-KE', { style: 'currency', currency: 'KES' });
  };


  // --- API Functions ---
  const fetchPayslips = async (monthStr = "") => {
    setLoading(true);
    try {
      const url = monthStr ? `/payslips?month=${monthStr}` : `/payslips`;
      const res = await apiClient.get(url);
      const data = res.data?.data || [];
      const openMonth = res.data?.open_month ? `${res.data.open_month.month}-${res.data.open_month.year}` : "";

      setPayslips(data);
      setActiveMonth(openMonth);
      const dateToSet = monthStr ? monthStr : openMonth;
      if (dateToSet) {
        const [m, y] = dateToSet.split("-");
        setSelectedDate(DateTime.fromObject({ month: Number(m), year: Number(y), day: 1 }));
      } else {
        setSelectedDate(null);
      }
      if (data.length > 0) {
        // Ensure initial form data has parsed allowances/deductions if available directly
        const initialForm = data[0];
        setForm(initialForm);
        setCurrentIndex(0);
      } else {
        setForm({});
        setCurrentIndex(0);
      }
    } catch (err) {
      console.error("Fetch Payslips Error:", err);
      const errorMsg = err.response?.data?.error || err.response?.data?.message || "Failed to fetch data. Check connection or login.";
      toast.error(errorMsg);
      setPayslips([]);
      setForm({});
    } finally {
      setLoading(false);
    }
  };

  // --- Event Handlers ---
  const handleNavigate = (direction) => {
    if (payslips.length === 0 || isProcessing) return;
    setEditing(false);
    let newIndex = currentIndex;
    switch (direction) {
      case "first": newIndex = 0; break;
      case "prev": newIndex = Math.max(currentIndex - 1, 0); break;
      case "next": newIndex = Math.min(currentIndex + 1, payslips.length - 1); break;
      case "last": newIndex = payslips.length - 1; break;
      default: break;
    }
    setCurrentIndex(newIndex);
    setForm(payslips[newIndex]);
  };

  const handleSave = async () => {
    const isCreating = !form.id;
    setIsProcessing(true);

    try {
      const allowancesObject = formExtras.allowances.reduce((acc, item) => {
        const amount = parseFloat(item.amount) || 0;
        if (item.name && amount > 0) { acc[item.name.trim()] = amount; }
        return acc;
      }, {});
      const deductionsObject = formExtras.deductions.reduce((acc, item) => {
        const amount = parseFloat(item.amount) || 0;
        if (item.name && amount > 0) { acc[item.name.trim()] = amount; }
        return acc;
      }, {});

      const numericFields = ['basic_salary', 'gross_income', 'net_pay', 'tax_paid', 'loan_repayment', 'advance_repayment'];
      const processedForm = { ...form };
      numericFields.forEach(field => { processedForm[field] = parseFloat(processedForm[field]) || 0; });

      const payload = { ...processedForm, allowances: allowancesObject, deductions: deductionsObject };
      // Clean payload - remove read-only fields
      delete payload.national_id_number; delete payload.kra_pin; delete payload.nssf_number; delete payload.nhif_number;
      delete payload.bank_name; delete payload.bank_account_number; delete payload.employee_profile_id;
      delete payload.employee_name; delete payload.pay_period_start; delete payload.pay_period_end; // Let backend handle these


      let message = "";
      if (isCreating) {
        // Ensure user_id is included when creating
        payload.user_id = form.user_id;
        const res = await apiClient.post(`/payslips`, payload);
        message = res.data?.message || "Payslip created successfully!";
      } else {
        const res = await apiClient.put(`/payslips/${form.id}`, payload);
        message = res.data?.message || "Payslip updated successfully!";
      }

      toast.success(message);
      setEditing(false);
      const monthStr = selectedDate ? `${selectedDate.month}-${selectedDate.year}` : "";
      await fetchPayslips(monthStr);

    } catch (err) { /* ... error handling ... */ }
     finally { setIsProcessing(false); }
  };

 const handleDateChange = async (date) => {
    if (!date || isProcessing) return; // Prevent change during processing
    setEditing(false); // Stop editing when changing month
    setSelectedDate(date);
    const monthStr = `${date.month}-${date.year}`;
    await fetchPayslips(monthStr);
  };

  const handleCloseMonth = async () => {
    if (!activeMonth || isProcessing) {
      if (!activeMonth) toast.warn("No active month to close.");
      return;
    }
    if (!window.confirm(`Are you sure you want to close ${formatMonth(activeMonth)}? This cannot be undone.`)) return; // Stronger confirmation

    setIsProcessing(true); // Start processing
    try {
      const [month, year] = activeMonth.split("-");
      const monthEndDate = DateTime.fromObject({ year: Number(year), month: Number(month) }).endOf("month").toISODate();
      const res = await apiClient.post(`/payroll/close-month`, { month_end_date: monthEndDate });
      toast.success(res.data?.message || `Month ${formatMonth(activeMonth)} closed successfully.`);
      // No delay needed here, fetchPayslips will get the new active month
      await fetchPayslips(); // Refresh, fetches default (new active) month
    } catch (err) {
      console.error("Close Month Error:", err);
      const errorMsg = err.response?.data?.message || err.response?.data?.error || "Failed to close month.";
      toast.error(errorMsg);
    } finally {
      setIsProcessing(false); // End processing
    }
  };
  const handleGeneratePayslips = async () => {
    if (!activeMonth || isProcessing) {
        if(!activeMonth) toast.warn("No active month selected for generation.");
        return;
    }
    if (!window.confirm(`Generate ALL payslips for ${formatMonth(activeMonth)}? This action uses the backend calculation service.`)) return;

    setIsProcessing(true); // Start processing
    try {
      const [month, year] = activeMonth.split("-");
      const monthEndDate = DateTime.fromObject({ year: Number(year), month: Number(month) }).endOf("month").toISODate();

      const res = await apiClient.post(`/payroll/generate`, { pay_period_end: monthEndDate });
      toast.success(res.data?.message || "Payslips generation initiated successfully!");

      // --- ADDED DELAY ---
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay

      await fetchPayslips(`${month}-${year}`); // Refresh data for the *current* month after generation

    } catch (err) {
       console.error("Generate Payslips Error:", err);
       const errorMsg = err.response?.data?.message || err.response?.data?.error || "Failed to generate payslips.";
       toast.error(errorMsg);
    } finally {
      setIsProcessing(false); // End processing
    }
  };

  // Helper for simple text field changes
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // Helpers for managing the dynamic allowances/deductions lists
  const handleDynamicListChange = (listType, index, field, value) => {
    setFormExtras(prev => {
      const newList = [...prev[listType]];
      // Handle potential undefined list or index (shouldn't happen with current logic)
      if (!newList[index]) return prev;
      // Ensure amount is stored as a string for the TextField, handle parsing on save
      const newValue = value;
      newList[index] = { ...newList[index], [field]: newValue };
      return { ...prev, [listType]: newList };
    });
  };

  const handleAddDynamicItem = (listType) => {
    setFormExtras(prev => ({
      ...prev,
      [listType]: [...prev[listType], { name: "", amount: 0, isCustom: true }]
    }));
  };

  const handleRemoveDynamicItem = (listType, index) => {
     setFormExtras(prev => ({
      ...prev,
      [listType]: prev[listType].filter((_, i) => i !== index)
    }));
  };

 // --- Print Handlers ---
  const generatePayslipHTML = (payslipData, extras) => {
    // Basic HTML structure - enhance with CSS for better formatting
    let allowancesHTML = '<tr><td colspan="2" style="font-style: italic; color: #555;">No Allowances</td></tr>';
    const allowanceItems = Array.isArray(extras?.allowances) ? extras.allowances : [];
    if (allowanceItems.length > 0 && allowanceItems.some(a => parseFloat(a.amount) > 0)) {
        allowancesHTML = allowanceItems
            .filter(a => parseFloat(a.amount) > 0)
            .map(a => `<tr><td>${a.name}</td><td style="text-align: right;">${formatCurrency(a.amount)}</td></tr>`)
            .join('');
    }

    let deductionsHTML = ''; // Start empty for statutory items
    const deductionItems = Array.isArray(extras?.deductions) ? extras.deductions : [];
     if (deductionItems.length > 0 && deductionItems.some(d => parseFloat(d.amount) > 0)) {
        deductionsHTML = deductionItems
            .filter(d => parseFloat(d.amount) > 0)
            .map(d => `<tr><td>${d.name}</td><td style="text-align: right;">${formatCurrency(d.amount)}</td></tr>`)
            .join('');
    }
    // Calculate Total Deductions for summary
    const totalStatutoryAndCustomDeductions =
        (parseFloat(payslipData.tax_paid) || 0) +
        (parseFloat(payslipData.loan_repayment) || 0) +
        (parseFloat(payslipData.advance_repayment) || 0) +
        (deductionItems?.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0) || 0);


    return `
      <html> <head> <title>Payslip - ${payslipData.employee_name} - ${formatMonth(selectedDate?.toFormat('n-yyyy'))}</title>
          <style>
            body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif; margin: 20px; font-size: 10pt; color: #212121; }
            h1, h2, h3 { text-align: center; color: #1a237e; margin-bottom: 5px; } h1 {font-size: 1.5em;} h3 {font-size: 1.2em;} h2 { margin-bottom: 20px; font-size: 1.1em; color: #555;}
            table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
            th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; vertical-align: top; }
            th { background-color: #f0f0f0; font-weight: 600; color: #333;}
            .section-title { font-weight: 600; margin-top: 15px; border-bottom: 2px solid #3f51b5; padding-bottom: 4px; margin-bottom: 8px; font-size: 1.1em; color: #3f51b5; }
            .summary-table td { font-weight: 600; }
            .total td { font-size: 1.1em; font-weight: bold; background-color: #e8f5e9; border-top: 2px solid #66bb6a; color: #1b5e20; }
            .right { text-align: right; }
            .no-border-cell { border: none; }
            .sub-table { margin-top: 5px !important; width: 100%; }
            .sub-table td { border: none; padding: 4px 0px; border-bottom: 1px dotted #eee; }
            .sub-table tr:last-child td { border-bottom: none; }
            strong { font-weight: 600; }
            @media print { .page-break { page-break-after: always; } } /* Added page break for print */
          </style>
      </head> <body>
          <h1>Company Payslip</h1> <h3>${payslipData.employee_name || 'N/A'}</h3> <h2>Pay Period: ${formatDate(payslipData.pay_period_start)} - ${formatDate(payslipData.pay_period_end)}</h2>
          <div class="section-title">Employee Details</div> <table> <tr><th>National ID</th><td>${payslipData.national_id_number || 'N/A'}</td><th>KRA PIN</th><td>${payslipData.kra_pin || 'N/A'}</td></tr> <tr><th>NSSF No.</th><td>${payslipData.nssf_number || 'N/A'}</td><th>NHIF No.</th><td>${payslipData.nhif_number || 'N/A'}</td></tr> </table>
          <div class="section-title">Bank Details</div> <table> <tr><th>Bank Name</th><td>${payslipData.bank_name || 'N/A'}</td><th>Account No.</th><td>${payslipData.bank_account_number || 'N/A'}</td></tr> </table>
          <div class="section-title">Earnings & Deductions</div> <table style="width: 100%; border: none;"> <tr> <td class="no-border-cell" style="width: 50%; padding-right: 15px;"> <strong>Allowances</strong> <table class="sub-table">${allowancesHTML}</table> </td> <td class="no-border-cell" style="width: 50%; padding-left: 15px;"> <strong>Deductions</strong> <table class="sub-table"> <tr><td>Tax (PAYE)</td><td class="right">${formatCurrency(payslipData.tax_paid)}</td></tr> ${deductionsHTML} <tr><td>Loan Repayment</td><td class="right">${formatCurrency(payslipData.loan_repayment)}</td></tr> <tr><td>Advance Repayment</td><td class="right">${formatCurrency(payslipData.advance_repayment)}</td></tr> </table> </td> </tr> </table>
          <div class="section-title">Summary</div> <table class="summary-table"> <tr><td>Basic Salary</td><td class="right">${formatCurrency(payslipData.basic_salary)}</td></tr> <tr><td>Gross Income</td><td class="right">${formatCurrency(payslipData.gross_income)}</td></tr> <tr><td>Total Deductions</td><td class="right">${formatCurrency(totalStatutoryAndCustomDeductions)}</td></tr> <tr class="total"><td>Net Pay</td><td class="right">${formatCurrency(payslipData.net_pay)}</td></tr> </table>
      </body> </html>
    `;
  };

  const handlePrintCurrent = () => {
    if (!form.id) {
        toast.warn("Cannot print an unsaved or ungenerated payslip.");
        return;
    }
    const printWindow = window.open('', '_blank', 'height=600,width=800');
    if (printWindow) {
        printWindow.document.write(generatePayslipHTML(form, formExtras));
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => { printWindow.print(); }, 500);
    } else {
        toast.error("Could not open print window. Please disable popup blockers.");
    }
  };

  const handlePrintAll = () => {
     if (payslips.length === 0 || !payslips.every(p => p.id)) {
        toast.warn("No generated payslips available to print for this month.");
        return;
    }
    const printWindow = window.open('', '_blank', 'height=600,width=800');
     if (printWindow) {
        let allHTML = `<html><head><title>All Payslips - ${formatMonth(selectedDate?.toFormat('n-yyyy'))}</title><style> body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif; margin: 20px; font-size: 10pt; color: #212121; } h1, h2, h3 { text-align: center; color: #1a237e; margin-bottom: 5px; } h1 {font-size: 1.5em;} h3 {font-size: 1.2em;} h2 { margin-bottom: 20px; font-size: 1.1em; color: #555;} table { width: 100%; border-collapse: collapse; margin-bottom: 15px; } th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; vertical-align: top; } th { background-color: #f0f0f0; font-weight: 600; color: #333;} .section-title { font-weight: 600; margin-top: 15px; border-bottom: 2px solid #3f51b5; padding-bottom: 4px; margin-bottom: 8px; font-size: 1.1em; color: #3f51b5; } .summary-table td { font-weight: 600; } .total td { font-size: 1.1em; font-weight: bold; background-color: #e8f5e9; border-top: 2px solid #66bb6a; color: #1b5e20; } .right { text-align: right; } .no-border-cell { border: none; } .sub-table { margin-top: 5px !important; width: 100%; } .sub-table td { border: none; padding: 4px 0px; border-bottom: 1px dotted #eee; } .sub-table tr:last-child td { border-bottom: none; } strong { font-weight: 600; } @media print { .page-break { page-break-after: always; } } </style></head><body>`;

        payslips.forEach((payslip, index) => {
            // Need to temporarily parse extras for each slip
            const tempExtras = { allowances: [], deductions: [] };
            const parseItems = (rawData, defaults) => {
                const currentDefaults = defaults.map(item => ({ ...item, amount: 0 }));
                const customItems = [];
                let data = rawData;
                if (typeof data === 'string') { try { data = JSON.parse(data); } catch (e) { data = {}; } }
                else if (data === null || typeof data !== 'object') { data = {}; }
                for (const key in data) {
                    const amount = parseFloat(data[key]) || 0;
                    const defaultItem = currentDefaults.find(item => item.name === key);
                    if (defaultItem) { defaultItem.amount = amount; }
                    else { customItems.push({ name: key, amount: amount, isCustom: true }); }
                }
                return [...currentDefaults, ...customItems];
            };
            tempExtras.allowances = parseItems(payslip.allowances, defaultAllowances);
            tempExtras.deductions = parseItems(payslip.deductions, defaultDeductions);

            allHTML += generatePayslipHTML(payslip, tempExtras);
            if (index < payslips.length - 1) {
                allHTML += '<div class="page-break"></div>'; // Add page break
            }
        });

        allHTML += '</body></html>';
        printWindow.document.write(allHTML);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => { printWindow.print(); }, 500);
    } else {
        toast.error("Could not open print window. Please disable popup blockers.");
    }
  };
  // --- END: Print Handlers ---


  // --- Computed Values ---
  const isEditable = selectedDate && activeMonth && `${selectedDate.month}-${selectedDate.year}` === activeMonth;

  // --- Render ---
  if (loading && payslips.length === 0) {
    return ( <Box display="flex" justifyContent="center" alignItems="center" height="70vh"><CircularProgress size={60} /></Box> );
  }

    // --- RENDER ---
    return (
        <Box m={{ xs: "10px", md: "20px" }}>
        <Header title="Payslips" subtitle="View and manage employee payslips" />

        {/* --- Controls Section --- */}
        <Paper sx={{ p: 2, mb: 3, backgroundColor: colors.primary[400] }}>
            <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2}>
                {/* Left Side */}
                <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
                    <Typography variant="h6" sx={{ color: colors.grey[100], whiteSpace: 'nowrap' }}>
                        Active Month:{" "}
                        <Typography component="span" sx={{ color: colors.greenAccent[500], fontWeight: "bold" }}>
                            {activeMonth ? formatMonth(activeMonth) : "None"}
                        </Typography>
                    </Typography>
                    <LocalizationProvider dateAdapter={AdapterLuxon}>
                        <DesktopDatePicker label="View Month" views={["year", "month"]} minDate={DateTime.fromObject({ year: 2000, month: 1, day: 1 })} maxDate={DateTime.now().plus({ years: 1 })} value={selectedDate} onChange={handleDateChange} disabled={isProcessing} renderInput={(params) => ( <TextField {...params} size="small" sx={{ minWidth: 160, '& .MuiInputBase-root': { height: 40 } }} /> )} />
                    </LocalizationProvider>
                    <Tooltip title="Calculate & Generate All Payslips for Active Month">
                        <span>
                            <Button variant="contained" color="secondary" startIcon={<GenerateIcon />} onClick={handleGeneratePayslips} disabled={!isEditable || isProcessing || loading} size="medium"> Generate </Button>
                        </span>
                    </Tooltip>
                    <Tooltip title="Close Active Month">
                        <span>
                            <Button variant="outlined" color="error" startIcon={<LockIcon />} onClick={handleCloseMonth} disabled={!activeMonth || isProcessing || loading} size="medium"> Close Month </Button>
                        </span>
                    </Tooltip>
                </Box>
                {/* Right Side */}
                <Box display="flex" alignItems="center" gap={1}>
                    <Tooltip title="Go to Payroll Dashboard">
                        <Button variant="outlined" color="info" startIcon={<DashboardIcon />} onClick={() => navigate('/payroll')} size="medium"> Dashboard </Button>
                    </Tooltip>
                    <Tooltip title="Refresh Payslips">
                        <span>
                            <IconButton onClick={() => fetchPayslips(selectedDate ? `${selectedDate.month}-${selectedDate.year}` : "")} disabled={isProcessing || loading}> <RefreshIcon /> </IconButton>
                        </span>
                    </Tooltip>
                </Box>
            </Box>
        </Paper>

        {/* --- Payslip Viewer Section --- */}
        {payslips.length > 0 ? (
            <Paper sx={{ p: {xs: 2, md: 3}, mb: 3, backgroundColor: colors.primary[400], position: 'relative', overflow: 'hidden' }}>
            {/* Loading Overlay */}
            {isProcessing && ( <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.7)', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CircularProgress color="secondary" /></Box> )}
            
            {/* Print Buttons */}
            <Box sx={{ position: 'absolute', top: {xs: 8, md: 16}, right: {xs: 8, md: 16}, display: 'flex', flexDirection: {xs: 'column', sm: 'row'}, gap: 1, zIndex: 5 }}>
                 <Tooltip title="Print This Payslip">
                    <span>
                        <Button variant="contained" sx={{backgroundColor: colors.blueAccent[700], '&:hover': {backgroundColor: colors.blueAccent[600]}}} size="small" startIcon={<PrintIcon />} onClick={handlePrintCurrent} disabled={!form.id || isProcessing || loading}> Slip </Button>
                    </span>
                 </Tooltip>
                 <Tooltip title="Print All Payslips for this Month">
                    <span>
                        <Button variant="contained" sx={{backgroundColor: colors.blueAccent[700], '&:hover': {backgroundColor: colors.blueAccent[600]}}} size="small" startIcon={<PrintIcon />} onClick={handlePrintAll} disabled={!payslips.every(p => p.id) || isProcessing || loading}> All </Button>
                    </span>
                 </Tooltip>
            </Box>
            
            <Grid container spacing={3}>
                {/* Header */}
                <Grid item xs={12}  sx={{ p: 3, borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <Typography variant="h4" gutterBottom> Employee: <Typography component="span" variant="h4" fontWeight="bold">{form?.employee_name || "Unknown"}</Typography> </Typography>
                    <Typography variant="body1" color={colors.grey[300]} gutterBottom> Pay Period: {formatDate(form.pay_period_start)} → {formatDate(form.pay_period_end)} </Typography>
                    {!form.id && isEditable && ( <Alert severity="warning" variant="outlined" sx={{ mt: 1, borderColor: colors.yellowAccent[400], color: colors.yellowAccent[400] }}> This payslip has not been created. Save manually or use "Generate Payslips". </Alert> )}
                    {form.id && !isEditable && ( <Alert severity="info" variant="outlined" sx={{ mt: 1, borderColor: colors.blueAccent[400], color: colors.blueAccent[300] }}> This is a closed month. Data is read-only. </Alert> )}
                </Grid>
            </Grid>

            <Grid container spacing={3}>

                {/* Employee Details */}
                <Grid item xs={12}>
                    <Paper elevation={0}  sx={{ p: 2, backgroundColor: colors.primary[500], borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center' }} >
                        <Typography variant="h5" gutterBottom sx={{ color: colors.greenAccent[400], mb: 2 }}>Employee Details</Typography>
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={6} md={3}><TextField label="National ID" fullWidth value={form.national_id_number || "N/A"} InputProps={{ readOnly: true }} variant="filled" size="small" /></Grid>
                            <Grid item xs={12} sm={6} md={3}><TextField label="KRA PIN" fullWidth value={form.kra_pin || "N/A"} InputProps={{ readOnly: true }} variant="filled" size="small"/></Grid>
                            <Grid item xs={12} sm={6} md={3}><TextField label="NSSF No." fullWidth value={form.nssf_number || "N/A"} InputProps={{ readOnly: true }} variant="filled" size="small"/></Grid>
                            <Grid item xs={12} sm={6} md={3}><TextField label="NHIF No." fullWidth value={form.nhif_number || "N/A"} InputProps={{ readOnly: true }} variant="filled" size="small"/></Grid>
                        </Grid>
                    </Paper>
                </Grid>

                {/* Bank Details */}
                <Grid item xs={12} >
                    <Paper elevation={0} sx={{ p: 2, backgroundColor: colors.primary[500], borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <Typography variant="h5" gutterBottom sx={{ color: colors.greenAccent[400], mb: 2 }}>Bank Details</Typography>
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}><TextField label="Bank Name" fullWidth value={form.bank_name || "N/A"} InputProps={{ readOnly: true }} variant="filled" size="small"/></Grid>
                            <Grid item xs={12} sm={6}><TextField label="Bank Account No." fullWidth value={form.bank_account_number || "N/A"} InputProps={{ readOnly: true }} variant="filled" size="small"/></Grid>
                        </Grid>
                    </Paper>
                </Grid>

                {/* Salary Details & Calculations */}
                <Grid item xs={12}>
                    <Paper elevation={0} sx={{ p: 2, backgroundColor: colors.primary[500], borderRadius: '8px' }}>
                        <Typography variant="h5" gutterBottom sx={{ color: colors.greenAccent[400], mb: 2 }}>Salary Details & Calculations</Typography>
                        <Grid container spacing={2}>
                             <Grid item xs={12} sm={6} md={3}><TextField label="Basic Salary" fullWidth name="basic_salary" value={form.basic_salary || "0"} type="number" disabled={!editing || !isEditable} onChange={handleFormChange} size="small"/></Grid>
                             <Grid item xs={12} sm={6} md={3}><TextField label="Gross Income" fullWidth name="gross_income" value={form.gross_income || "0"} type="number" disabled={!editing || !isEditable} onChange={handleFormChange} size="small"/></Grid>
                             <Grid item xs={12} sm={6} md={3}><TextField label="Tax Paid (PAYE)" fullWidth name="tax_paid" value={form.tax_paid || "0"} type="number" disabled={!editing || !isEditable} onChange={handleFormChange} size="small"/></Grid>
                             <Grid item xs={12} sm={6} md={3}><TextField label="Loan Repayment" fullWidth name="loan_repayment" value={form.loan_repayment || "0"} type="number" disabled={!editing || !isEditable} onChange={handleFormChange} size="small"/></Grid>
                             <Grid item xs={12} sm={6} md={3}><TextField label="Advance Repayment" fullWidth name="advance_repayment" value={form.advance_repayment || "0"} type="number" disabled={!editing || !isEditable} onChange={handleFormChange} size="small"/></Grid>
                        </Grid>
                        {/* Dynamic Lists */}
                        <Grid container spacing={3} sx={{ mt: 1 }}>
                            <Grid item xs={12} md={6}><DynamicFieldList title="Allowances" items={formExtras.allowances} onChange={(index, field, value) => handleDynamicListChange("allowances", index, field, value)} onAdd={() => handleAddDynamicItem("allowances")} onRemove={(index) => handleRemoveDynamicItem("allowances", index)} isEditable={editing && isEditable} /></Grid>
                            <Grid item xs={12} md={6}><DynamicFieldList title="Deductions" items={formExtras.deductions} onChange={(index, field, value) => handleDynamicListChange("deductions", index, field, value)} onAdd={() => handleAddDynamicItem("deductions")} onRemove={(index) => handleRemoveDynamicItem("deductions", index)} isEditable={editing && isEditable} /></Grid>
                        </Grid>
                        {/* Net Pay */}
                        <Grid item xs={12} sx={{mt: 3}}>
                            <TextField label="Net Pay" fullWidth name="net_pay" value={form.net_pay || "0"} type="number" disabled={!editing || !isEditable} onChange={handleFormChange} size="medium" InputProps={{ sx: {fontSize: "1.2rem", fontWeight: 'bold'} }} sx={{ "& .MuiInputBase-root": { backgroundColor: colors.greenAccent[900] }, "& .MuiFormLabel-root": { fontWeight: "bold", color: colors.greenAccent[200] } }} />
                        </Grid>
                    </Paper>
                </Grid>

            </Grid> {/* End Main Content Grid */}

            {/* --- Navigation + Actions Footer --- */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mt={3} pt={2} borderTop={`1px solid ${colors.grey[700]}`}>
                <Box display="flex" alignItems="center">
                  <Tooltip title="First Employee"><IconButton onClick={() => handleNavigate("first")} disabled={isProcessing || loading || payslips.length <= 1}><FirstPageIcon /></IconButton></Tooltip>
                  <Tooltip title="Previous Employee"><IconButton onClick={() => handleNavigate("prev")} disabled={isProcessing || loading || currentIndex === 0}><ChevronLeftIcon /></IconButton></Tooltip>
                  <Typography variant="body2" sx={{ p: 1, userSelect: "none", color: colors.grey[300], minWidth: '60px', textAlign: 'center' }}> {payslips.length > 0 ? `${currentIndex + 1} / ${payslips.length}` : '0 / 0'} </Typography>
                  <Tooltip title="Next Employee"><IconButton onClick={() => handleNavigate("next")} disabled={isProcessing || loading || currentIndex === payslips.length - 1}><ChevronRightIcon /></IconButton></Tooltip>
                  <Tooltip title="Last Employee"><IconButton onClick={() => handleNavigate("last")} disabled={isProcessing || loading || payslips.length <= 1}><LastPageIcon /></IconButton></Tooltip>
                </Box>
                <Box>
                  {isEditable && ( <> {editing ? ( <Button variant="contained" color="secondary" startIcon={<SaveIcon />} onClick={handleSave} disabled={isProcessing || loading}> Save Changes </Button> ) : ( <Button variant="outlined" color="secondary" startIcon={<EditIcon />} onClick={() => setEditing(true)} disabled={isProcessing || loading}> Edit Payslip </Button> )} </> )}
                </Box>
            </Box>
        </Paper>
        ) : (
            // --- Empty State ---
            <Paper sx={{ p: 3, backgroundColor: colors.primary[400], textAlign: 'center' }}>
            <Typography sx={{mb: 2}}> No active employees found for this company, or payslips have not been generated for {selectedDate ? formatMonth(selectedDate.toFormat('n-yyyy')) : 'this period'}. </Typography>
            {isEditable && ( <Button variant="contained" color="secondary" startIcon={<GenerateIcon />} onClick={handleGeneratePayslips} disabled={isProcessing || loading}> Generate Payslips for {formatMonth(activeMonth)} </Button> )}
            </Paper>
        )}
        </Box>
    );
};

export default Payslips;