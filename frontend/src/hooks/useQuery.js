import { useState, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

export const useQuery = (apiUrl) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);

  const executeQuery = useCallback(async (table, query) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post(`${apiUrl}/query`, {
        table,
        query
      });

      setResults(response.data);
      if (response.data.success) {
        toast.success(
          `Query executed successfully! Retrieved ${response.data.row_count} rows.`
        );
      }
      return response.data;
    } catch (err) {
      const errorMessage = err.response?.data?.detail || 'Failed to execute query';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  return {
    loading,
    error,
    results,
    executeQuery
  };
}; 