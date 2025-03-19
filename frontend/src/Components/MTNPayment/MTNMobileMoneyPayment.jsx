import React, { useState } from "react";

const MTNMobileMoneyPayment = ({ onSuccess, onFailure }) => {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handlePayment = async () => {
    setIsLoading(true);
    try {
      // Call your backend to initiate MTN Mobile Money payment
      const response = await fetch("/api/mtn-mobile-money/initiate-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phoneNumber }),
      });

      const paymentResult = await response.json();

      if (paymentResult.success) {
        onSuccess();
      } else {
        onFailure();
      }
    } catch (error) {
      console.error("Payment error:", error);
      onFailure();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "1rem" }}>
      <input
        type="text"
        placeholder="Enter your MTN Mobile Money number"
        value={phoneNumber}
        onChange={(e) => setPhoneNumber(e.target.value)}
        style={{
          padding: "0.5rem",
          borderRadius: "4px",
          border: "1px solid #d9d9d9",
          fontSize: "1rem",
          outline: "none",
          width: "100%",
          boxSizing: "border-box",
        }}
      />
      <button
        onClick={handlePayment}
        disabled={!phoneNumber || isLoading}
        style={{
          padding: "0.5rem",
          borderRadius: "4px",
          border: "none",
          backgroundColor: isLoading ? "#ccc" : "#1890ff",
          color: "#fff",
          fontSize: "1rem",
          fontWeight: "500",
          cursor: isLoading ? "not-allowed" : "pointer",
          width: "100%",
          boxSizing: "border-box",
          transition: "background-color 0.3s ease",
        }}
      >
        {isLoading ? "Processing..." : "Pay with MTN Mobile Money"}
      </button>
    </div>
  );
};

export default MTNMobileMoneyPayment;