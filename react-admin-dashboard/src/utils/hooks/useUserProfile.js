import { useState, useCallback, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useAuth } from '../../api/AuthProvider';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

export const useUserProfile = () => {
  const auth = useAuth() || {};
  const currentUser = auth.user || {};
  const token = auth.token || localStorage.getItem('token');

  // State Management
  const [employeeData, setEmployeeData] = useState(currentUser);
  const [leaveBalances, setLeaveBalances] = useState([]);
  const [leaveHistory, setLeaveHistory] = useState([]);
  const [payslips, setPayslips] = useState([]);
  const [sessionHistory, setSessionHistory] = useState([]);
  const [backupCodes, setBackupCodes] = useState([]); // Added to prevent UI crashes
  
  // Loading & UI States
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState({ open: false, message: '', type: 'success' });

  const api = useMemo(() => axios.create({
    baseURL: API_BASE_URL,
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
  }), [token]);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ open: true, message, type });
  }, []);

  // Fetch all secondary data concurrently
  const fetchDynamicData = useCallback(async () => {
    if (!currentUser?.id) return;
    setIsLoading(true);
    try {
      const [empRes, balanceRes, historyRes, payslipsRes] = await Promise.allSettled([
        api.get(`/employees/${currentUser.id}`), 
        api.get(`/employees/${currentUser.id}/leave-balance`),
        api.get(`/employees/${currentUser.id}/leave-history`),
        api.get(`/payslips`)
      ]);

      if (empRes.status === 'fulfilled') setEmployeeData(prev => ({...prev, ...empRes.value.data.data}));
      if (balanceRes.status === 'fulfilled') setLeaveBalances(balanceRes.value.data.data || []);
      if (historyRes.status === 'fulfilled') setLeaveHistory(historyRes.value.data.data || []);
      if (payslipsRes.status === 'fulfilled') setPayslips(payslipsRes.value.data.data || []);

      // Mock Sessions
      setSessionHistory([
        { id: 1, device: "Chrome on Windows", location: "Kitale, Kenya", ip: "192.168.1.1", date: new Date().toLocaleString(), current: true },
      ]);
    } catch (e) {
      showToast("Error syncing some profile data", "warning");
    } finally {
      setIsLoading(false);
    }
  }, [currentUser.id, api, showToast]);

  useEffect(() => {
    fetchDynamicData();
  }, [fetchDynamicData]);


  // ==========================================
  // ORCHESTRATOR ACTIONS (Connected to API)
  // ==========================================

  const handleProfileUpdate = async (values, onSuccess) => {
    setIsSaving(true);
    try {
      const nameParts = values.name.trim().split(' ');
      const payload = {
        first_name: nameParts[0],
        last_name: nameParts.length > 1 ? nameParts.slice(1).join(' ') : ' ',
        phone_number: values.phone,
        location: values.location,
        timezone: values.timezone,
        language: values.language
      };

      const res = await api.put(`/employees/${employeeData.id}`, payload);
      setEmployeeData(res.data?.data || res.data); // Safe fallback
      showToast("Profile updated successfully!");
      if (onSuccess) onSuccess();
    } catch (error) {
      showToast(error.response?.data?.message || "Failed to update profile", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLeaveSubmit = async (leaveForm, onSuccess) => {
    setIsSaving(true);
    try {
      await api.post('/leave-requests', leaveForm);
      showToast("Leave request submitted for approval.");
      const historyRes = await api.get(`/employees/${employeeData.id}/leave-history`);
      setLeaveHistory(historyRes.data?.data || []);
      if (onSuccess) onSuccess();
    } catch (error) {
      showToast(error.response?.data?.message || "Failed to submit request", "error");
    } finally {
      setIsSaving(false);
    }
  };

  // The following functions are mapped to UI but stubbed out to prevent crashes.
  // You can hook them up to your real API endpoints later.

  const handlePasswordUpdate = async (values, { resetForm }) => {
    setIsSaving(true);
    try {
      // TODO: Connect to real API: await api.post('/change-password', values);
      await new Promise(resolve => setTimeout(resolve, 1000)); 
      showToast("Password updated successfully!");
      resetForm();
    } catch (error) {
      showToast("Failed to update password", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRevokeSession = async (sessionId) => {
    try {
      // TODO: Connect to real API: await api.delete(`/sessions/${sessionId}`);
      setSessionHistory(sessions => sessions.filter(s => s.id !== sessionId));
      showToast("Session revoked successfully");
    } catch (error) {
      showToast("Failed to revoke session", "error");
    }
  };

  const handleDeleteAccount = async () => {
    setIsSaving(true);
    try {
      // TODO: Connect to real API
      await new Promise(resolve => setTimeout(resolve, 1500));
      showToast("Account deletion requested.");
    } catch (error) {
      showToast("Failed to delete account", "error");
    } finally {
      setIsSaving(false);
    }
  };

  return {
    // Data State
    employeeData,
    payslips,
    leaveBalances,
    leaveHistory,
    sessionHistory,
    backupCodes,
    
    // UI State
    isLoading,
    isSaving,
    toast,
    
    // Setters
    setToast,
    setBackupCodes,

    // Actions expected by the UI Tabs
    handleProfileUpdate,
    handlePasswordUpdate,
    handleLeaveSubmit,
    handleRevokeSession,
    handleDeleteAccount,
    
    // Legacy mapping just in case you used these names elsewhere
    updateProfile: handleProfileUpdate,
    submitLeaveRequest: handleLeaveSubmit,
    refresh: fetchDynamicData
  };
};