export const formatCurrency = (amount) => {
  const value = Number(amount || 0);

  if (value <= 0) return "Free";

  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(value);
};

export const getPlanPrice = (plan) =>
  plan?.price ??
  plan?.amount ??
  plan?.monthly_price ??
  plan?.subscription_fee ??
  0;

export const getPlanCycle = (plan) =>
  plan?.billing_cycle || plan?.interval || plan?.duration || "monthly";

export const getPlanName = (plan) => plan?.name || plan?.title || "Plan";

export const getPlanDescription = (plan) =>
  plan?.description ||
  "Scalable ERP subscription plan for business operations.";

export const getPlanFeatures = (plan) => {
  if (Array.isArray(plan?.features)) return plan.features;

  if (typeof plan?.features === "string") {
    try {
      const parsed = JSON.parse(plan.features);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return plan.features
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }

  return [
    "ERP dashboard",
    "User management",
    "Business modules",
    "Secure company data",
  ];
};