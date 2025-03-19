import React from "react";
import { CardElement, useStripe, useElements } from "@stripe/react-stripe-js";

const StripePayment = ({ onSuccess, onFailure }) => {
  const stripe = useStripe();
  const elements = useElements();

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    const cardElement = elements.getElement(CardElement);

    try {
      // Create a payment method using Stripe
      const { error, paymentMethod } = await stripe.createPaymentMethod({
        type: "card",
        card: cardElement,
      });

      if (error) {
        console.error("Stripe payment error:", error);
        onFailure(error);
        return;
      }

      // Call your backend to confirm the payment
      const response = await fetch("http://localhost:5000/api/user/stripe/create-payment-intent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ paymentMethodId: paymentMethod.id }),
      });

      const paymentResult = await response.json();

      if (paymentResult.success) {
        onSuccess(paymentResult); // Notify parent component of success
      } else {
        onFailure(paymentResult); // Notify parent component of failure
      }
    } catch (error) {
      console.error("Payment error:", error);
      onFailure(error); // Notify parent component of failure
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