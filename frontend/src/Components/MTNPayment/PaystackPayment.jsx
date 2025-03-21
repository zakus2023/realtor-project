import React from "react";
import { usePaystackPayment } from "react-paystack";
import { Button } from "antd";

const PaystackPayment = ({ amount, email, onSuccess, onFailure }) => {
  const publicKey = "pk_test_845bcc7a9b67e8f968f6da1e0447fe6ca9d468c2"; // Replace with your Paystack public key

  const config = {
    reference: new Date().getTime().toString(), // Generate a unique reference
    email,
    amount: amount * 100, // Convert to kobo (Paystack uses kobo)
    publicKey,
    currency: "GHS", // Change based on your currency
  };
  

  const initializePayment = usePaystackPayment(config);

  const onSuccessCallback = (response) => {
    console.log("Paystack response:", response);
    if (response.reference) {
      console.log("Paystack reference:", response.reference); // Log the reference
      onSuccess(response.reference); // Pass the reference to the parent component
    } else {
      console.error("No reference found in Paystack response");
      onFailure("No reference found in Paystack response");
    }
  };

  const onClose = () => {
    console.log("Payment closed");
    onFailure("Payment was closed by the user");
  };

  return (
    <Button
      type="primary"
      onClick={() => {
        initializePayment(onSuccessCallback, onClose);
      }}
      style={{ width: "100%" }}
    >
      Pay with Paystack
    </Button>
  );
};

export default PaystackPayment;