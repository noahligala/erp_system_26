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

// 1. Import React Query tools
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// 2. Initialize the QueryClient (Outside the component!)
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // Prevents excessive refetching when switching tabs
      retry: 2,
    },
  },
});

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    {/* 3. Wrap everything in the QueryClientProvider */}
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);