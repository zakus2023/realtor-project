import React, { useContext, useState } from "react";
import { Table, Select, Spin, Modal, Form, Input, Button, message } from "antd";
import { useMutation, useQuery } from "react-query";
import { fetchAllBookings, updateVisitStatusFromAdmin } from "../../utils/api";
import UserDetailsContext from "../../context/UserDetailsContext";
import { useNavigate } from "react-router-dom";
import "./AllBooking.css";

const { Option } = Select;

function AllBookings() {
  const { userDetails } = useContext(UserDetailsContext);
  const token = userDetails.token;
  const navigate = useNavigate();

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);

  const { data, isError, isLoading, refetch } = useQuery(
    ["allBookings"],
    () => fetchAllBookings(token),
    { refetchOnWindowFocus: false }
  );

  // Mutation to update visit status
  const { mutate: updateVisitStatus } = useMutation(
    ({ userEmail, bookingId, visitStatus }) =>
      updateVisitStatusFromAdmin(userEmail, bookingId, visitStatus, token),
    {
      onSuccess: () => {
        message.success("Visit status updated successfully");
        refetch();
      },
      onError: () => {
        message.error("Failed to update visit status");
      },
    }
  );

  const handleVisitStatusChange = (value) => {
    const updatedBooking = {
      ...selectedBooking,
      visitStatus: value,
    };
    setSelectedBooking(updatedBooking);

    updateVisitStatus({
      userEmail: selectedBooking.user?.email,
      bookingId: selectedBooking.id,
      visitStatus: value,
    });
  };

  const handlePaymentStatusChange = (value) => {
    const updatedBooking = {
      ...selectedBooking,
      payment: {
        ...selectedBooking.payment,
        status: value,
      },
    };
    setSelectedBooking(updatedBooking);
    // Note: Add a mutation for payment status if your API supports it
  };

  const sortedData = data
    ?.map((booking) => ({ ...booking, key: booking.id }))
    .sort((a, b) => (a.visitStatus === "pending" ? -1 : 1));

  const handleViewBooking = (booking) => {
    setSelectedBooking(booking);
    setIsModalVisible(true);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
  };

  const getButtonStyle = (status) => {
    switch (status) {
      case "pending":
        return { backgroundColor: "green", color: "white" };
      case "completed":
        return { backgroundColor: "blue", color: "white" };
      case "cancelled":
        return { backgroundColor: "red", color: "white" };
      case "expired":
        return { backgroundColor: "orange", color: "white" };
      default:
        return {};
    }
  };

  const columns = [
    // Columns remain unchanged as per original code
    // ... (same as original)
  ];

  // Error and Loading states remain unchanged
  // ... (same as original)

  return (
    <div style={{ padding: "20px", backgroundColor: "#f0f2f5", minHeight: "100vh" }}>
      <h1 style={{ textAlign: "center", color: "#333", marginBottom: "20px" }}>All Bookings</h1>
      <div style={{ maxWidth: "1200px", margin: "0 auto", backgroundColor: "white", padding: "20px", borderRadius: "8px", boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)" }}>
        <Table
          dataSource={sortedData}
          columns={columns}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          style={{ width: "100%" }}
        />

        {/* Fixed Legend */}
        <div style={{ marginTop: "20px", display: "flex", gap: "20px", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ width: 16, height: 16, backgroundColor: "green", borderRadius: 4 }} />
            <span>Pending (Visit)</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ width: 16, height: 16, backgroundColor: "blue", borderRadius: 4 }} />
            <span>Completed</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ width: 16, height: 16, backgroundColor: "red", borderRadius: 4 }} />
            <span>Cancelled</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ width: 16, height: 16, backgroundColor: "orange", borderRadius: 4 }} />
            <span>Expired</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ width: 16, height: 16, backgroundColor: "gray", borderRadius: 4 }} />
            <span>Pending (Payment)</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ width: 16, height: 16, backgroundColor: "purple", borderRadius: 4 }} />
            <span>Paid</span>
          </div>
        </div>
      </div>

      <Modal
        title="Booking Details"
        visible={isModalVisible}
        onCancel={handleCancel}
        footer={null}
        centered
        width="90%"
        style={{ maxWidth: "600px" }}
        className="all-bookings-modal"
      >
        {selectedBooking && (
          <Form layout="vertical">
            {/* Other form items remain unchanged */}
            <Form.Item label="Payment Status">
              <Select
                value={selectedBooking.payment?.status || "pending"}
                onChange={handlePaymentStatusChange}
                className="payment-status-select"
              >
                <Option value="pending">Pending</Option>
                <Option value="paid">Paid</Option>
              </Select>
            </Form.Item>
            <Form.Item label="Visit Status">
              <Select
                value={selectedBooking.visitStatus}
                onChange={handleVisitStatusChange}
              >
                <Option value="pending">Pending</Option>
                <Option value="completed">Completed</Option>
                <Option value="cancelled">Cancelled</Option>
              </Select>
            </Form.Item>
          </Form>
        )}
      </Modal>
    </div>
  );
}

export default AllBookings;