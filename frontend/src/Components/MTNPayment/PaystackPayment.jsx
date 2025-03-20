import React from "react";
import { usePaystackPayment } from "react-paystack";
import { Button } from "antd";

const PaystackPayment = ({ amount, email, onSuccess, onFailure }) => {
  const publicKey = "pk_test_845bcc7a9b67e8f968f6da1e0447fe6ca9d468c2"; // Replace with your actual Paystack public key

  const config = {
    reference: new Date().getTime().toString(),
    email,
    amount: amount * 100, // Convert to kobo (Paystack uses kobo)
    publicKey,
    currency: "GHS", // Change based on your currency
  };

  const initializePayment = usePaystackPayment(config);

  return (
    <Button
      type="primary"
      onClick={() => {
        initializePayment(onSuccess, onFailure);
      }}
      style={{ width: "100%" }}
    >
      Pay with Paystack
    </Button>
  );
};

export default PaystackPayment;
