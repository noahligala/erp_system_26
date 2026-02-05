import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./api/AuthProvider";
import "@fullcalendar/core/index.cjs";
import "@fullcalendar/daygrid/index.cjs";
import "@fullcalendar/timegrid/index.cjs";
import "@fullcalendar/list/index.cjs";



const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
