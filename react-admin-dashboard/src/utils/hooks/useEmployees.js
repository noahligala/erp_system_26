import { useState, useCallback, useEffect } from 'react';
import apiClient from '../api/apiClient';

export const useEmployees = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Server-side pagination state
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 25 });
  const [totalRowCount, setTotalRowCount] = useState(0);

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      // Enterprise: Send pagination config to the backend
      const response = await apiClient.get('/employees', {
        params: {
          page: paginationModel.page + 1,
          limit: paginationModel.pageSize,
        }
      });
      setData(response.data.items);
      setTotalRowCount(response.data.total);
    } catch (err) {
      setError(err.message || "Failed to fetch employees");
    } finally {
      setLoading(false);
    }
  }, [paginationModel.page, paginationModel.pageSize]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const deleteEmployee = useCallback(async (id) => {
    try {
      await apiClient.delete(`/employees/${id}`);
      fetchEmployees(); // Refresh data after delete
    } catch (err) {
      throw new Error("Failed to delete employee");
    }
  }, [fetchEmployees]);

  return {
    data,
    loading,
    error,
    paginationModel,
    setPaginationModel,
    totalRowCount,
    deleteEmployee,
    refresh: fetchEmployees
  };
};