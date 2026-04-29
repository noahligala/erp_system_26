import { useMemo } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { DateTime } from "luxon";

const normalizeDashboardResponse = (res) => {
  if (!res) return { ok: false, message: "Empty response", data: null };

  const data = res.data ?? res;
  const generatedAt = res.metadata?.generated_at || null;
  const failedSections = Array.isArray(res.failed_sections) ? res.failed_sections : [];

  const isPartial = res.status === "partial" || failedSections.length > 0;

  if (res.success === false) {
    return {
      ok: !!data,
      message: res.message || res.error,
      data: data || null,
      warning: data ? "Partial/failed response from server" : null,
      generatedAt,
    };
  }

  return {
    ok: true,
    data,
    warning: isPartial ? `Partial data: ${failedSections.join(", ")}` : null,
    generatedAt,
  };
};

export const useHrmDashboardData = (apiClient, isAuthenticated) => {
  const query = useQuery({
    queryKey: ["hrm-dashboard"],
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
    retry: 2,
    queryFn: async ({ signal }) => {
      const res = await apiClient.get("/dashboard/hrm", { signal });
      const normalized = normalizeDashboardResponse(res.data);

      if (!normalized.ok && !normalized.data) {
        throw new Error(normalized.message);
      }

      return normalized;
    },
  });

  const dashboardData = query.data?.data;

  const lastUpdated = useMemo(() => {
    return query.data?.generatedAt
      ? DateTime.fromISO(query.data.generatedAt)
      : null;
  }, [query.data]);

  return {
    ...query,
    dashboardData,
    warning: query.data?.warning,
    lastUpdated,
  };
};