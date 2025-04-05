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

  console.log("Allbookings: ", data);

  // Mutation to update booking status
  const { mutate: updateStatus } = useMutation(
    ({ userEmail, bookingId, visitStatus }) =>
      updateVisitStatusFromAdmin(userEmail, bookingId, visitStatus, token),
    {
      onSuccess: () => {
        message.success("Booking status updated successfully");
        refetch(); // Refetch data to reflect changes
      },
      onError: () => {
        message.error("Failed to update booking status");
      },
    }
  );

  const handleStatusChange = (value, field) => {
    const updatedBooking = {
      ...selectedBooking,
      [field]: value,
      // Automatically set payment to "paid" when visit is marked "completed"
      ...(field === "visitStatus" && value === "completed"
        ? {
            payment: {
              ...selectedBooking.payment,
              status: "paid",
            },
          }
        : {}),
    };
    setSelectedBooking(updatedBooking);

    // Prepare the status to send to backend
    const statusToUpdate =
      field === "paymentStatus"
        ? { paymentStatus: value }
        : { visitStatus: value };

    // Trigger the mutation
    updateStatus({
      userEmail: selectedBooking.user?.email,
      bookingId: selectedBooking.id,
      ...statusToUpdate,
    });
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
    {
      title: "Property",
      dataIndex: "property",
      key: "title",
      render: (property) => (
        <span
          style={{ color: "#1890ff", cursor: "pointer" }}
          onClick={() => navigate(`/listing/${property.propertyId}`)}
        >
          {property?.title || "N/A"}
        </span>
      ),
      responsive: ["xs", "sm"], // Show on extra small and small screens
    },
    {
      title: "GPS Code",
      dataIndex: "property",
      key: "gpsCode",
      render: (property) => property?.gpsCode || "N/A",
      responsive: ["xs", "sm"], // Show on extra small and small screens
    },
    {
      title: "Visitor's Email",
      dataIndex: "user",
      key: "email",
      render: (user) => user?.email || "N/A",
      responsive: ["md"], // Show on medium screens and larger
    },
    {
      title: "Visitor's Telephone",
      dataIndex: "user",
      key: "telephone",
      render: (user) => user?.telephone || "N/A",
      responsive: ["md"], // Show on medium screens and larger
    },
    {
      title: "Date",
      dataIndex: "date",
      key: "date",
      responsive: ["md"], // Show on medium screens and larger
    },
    {
      title: "Time",
      dataIndex: "time",
      key: "time",
      responsive: ["md"], // Show on medium screens and larger
    },
    {
      title: "Payment Status",
      dataIndex: "payment",
      key: "paymentStatus",
      render: (payment) => (
        <span className={`payment-status ${payment?.status || "pending"}`}>
          {payment?.status?.toUpperCase() || "PENDING"}
        </span>
      ),
      responsive: ["md"],
    },
    {
      title: "Action",
      key: "action",
      render: (_, record) => (
        <Button
          onClick={() => handleViewBooking(record)}
          style={getButtonStyle(record.visitStatus)}
        >
          View Booking
        </Button>
      ),
      responsive: ["xs", "sm", "md", "lg", "xl"], // Always show the action button
    },
  ];

  if (isError) {
    return (
      <div style={{ textAlign: "center", color: "white", marginTop: "20px" }}>
        <span>Error loading bookings</span>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div
      style={{
        padding: "20px",
        backgroundColor: "#f0f2f5",
        minHeight: "100vh",
      }}
    >
      <h1
        style={{
          textAlign: "center",
          color: "#333",
          marginBottom: "20px",
        }}
      >
        All Bookings
      </h1>
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          backgroundColor: "white",
          padding: "20px",
          borderRadius: "8px",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
        }}
      >
        <Table
          dataSource={sortedData}
          columns={columns}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          style={{ width: "100%" }}
        />

        {/* Legend for Color Coding */}
        <div
          style={{
            marginTop: "20px",
            display: "flex",
            gap: "20px",
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div
              style={{
                width: 16,
                height: 16,
                backgroundColor: "green",
                borderRadius: 4,
              }}
            />
            <span>Pending (Visit)</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div
              style={{
                width: 16,
                height: 16,
                backgroundColor: "blue",
                borderRadius: 4,
              }}
            />
            <span>Completed</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div
              style={{
                width: 16,
                height: 16,
                backgroundColor: "red",
                borderRadius: 4,
              }}
            />
            <span>Cancelled</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div
              style={{
                width: 16,
                height: 16,
                backgroundColor: "orange",
                borderRadius: 4,
              }}
            />
            <span>Expired</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div
              style={{
                width: 16,
                height: 16,
                backgroundColor: "gray",
                borderRadius: 4,
              }}
            />
            <span>Pending (Payment)</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div
              style={{
                width: 16,
                height: 16,
                backgroundColor: "purple",
                borderRadius: 4,
              }}
            />
            <span>Paid</span>
          </div>
        </div>
      </div>

      <Modal
        title="Booking Details"
        visible={isModalVisible}
        onCancel={handleCancel}
        footer={null}
        centered // Ensure the modal is centered
        width="90%" // Set a responsive width
        style={{ maxWidth: "600px" }} // Limit maximum width for larger screens
        className="all-bookings-modal"
      >
        {selectedBooking && (
          <Form layout="vertical">
            <Form.Item label="Visitor Name">
              <Input value={selectedBooking.user?.name || "N/A"} disabled />
            </Form.Item>
            <Form.Item label="Visitor Email">
              <Input value={selectedBooking.user?.email || "N/A"} disabled />
            </Form.Item>
            <Form.Item label="Visitor Address">
              <Input
                value={selectedBooking.property?.address || "N/A"}
                disabled
              />
            </Form.Item>
            <Form.Item label="Date">
              <Input value={selectedBooking.date} disabled />
            </Form.Item>
            <Form.Item label="Time">
              <Input value={selectedBooking.time} disabled />
            </Form.Item>
            <Form.Item label="Payment Method">
              <Input value={selectedBooking.payment.method} disabled />
            </Form.Item>
            <Form.Item label="Payment Status">
              <Select
                value={selectedBooking.payment?.status || "pending"}
                onChange={(value) => handleStatusChange(value, "paymentStatus")}
              >
                <Option value="pending">Pending</Option>
                <Option value="paid">Paid</Option>
              </Select>
            </Form.Item>

            <Form.Item label="Visit Status">
              <Select
                value={selectedBooking.visitStatus}
                onChange={(value) => handleStatusChange(value, "visitStatus")}
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
