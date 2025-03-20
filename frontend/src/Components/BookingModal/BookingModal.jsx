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



const stripePromise = loadStripe("pk_test_51N5quMDHDtaIvDO2nmKU2EZnqpoZvT3QUWUFzD79fu6Ht9iPxR2zrv5NJvxMZ98s1lTeRkmuXvTLQz82PEpcHnQB00lIceFH6V");

const paypalOptions = {
  "client-id": "ASVLCVJ4a62t_sauBvKf93ifWTkn-4uooOK6Sdnx57USnTnkMADS3mja6sa1zdd8GfuoLUvPQR0aiowv",
  currency: "USD",
};

function BookingModal({ opened, setOpened, email, listingId }) {
  const [date, setDate] = useState(null);
  const [time, setTime] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("pay_on_arrival");
  const [paymentStatus, setPaymentStatus] = useState("pending");
  const [paypalOrderId, setPaypalOrderId] = useState(null);

  const {
    userDetails: { token },
    setUserDetails,
  } = useContext(UserDetailsContext);

  const { mutate, isLoading } = useMutation({
    mutationFn: ({ paymentMethod, paypalOrderId }) =>
      bookVisit({
        date,
        time,
        listingId,
        email,
        token,
        paymentMethod,
        paymentStatus: paymentMethod === "pay_on_arrival" ? "pending" : "paid",
        paypalOrderId,
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

  const handlePaymentSuccess = async (method, orderId = null) => {
    setPaymentStatus("paid");
    setPaymentMethod(method);
    if (method === "paypal") {
      setPaypalOrderId(orderId);
    }
    await mutate({ paymentMethod: method, paypalOrderId: orderId });
  };

  const handlePaymentFailure = () => {
    toast.error("Payment failed. Please try again.");
  };

  return (
    <Modal open={opened} onCancel={() => setOpened(false)} title="Book your visit" footer={null} centered>
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <DatePicker
          value={date}
          onChange={(date) => setDate(date)}
          disabledDate={(current) => current && current < dayjs().startOf("day")}
          style={{ width: "100%" }}
        />
        <TimePicker
          value={time}
          onChange={(time) => setTime(time)}
          format="HH:mm"
          style={{ width: "100%" }}
        />
        <div>
          <h4>Select Payment Method</h4>
          <Select
            value={paymentMethod}
            onChange={(value) => setPaymentMethod(value)}
            style={{ width: "100%" }}
          >
            <Select.Option value="pay_on_arrival">Pay on Arrival</Select.Option>
            <Select.Option value="stripe">Stripe</Select.Option>
            <Select.Option value="paypal">PayPal</Select.Option>
            <Select.Option value="mtn_mobile_money">MTN Mobile Money</Select.Option>
            <Select.Option value="paystack">Paystack</Select.Option>
          </Select>
        </div>
        {paymentMethod === "stripe" && (
          <Elements stripe={stripePromise}>
            <StripePayment onSuccess={() => handlePaymentSuccess("stripe")} onFailure={handlePaymentFailure} />
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
        {paymentMethod === "mtn_mobile_money" && (
          <MTNMobileMoneyPayment onSuccess={() => handlePaymentSuccess("mtn_mobile_money")} onFailure={handlePaymentFailure} />
        )}
        {paymentMethod === "paystack" && (
          <PaystackPayment amount={10} email={email} onSuccess={() => handlePaymentSuccess("paystack")} onFailure={handlePaymentFailure} />
        )}
        <Button
          type="primary"
          disabled={!date || !time || isLoading || (paymentMethod !== "pay_on_arrival" && paymentStatus !== "paid")}
          loading={isLoading}
          onClick={() => mutate({ paymentMethod, paypalOrderId })}
          style={{ width: "100%", marginTop: "1rem" }}
        >
          Book visit
        </Button>
      </div>
    </Modal>
  );
}

export default BookingModal;
