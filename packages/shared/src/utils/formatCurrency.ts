/**
 * @visionos/shared/utils/formatCurrency.ts
 * Formats monetary amounts for international fan transactions (concessions, merchandise).
 */

export function formatCurrency(amountInCents: number, currency: string = "USD"): string {
  const amount = amountInCents / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
  }).format(amount);
}
