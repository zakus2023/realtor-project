import React, { useContext, useState, useEffect } from "react";
import {
  Button,
  DatePicker,
  Modal,
  TimePicker,
  Select,
  Spin,
  Alert,
} from "antd";
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

function BookingModal({
  opened,
  setOpened,
  email,
  listingId,
  amount,
  user,
}) {
  console.log("User: ", user);
  const [date, setDate] = useState(null);
  const [time, setTime] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("pay_on_arrival");
  const [paymentStatus, setPaymentStatus] = useState("pending");
  const [paypalOrderId, setPaypalOrderId] = useState(null);
  const [paymentReference, setPaymentReference] = useState(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const {
    userDetails: { token, bookings },
    setUserDetails,
  } = useContext(UserDetailsContext);

  const { mutate, isLoading } = useMutation({
    mutationFn: ({ paymentMethod, paymentReference }) =>
      bookVisit({
        date,
        time,
        listingId,
        email,
        token,
        userId: user?.id, // Ensure userId is included
        paymentMethod,
        paymentReference,
        amount
      }),
    onSuccess: (data) => handleBookingSuccess(data),
    onError: (error) => {
      toast.error(error.message);
    },
    onSettled: () => {
      setOpened(false);
      setIsProcessingPayment(false);
    },
  });

  useEffect(() => {
    if (opened) {
      setDate(null);
      setTime(null);
      setPaymentMethod("pay_on_arrival");
      setPaymentStatus("pending");
      setPaypalOrderId(null);
      setPaymentReference(null);
    }
  }, [opened]);

  const handleBookingSuccess = (data) => {
    toast.success("You have booked your visit", { position: "bottom-right" });

    setUserDetails((prev) => ({
      ...prev,
      bookings: [
        ...prev.bookings,
        {
          id: data.data.bookingId,
          propertyId: listingId,
          date: data.data.date,
          time: data.data.time,
          visitStatus: "pending",
          bookingStatus: "active",
          paymentStatus: data.data.paymentStatus,
          paymentMethod: paymentMethod,
        },
      ],
    }));
  };

  // In BookingModal.js
  const handlePaymentSuccess = (method, reference) => {
    setIsProcessingPayment(true);
    
    // Immediately use the reference from callback
    mutate({
      paymentMethod: method,
      paymentReference: reference,
      date: dayjs(date).format("DD/MM/YYYY"),
      time: dayjs(time).format("HH:mm"),
      listingId,
      email,
      token,
      userId: user?.id,
      amount
    });
  };

  const handlePaymentFailure = (error) => {
    setIsProcessingPayment(false);
    toast.error(error.message || "Payment failed. Please try again.");
  };

  const handleBookVisit = () => {
    if (!date || !time) {
      toast.error("Please select date and time");
      return;
    }

    if (paymentMethod !== "pay_on_arrival" && !paymentReference) {
      toast.error("Please complete the payment first");
      return;
    }

    mutate({ paymentMethod, paymentReference });
  };

  return (
    <Modal
      open={opened}
      onCancel={() => setOpened(false)}
      title="Book your visit"
      footer={null}
      centered
      className="modal-main"
      width={600}
    >
      <div className="booking-modal">
        <div className="form-group">
          <label>Date</label>
          <DatePicker
            value={date}
            onChange={(date) => setDate(date)}
            disabledDate={(current) =>
              current && current < dayjs().startOf("day")
            }
            style={{ width: "100%" }}
            format="DD/MM/YYYY"
          />
        </div>

        <div className="form-group">
          <label>Time</label>
          <TimePicker
            value={time}
            onChange={(time) => setTime(time)}
            format="HH:mm"
            style={{ width: "100%" }}
            minuteStep={15}
          />
        </div>

        <div className="form-group">
          <label>Payment Method</label>
          <Select
            value={paymentMethod}
            onChange={(value) => setPaymentMethod(value)}
            style={{ width: "100%" }}
            className="select"
            disabled={isProcessingPayment}
          >
            <Select.Option value="pay_on_arrival">Pay on Arrival</Select.Option>
            <Select.Option value="stripe">Stripe</Select.Option>
            <Select.Option value="paypal">PayPal</Select.Option>
            <Select.Option value="paystack">Mobile Money</Select.Option>
          </Select>
        </div>

        <div className="payment-section">
          {paymentMethod === "stripe" && (
            <Elements stripe={stripePromise}>
              <StripePayment
                amount={amount}
                onSuccess={(reference) =>
                  handlePaymentSuccess("stripe", reference)
                } // Pass reference
                onFailure={handlePaymentFailure}
                disabled={isProcessingPayment}
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
                          value: visitingFee.toString(),
                          currency_code: "USD",
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
                onError={(err) => {
                  handlePaymentFailure(err);
                }}
                style={{ layout: "vertical" }}
              />
            </PayPalScriptProvider>
          )}
          {paymentMethod === "paystack" && (
            <PaystackPayment
              amount={visitingFee * 100}
              email={email}
              onSuccess={(reference) =>
                handlePaymentSuccess("paystack", reference)
              }
              onFailure={handlePaymentFailure}
              disabled={isProcessingPayment}
            />
          )}
        </div>

        <Button
          type="primary"
          disabled={
            !date ||
            !time ||
            isLoading ||
            isProcessingPayment ||
            (paymentMethod !== "pay_on_arrival" && !paymentReference)
          }
          loading={isLoading || isProcessingPayment}
          onClick={handleBookVisit}
          style={{ width: "100%", marginTop: "1rem" }}
          size="large"
        >
          {isLoading || isProcessingPayment ? (
            <span>Processing...</span>
          ) : (
            <span>Book Visit</span>
          )}
        </Button>

        {paymentMethod === "pay_on_arrival" && (
          <Alert
            message="You'll pay the visiting fee when you arrive at the property"
            type="info"
            showIcon
            style={{ marginTop: "1rem" }}
          />
        )}
      </div>
    </Modal>
  );
}

export default BookingModal;
