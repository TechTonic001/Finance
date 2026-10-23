const nairaFormatter = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  minimumFractionDigits: 2,
});

export function formatCurrency(amount: number): string {
  return nairaFormatter.format(amount);
}
