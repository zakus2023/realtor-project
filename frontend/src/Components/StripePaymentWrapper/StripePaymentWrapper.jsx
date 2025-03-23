import React from "react";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import StripePayment from "./StripePayment";

// Load Stripe with the publishable key
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

const StripePaymentWrapper = ({ onSuccess, onFailure }) => (
  <Elements stripe={stripePromise}>
    <StripePayment onSuccess={onSuccess} onFailure={onFailure} />
  </Elements>
);

export default StripePaymentWrapper;