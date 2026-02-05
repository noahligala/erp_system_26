export function formatCurrency(
  amount,
  { currency = "KES", minimumFractionDigits = 2 } = {}
) {
  if (amount === null || amount === undefined || amount === "") return "0.00";

  const number = Number(amount);
  if (isNaN(number)) return "0.00";

  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency,
    minimumFractionDigits,
  }).format(number);
}
