// Placeholder for when Laravel API is ready
import { apiClient } from "../api/apiClient"; 

export const kenyaBankApi = {
  fetchBankStatement: async (accountId, month) => {
    return apiClient.get(`/bank/statement`, {
      params: { account_id: accountId, month },
    });
  },

  fetchTransactionByRef: async (ref) => {
    return apiClient.get(`/bank/transaction/${ref}`);
  },

  // Upload bank statement CSV/PDF
  uploadStatement: async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    return apiClient.post(`/bank/import-statement`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
};
