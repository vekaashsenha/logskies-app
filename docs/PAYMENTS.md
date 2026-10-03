# Payment links

The pricing page supports a separate HTTPS checkout URL for Starter/Pro and monthly/annual billing. Set the four `NEXT_PUBLIC_*_PAYMENT_URL` variables in the web environment, matching the provider's plan amount and billing period. Missing/invalid URLs retain the launch-contact action. Restart/rebuild after setting URLs. These links are public checkout destinations, not secret API credentials.

Proposed amounts displayed currently: Starter monthly ₹999; Pro monthly ₹1,999; Starter annual ₹9,590.40; Pro annual ₹19,190.40 (20% annual discount). Confirm taxes and final pricing before issuing live links. Do not reuse a monthly payment link for the annual option.

Razorpay Payment Links collect a payment. They do not by themselves implement recurring subscriptions, UPI AutoPay, or automatic LogSkies account activation. Payment verification and account activation require an authenticated server integration with verified webhooks; a browser redirect is not proof of payment. Never place Razorpay API secrets in public environment variables.

For initial setup, sign into the Razorpay Dashboard, complete merchant activation, then create the intended Payment Links. Store the published links in the corresponding web environment variables. Financial verification, bank/KYC details and terms acceptance are completed by the account owner.

For public plan buttons, consider a hosted Payment Page for each plan/period, or server-created Payment Links associated with individual purchases. Confirm the checkout destination is suitable for multiple customers before publishing a shared plan URL. Official references: [Payment Links](https://razorpay.com/docs/payments/payment-links/) and [Payment Pages](https://razorpay.com/docs/payments/payment-pages/).
