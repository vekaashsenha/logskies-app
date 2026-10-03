type Plan = "starter" | "pro";
type Period = "monthly" | "annual";
const links = {
  starter: {
    monthly: process.env.NEXT_PUBLIC_STARTER_MONTHLY_PAYMENT_URL,
    annual: process.env.NEXT_PUBLIC_STARTER_ANNUAL_PAYMENT_URL,
  },
  pro: {
    monthly: process.env.NEXT_PUBLIC_PRO_MONTHLY_PAYMENT_URL,
    annual: process.env.NEXT_PUBLIC_PRO_ANNUAL_PAYMENT_URL,
  },
};
export function paymentLink(plan: Plan, period: Period): string | null {
  const value = links[plan][period]?.trim();
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    return url.href;
  } catch {
    return null;
  }
}
export function hasPaymentLinks() {
  return (["starter", "pro"] as const).some((plan) =>
    (["monthly", "annual"] as const).some((period) =>
      paymentLink(plan, period),
    ),
  );
}
