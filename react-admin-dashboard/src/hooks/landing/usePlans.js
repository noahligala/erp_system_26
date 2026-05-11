import { useEffect, useState } from "react";
import axios from "axios";
import { fallbackPlans } from "../../utils/landing/landingData";

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "http://localhost:8000/api";

const publicApi = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

export const usePlans = () => {
  const [plans, setPlans] = useState([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [plansError, setPlansError] = useState("");
  const [plansSource, setPlansSource] = useState("api");

  useEffect(() => {
    let mounted = true;

    const loadPlans = async () => {
      try {
        setPlansLoading(true);
        setPlansError("");

        const response = await publicApi.get("/plans");

        const payload = Array.isArray(response.data)
          ? response.data
          : response.data?.data || response.data?.plans || [];

        const normalizedPlans = payload.length ? payload : fallbackPlans;

        if (!mounted) return;

        setPlans(normalizedPlans);
        setPlansSource(payload.length ? "api" : "fallback");
      } catch {
        if (!mounted) return;

        setPlans(fallbackPlans);
        setPlansSource("fallback");
        setPlansError(
          "Plans could not be loaded from the API. Showing default demo plans."
        );
      } finally {
        if (mounted) setPlansLoading(false);
      }
    };

    loadPlans();

    return () => {
      mounted = false;
    };
  }, []);

  return {
    plans,
    plansLoading,
    plansError,
    plansSource,
    apiAvailable: plansSource === "api",
    publicApi,
  };
};