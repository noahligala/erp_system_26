// src/scenes/team/Team.jsx
import React, { useEffect, useState } from "react";
import {
    Box,
    IconButton,
    Tooltip,
    } from "@mui/material";
    import { DataGrid, GridToolbar } from "@mui/x-data-grid";
    import {
    Print as PrintIcon,
    Refresh as RefreshIcon,
    } from "@mui/icons-material";
    import Header from "../../views/global/Header.jsx";
    import apiClient from "../../data/utils/apiClient.js"; // named export fix

    const Team = () => {
    const [team, setTeam] = useState([]);
    const [firmDetails, setFirmDetails] = useState(null);
    const [loading, setLoading] = useState(false);
    const [columnVisibilityModel, setColumnVisibilityModel] = useState({});

    const columns = [
        { field: "employeeID", headerName: "Employee ID", flex: 1 },
        { field: "name", headerName: "Name", flex: 1 },
        { field: "position", headerName: "Position", flex: 1 },
        { field: "department", headerName: "Department", flex: 1 },
        { field: "salary", headerName: "Salary", flex: 1 },
        { field: "bankName", headerName: "Bank Name", flex: 1 },
        { field: "bankBranch", headerName: "Bank Branch", flex: 1 },
        { field: "accountNumber", headerName: "Account Number", flex: 1 },
    ];

    const fetchTeam = async () => {
        setLoading(true);
        try {
        const data = await apiClient("http://localhost:8000/api/employees");
        setTeam(Array.isArray(data) ? data : []);
        } catch (error) {
        console.error("Error fetching employees:", error.message);
        } finally {
        setLoading(false);
        }
    };

    const fetchFirmDetails = async () => {
        try {
        const data = await apiClient("http://localhost:8000/api/company");
        if (data && typeof data === "object") setFirmDetails(data);
        else if (Array.isArray(data) && data.length > 0) setFirmDetails(data[0]);
        } catch (error) {
        console.error("Error fetching firm details:", error.message);
        }
    };

    useEffect(() => {
        fetchTeam();
        fetchFirmDetails();
    }, []);

    const handlePrint = () => {
        const visibleColumns = columns.filter(
        (col) => columnVisibilityModel[col.field] !== false
        );

        const letterhead = firmDetails
        ? `
            <div style="text-align:center; margin-bottom:10px;">
            ${firmDetails.logo
                ? `<img src="${firmDetails.logo}" width="80" height="80" style="object-fit:contain; margin-bottom:4px;" />`
                : ""
            }
            <h2 style="margin:0;">${firmDetails.name ?? "Firm Name"}</h2>
            <p style="margin:4px 0; font-size:12px;">
                ${firmDetails.email_address ? `Email: ${firmDetails.email_address} | ` : ""}
                ${firmDetails.tel_number ? `Tel: ${firmDetails.tel_number}` : ""}<br/>
                ${firmDetails.website_url ? `Website: ${firmDetails.website_url}` : ""}
            </p>
            <hr style="margin:6px 0; border:none; border-top:1px solid rgba(0,0,0,0.2);" />
            <h3 style="margin:8px 0; font-size:14px;">Employee Report</h3>
            </div>`
        : `<div style="text-align:center;"><h3>Employee Report</h3></div>`;

        const tableHTML = `
        <table>
            <thead>
            <tr>${visibleColumns.map((col) => `<th>${col.headerName}</th>`).join("")}</tr>
            </thead>
            <tbody>
            ${team
                .map(
                (row) =>
                    `<tr>${visibleColumns
                    .map((col) => `<td>${row[col.field] ?? ""}</td>`)
                    .join("")}</tr>`
                )
                .join("")}
            </tbody>
        </table>`;

        const user = JSON.parse(localStorage.getItem("user") || "{}");

        const printWindow = window.open("", "", "width=1200,height=800");
        printWindow.document.write(`
        <html>
            <head>
            <title>Employee Report</title>
            <style>
                @page {
                size: A4 landscape;
                margin: 25px;
                }
                html, body {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                font-family: 'Source Sans 3', sans-serif;
                background-color: #fff;
                margin: 0;
                padding: 0;
                }
                table {
                width: 100%;
                border-collapse: collapse;
                font-size: 11px;
                }
                th, td {
                border: 1px solid #ccc;
                padding: 5px 8px;
                text-align: left;
                }
                th {
                background: #f0f0f0;
                font-weight: 600;
                }
                tr:nth-child(even) {
                background: #fafafa;
                }
                .footer {
                display: flex;
                justify-content: space-between;
                margin-top: 40px;
                font-size: 12px;
                }
                .signature {
                border-top: 1px solid #000;
                width: 180px;
                text-align: center;
                margin-top: 30px;
                }
            </style>
            </head>
            <body>
            ${letterhead}
            ${tableHTML}
            <div class="footer">
                <div>
                <p>Prepared By:</p>
                <div class="signature"></div>
                </div>
                <div>
                <p>Printed By: ${user.company_role ?? "Admin"}</p>
                <p>Date: ${new Date().toLocaleDateString()}</p>
                </div>
            </div>
            </body>
        </html>
        `);
        printWindow.document.close();
        printWindow.onload = () => {
        printWindow.focus();
        printWindow.print();
        };
    };

    return (
        <Box
        m="10px"
        height="85vh"
        sx={{
            overflowX: "auto",
            overflowY: "auto",
            scrollBehavior: "smooth",
            "&::-webkit-scrollbar": { display: "none" },
            scrollbarWidth: "none",
        }}
        >
        <Header title="EMPLOYEE DIRECTORY" subtitle="Managing the team members" />

        <Box display="flex" justifyContent="flex-end" mb={1} gap={1}>
            <Tooltip title="Print Employee Report">
            <IconButton
                onClick={handlePrint}
                sx={{
                backgroundColor: "#1976d2",
                color: "#fff",
                "&:hover": { backgroundColor: "#1565c0" },
                width: 32,
                height: 32,
                }}
            >
                <PrintIcon fontSize="small" />
            </IconButton>
            </Tooltip>

            <Tooltip title="Refresh Data">
            <IconButton
                onClick={fetchTeam}
                sx={{
                backgroundColor: "#43a047",
                color: "#fff",
                "&:hover": { backgroundColor: "#2e7d32" },
                width: 32,
                height: 32,
                }}
            >
                <RefreshIcon fontSize="small" />
            </IconButton>
            </Tooltip>
        </Box>

        <DataGrid
            rows={team}
            columns={columns}
            getRowId={(row) => row.employeeID || row.id} // ✅ fix for missing id
            loading={loading}
            slots={{ toolbar: GridToolbar }}
            columnVisibilityModel={columnVisibilityModel}
            onColumnVisibilityModelChange={(newModel) =>
            setColumnVisibilityModel(newModel)
            }
            sx={{
            fontSize: "0.8rem",
            "& .MuiDataGrid-columnHeaders": {
                backgroundColor: "#f4f6f8",
                fontWeight: "bold",
            },
            "& .MuiDataGrid-virtualScroller": {
                overflowX: "auto",
                "&::-webkit-scrollbar": { display: "none" },
            },
            }}
        />
        </Box>
    );
};

export default Team;
