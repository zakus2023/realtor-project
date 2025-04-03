import paypal from "@paypal/checkout-server-sdk";

// Configure PayPal SDK environments
const configureEnvironment = () => {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_SECRET;

  if (process.env.NODE_ENV === "production") {
    return new paypal.core.LiveEnvironment(clientId, clientSecret);
  }
  return new paypal.core.SandboxEnvironment(clientId, clientSecret);
};

// Create PayPal client
export const getPayPalClient = () => {
  return new paypal.core.PayPalHttpClient(configureEnvironment());
};

// PayPal SDK configuration validation
export const validatePayPalConfig = () => {
  const requiredVars = [
    "PAYPAL_CLIENT_ID",
    "PAYPAL_SECRET",
    "PAYPAL_WEBHOOK_ID"
  ];

  const missingVars = requiredVars.filter(v => !process.env[v]);
  
  if (missingVars.length > 0) {
    throw new Error(`Missing PayPal configuration: ${missingVars.join(", ")}`);
  }

  return true;
};