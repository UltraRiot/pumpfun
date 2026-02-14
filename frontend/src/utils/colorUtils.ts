// Frontend utility functions for color coding and styling

// Centralized color utility for trust scores
export const getScoreColor = (
  score: number,
  type: "trust" | "risk" = "trust",
): string => {
  if (type === "trust") {
    if (score >= 80) return "text-green-400";
    if (score >= 60) return "text-yellow-400";
    if (score >= 40) return "text-orange-400";
    return "text-red-400";
  }

  // Risk level colors
  if (type === "risk") {
    return "text-red-400";
  }

  return "text-gray-400";
};

// Get risk level colors with border styling
export const getRiskColor = (risk: string): string => {
  switch (risk.toLowerCase()) {
    case "very low":
    case "low":
      return "bg-green-900/20 border-green-600 text-green-300";
    case "medium":
      return "bg-yellow-900/20 border-yellow-600 text-yellow-300";
    case "high":
    case "very high":
    default:
      return "bg-red-900/20 border-red-600 text-red-300";
  }
};

// Format large numbers for display
export const formatNumber = (num: number): string => {
  if (num === 0) return "0";
  if (num < 1000) return num.toFixed(2);
  if (num < 1000000) return `${(num / 1000).toFixed(1)}K`;
  if (num < 1000000000) return `${(num / 1000000).toFixed(1)}M`;
  return `${(num / 1000000000).toFixed(1)}B`;
};

// Format currency with $ symbol
export const formatCurrency = (amount: number): string => {
  if (amount === 0) return "$0";
  return `$${formatNumber(amount)}`;
};

// Format percentage with color coding
export const formatPercentage = (
  percentage: number,
): { text: string; color: string } => {
  const formatted = `${percentage > 0 ? "+" : ""}${percentage.toFixed(2)}%`;
  const color =
    percentage > 0
      ? "text-green-400"
      : percentage < 0
        ? "text-red-400"
        : "text-gray-400";

  return { text: formatted, color };
};

// Get social score color
export const getSocialScoreColor = (score: number): string => {
  if (score > 70) return "text-green-400";
  if (score > 40) return "text-yellow-400";
  return "text-red-400";
};

// Get boolean indicator color
export const getBooleanColor = (value: boolean): string => {
  return value ? "text-green-400" : "text-gray-500";
};
