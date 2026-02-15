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

  const resolveApiBaseUrls = () => {
    const urls: string[] = [];
    const configured = (process.env.NEXT_PUBLIC_API_URL || "").trim();

    if (configured) {
      urls.push(configured.replace(/\/$/, ""));
    }

    if (typeof window !== "undefined") {
      const host = window.location.hostname;
      const isLocalHost = host === "localhost" || host === "127.0.0.1";

      if (isLocalHost) {
        urls.push("http://127.0.0.1:5001");
      } else {
        // Path-based routing on DigitalOcean App Platform
        urls.push("/pumpfun-backend");
      }
    }

    // Remove duplicates while preserving order
    return Array.from(new Set(urls));
  };

  const analyzeToken = useCallback(
    async (tokenAddress: string) => {
      return execute(async () => {
        if (!tokenAddress.trim()) {
          throw new Error("Please enter a valid token address");
        }

        const apiBaseUrls = resolveApiBaseUrls();
        if (apiBaseUrls.length === 0) {
          throw new Error("API URL not configured. Set NEXT_PUBLIC_API_URL.");
        }

        let lastNetworkError: string | null = null;

        for (const apiBaseUrl of apiBaseUrls) {
          const endpoint = `${apiBaseUrl}/api/trust-score/${tokenAddress}`;

          try {
            const response = await fetch(endpoint);

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
          } catch (err) {
            const message =
              err instanceof Error ? err.message : "Unknown network error";

            // If this was a pure network failure, try next base URL
            if (/Failed to fetch|NetworkError|Load failed/i.test(message)) {
              lastNetworkError = `${message} (${endpoint})`;
              continue;
            }

            // Non-network API errors should surface immediately
            throw err;
          }
        }

        if (lastNetworkError) {
          throw new Error(
            `Unable to reach backend API. ${lastNetworkError}. Check NEXT_PUBLIC_API_URL and routing (/pumpfun-backend).`,
          );
        }

        throw new Error("Unable to reach backend API");
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
