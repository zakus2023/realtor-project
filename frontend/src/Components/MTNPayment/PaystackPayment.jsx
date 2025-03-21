import React from "react";
import { usePaystackPayment } from "react-paystack";
import { Button } from "antd";

const PaystackPayment = ({ amount, email, onSuccess, onFailure }) => {
  const publicKey = "pk_test_845bcc7a9b67e8f968f6da1e0447fe6ca9d468c2"; // Replace with your Paystack public key

  const config = {
    reference: `${new Date().getTime()}`, // Unique reference
    email,
    amount: amount * 100, // Convert to kobo
    publicKey,
    currency: "GHS",
  };

  const initializePayment = usePaystackPayment(config);

  const onSuccessCallback = (response) => {
    console.log("🔥 Payment Success Callback Triggered!");

    if (!response) {
      console.error("❌ No response object received from Paystack.");
      return;
    }

    console.log("✅ Paystack Response:", response);

    if (response?.reference) {
      console.log("✅ Paystack Reference:", response.reference);
      onSuccess(response.reference); // Send reference to parent
    } else {
      console.error("❌ No reference in Paystack response");
      onFailure("No reference in Paystack response");
    }
  };

  const onCloseCallback = () => {
    console.warn("🚨 Paystack Payment window was closed!");
  };

  const onClose = () => {
    console.warn("⚠️ Payment window closed by user");
    onFailure("Payment was closed by the user");
  };

  return (
    <Button
      type="primary"
      onClick={() => {
        console.log("⚡ Initializing Paystack Payment...");

        try {
          console.log("🟢 Calling initializePayment()...");
          initializePayment(
            (response) => {
              console.log("🔥 Payment Success Callback Triggered!", response);

              if (response?.reference) {
                console.log("✅ Paystack Reference:", response.reference);
                onSuccess(response.reference);
              } else {
                console.error("❌ No reference in Paystack response");
                onFailure("No reference in Paystack response");
              }
            },
            () => {
              console.warn("🚨 Paystack Payment window was closed!");
            }
          );

          console.log("🟢 initializePayment() was called successfully.");
        } catch (error) {
          console.error("❌ Paystack Payment Initialization Failed:", error);
        }
      }}
      style={{ width: "100%" }}
    >
      Pay with Paystack
    </Button>
  );
};

export default PaystackPayment;
