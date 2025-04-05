import React from "react";
import { CardElement, useStripe, useElements } from "@stripe/react-stripe-js";

const StripePayment = ({ amount, onSuccess, onFailure }) => {
  const stripe = useStripe();
  const elements = useElements();

 // In StripePayment.js handleSubmit
 const handleSubmit = async (event) => {
  event.preventDefault();
  if (!stripe || !elements) return;

  try {
    // 1. Create payment method
    const { error: pmError, paymentMethod } = await stripe.createPaymentMethod({
      type: "card",
      card: elements.getElement(CardElement),
    });
    if (pmError) throw pmError;

    // 2. Create payment intent
    const response = await fetch(`${BACKEND_BASE_URL}/api/user/stripe/create-payment-intent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        paymentMethodId: paymentMethod.id,
        amount: amount,
      }),
    });
    
    const { data: paymentIntent } = await response.json();
    console.log("Payment Intent: ", paymentIntent)
    
    // 3. Handle payment confirmation
    if (paymentIntent.status === "requires_action") {
      const { error: confirmError, paymentIntent: confirmedPI } = 
        await stripe.confirmCardPayment(paymentIntent.client_secret);
      
      if (confirmError) throw confirmError;
      if (confirmedPI.status === "succeeded") {
        onSuccess(confirmedPI.id); // Pass PI ID to parent
      }
    } else if (paymentIntent.status === "succeeded") {
      onSuccess(paymentIntent.paymentIntentId); // Pass PI ID to parent
    }
  } catch (error) {
    onFailure(error);
  }
};
  return (
    <form
      onSubmit={handleSubmit}
      style={{
        width: "100%", // Take full width
        padding: "20px",
        border: "1px solid #e0e0e0",
        borderRadius: "8px",
        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
        backgroundColor: "#ffffff",
      }}
    >
      {/* Stripe Card Element */}
      <CardElement
        style={{
          base: {
            fontSize: "16px",
            color: "#424770",
            "::placeholder": {
              color: "#aab7c4",
            },
          },
        }}
        options={{
          style: {
            base: {
              fontSize: "16px",
              color: "#424770",
              "::placeholder": {
                color: "#aab7c4",
              },
            },
            invalid: {
              color: "#9e2146",
            },
          },
        }}
      />

      {/* Submit Button */}
      <button
        type="submit"
        disabled={!stripe}
        style={{
          marginTop: "20px",
          padding: "12px 24px",
          backgroundColor: "#6772e5",
          color: "#fff",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
          width: "100%",
          fontSize: "16px",
          fontWeight: "600",
          transition: "background-color 0.3s ease",
          ":hover": {
            backgroundColor: "#5469d4",
          },
          ":disabled": {
            backgroundColor: "#aab7c4",
            cursor: "not-allowed",
          },
        }}
      >
        Pay with Stripe
      </button>
    </form>
  );
};

export default StripePayment;