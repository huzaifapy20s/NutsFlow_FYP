export function formatCurrency(value) {
  const numericValue = Number(value || 0);
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 2,
  }).format(numericValue);
}

export function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString();
}