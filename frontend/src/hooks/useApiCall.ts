import { useState, useCallback } from "react";

interface ApiCallResult<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

// Custom hook for API calls with loading and error handling
export const useApiCall = <T>() => {
  const [state, setState] = useState<ApiCallResult<T>>({
    data: null,
    error: null,
    loading: false,
  });

  const execute = useCallback(async (apiCall: () => Promise<T>) => {
    setState({ data: null, error: null, loading: true });

    try {
      const result = await apiCall();
      setState({ data: result, error: null, loading: false });
      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred";
      setState({ data: null, error: errorMessage, loading: false });
      throw error;
    }
  }, []);

  return { ...state, execute };
};

// Custom hook specifically for token analysis
export const useTokenAnalysis = () => {
  const { data, error, loading, execute } =
    useApiCall<Record<string, unknown>>();

  const analyzeToken = useCallback(
    async (tokenAddress: string) => {
      return execute(async () => {
        if (!tokenAddress.trim()) {
          throw new Error("Please enter a valid token address");
        }

        const apiUrl =
          process.env.NEXT_PUBLIC_API_URL ||
          (process.env.NODE_ENV !== "production"
            ? "http://127.0.0.1:5001"
            : "");

        if (!apiUrl) {
          throw new Error(
            "API URL not configured. Set NEXT_PUBLIC_API_URL in frontend/.env.local",
          );
        }

        const response = await fetch(
          `${apiUrl}/api/trust-score/${tokenAddress}`,
        );

        if (!response.ok) {
          throw new Error(
            `API request failed: ${response.status} ${response.statusText}`,
          );
        }

        const result = await response.json();

        if (result.error) {
          throw new Error(result.error);
        }

        return result;
      });
    },
    [execute],
  );

  return {
    data,
    error,
    loading,
    analyzeToken,
  };
};
