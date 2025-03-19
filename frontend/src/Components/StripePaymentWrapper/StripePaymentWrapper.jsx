import React from "react";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import StripePayment from "./StripePayment";

// Load Stripe with the publishable key
const stripePromise = loadStripe("pk_test_51N5quMDHDtaIvDO2nmKU2EZnqpoZvT3QUWUFzD79fu6Ht9iPxR2zrv5NJvxMZ98s1lTeRkmuXvTLQz82PEpcHnQB00lIceFH6V");

const StripePaymentWrapper = ({ onSuccess, onFailure }) => (
  <Elements stripe={stripePromise}>
    <StripePayment onSuccess={onSuccess} onFailure={onFailure} />
  </Elements>
);

export default StripePaymentWrapper;