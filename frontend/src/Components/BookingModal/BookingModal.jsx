import React, { useContext, useState } from "react";
import { Button, DatePicker, Modal, TimePicker, Select } from "antd";
import UserDetailsContext from "../../context/UserDetailsContext";
import { toast } from "react-toastify";
import dayjs from "dayjs";
import { useMutation } from "react-query";
import { bookVisit } from "../../utils/api";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import StripePayment from "../StripePayment/StripePayment";
import PaystackPayment from "../MTNPayment/PaystackPayment";
import "./BookingModal.css";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

const paypalOptions = {
  "client-id": import.meta.env.VITE_PAYPAL_CLIENT_ID,
  currency: "USD",
};

function BookingModal({ opened, setOpened, email, listingId }) {
  const [date, setDate] = useState(null);
  const [time, setTime] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("pay_on_arrival");
  const [paymentStatus, setPaymentStatus] = useState("pending");
  const [paypalOrderId, setPaypalOrderId] = useState(null);
  const [paymentReference, setPaymentReference] = useState(null); // For Paystack

  const {
    userDetails: { token },
    setUserDetails,
  } = useContext(UserDetailsContext);

  const { mutate, isLoading } = useMutation({
    mutationFn: ({ paymentMethod, paypalOrderId, paymentReference }) =>
      bookVisit({
        date,
        time,
        listingId,
        email,
        token,
        paymentMethod,
        paymentStatus: paymentMethod === "pay_on_arrival" ? "pending" : "paid",
        paypalOrderId,
        paymentReference, // Include payment reference for Paystack
      }),
    onSuccess: () => handleBookingSuccess(),
    onError: ({ response }) => toast.error(response.data.message),
    onSettled: () => setOpened(false),
  });

  const handleBookingSuccess = () => {
    toast.success("You have booked your visit", {
      position: "bottom-right",
    });

    setUserDetails((prev) => ({
      ...prev,
      bookings: [
        ...prev.bookings,
        {
          id: listingId,
          date: dayjs(date).format("DD/MM/YYYY"),
          time: dayjs(time).format("HH:mm"),
          visitStatus: "pending",
          bookingStatus: "active",
          paymentStatus,
          paymentMethod,
        },
      ],
    }));
  };

  const handlePaymentSuccess = async (
    method,
    orderId = null,
    reference = null
  ) => {
    console.log(
      "🚀 Payment Successful! Method:",
      method,
      "Reference:",
      reference
    );

    setPaymentStatus("paid");
    setPaymentMethod(method);

    if (method === "paypal") {
      setPaypalOrderId(orderId);
    } else if (method === "paystack") {
      console.log("📌 Storing Paystack Reference:", reference);

      setPaymentReference(reference);

      // Delay to ensure state updates before mutation
      setTimeout(() => {
        console.log("📤 Sending Paystack Reference to Backend:", reference);
        mutate({
          paymentMethod: "paystack",
          paypalOrderId: null,
          paymentReference: reference,
        });
      }, 500);
    } else {
      mutate({
        paymentMethod: method,
        paypalOrderId: orderId,
        paymentReference: null,
      });
    }
  };

  const handlePaymentFailure = () => {
    toast.error("Payment failed. Please try again.");
  };

  return (
    <Modal
      open={opened}
      onCancel={() => setOpened(false)}
      title="Book your visit"
      footer={null}
      centered
      className="modal-main"
    >
      <div className="booking-modal">
        <DatePicker
          value={date}
          onChange={(date) => setDate(date)}
          disabledDate={(current) =>
            current && current < dayjs().startOf("day")
          }
          style={{ width: "100%" }}
        />
        <TimePicker
          value={time}
          onChange={(time) => setTime(time)}
          format="HH:mm"
          style={{ width: "100%" }}
        />
        <div className="payment-method">
          <h4>Select Payment Method</h4>
          <Select
            value={paymentMethod}
            onChange={(value) => setPaymentMethod(value)}
            style={{ width: "100%" }}
            className="select"
          >
            <Select.Option value="pay_on_arrival">Pay on Arrival</Select.Option>
            <Select.Option value="stripe">Stripe</Select.Option>
            <Select.Option value="paypal">PayPal</Select.Option>
            <Select.Option value="paystack">Mobile Money</Select.Option>
          </Select>
        </div>
        <div className="payment-buttons">
          {paymentMethod === "stripe" && (
            <Elements stripe={stripePromise}>
              <StripePayment
                onSuccess={() => handlePaymentSuccess("stripe")}
                onFailure={handlePaymentFailure}
              />
            </Elements>
          )}
          {paymentMethod === "paypal" && (
            <PayPalScriptProvider options={paypalOptions}>
              <PayPalButtons
                createOrder={(data, actions) => {
                  return actions.order.create({
                    purchase_units: [
                      {
                        amount: {
                          value: "10.00",
                        },
                      },
                    ],
                  });
                }}
                onApprove={(data, actions) => {
                  return actions.order.capture().then((details) => {
                    handlePaymentSuccess("paypal", details.id);
                  });
                }}
                onError={handlePaymentFailure}
              />
            </PayPalScriptProvider>
          )}
          
          {paymentMethod === "paystack" && (
            <PaystackPayment
              amount={10}
              email={email}
              onSuccess={(reference) =>
                handlePaymentSuccess("paystack", null, reference)
              }
              onFailure={handlePaymentFailure}
            />
          )}
        </div>
        <Button
          type="primary"
          disabled={
            !date ||
            !time ||
            isLoading ||
            (paymentMethod !== "pay_on_arrival" && paymentStatus !== "paid")
          }
          loading={isLoading}
          onClick={() => {
            if (paymentMethod === "paystack" && !paymentReference) {
              toast.error("Please complete the Paystack payment first.");
              return;
            }
            mutate({ paymentMethod, paypalOrderId, paymentReference });
          }}
          style={{ width: "100%", marginTop: "1rem" }}
        >
          Book visit
        </Button>
      </div>
    </Modal>
  );
}

export default BookingModal;
