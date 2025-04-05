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

  console.log("Allbookings: ",data)

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

  const handleStatusChange = (value) => {
    const updatedBooking = { ...selectedBooking, visitStatus: value };
    setSelectedBooking(updatedBooking);

    // Trigger the mutation
    updateStatus({
      userEmail: selectedBooking.user?.email, // Use visitor's email from the booking
      bookingId: selectedBooking.id,
      visitStatus: value,
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
            justifyContent: "flex-start",
            alignItems: "center",
            gap: "20px",
          }}
        >
          <div
            style={{ display: "flex", alignItems: "center", gap: "2px" }}
            className="legend-item"
          >
            <div
              style={{
                width: "16px",
                height: "16px",
                backgroundColor: "green",
                borderRadius: "4px",
              }}
            />
            <span>Pending</span>
          </div>
          <div
            style={{ display: "flex", alignItems: "center", gap: "2px" }}
            className="legend-item"
          >
            <div
              style={{
                width: "16px",
                height: "16px",
                backgroundColor: "blue",
                borderRadius: "4px",
              }}
            />
            <span>Completed</span>
          </div>
          <div
            style={{ display: "flex", alignItems: "center", gap: "2px" }}
            className="legend-item"
          >
            <div
              style={{
                width: "16px",
                height: "16px",
                backgroundColor: "red",
                borderRadius: "4px",
              }}
            />
            <span>Cancelled</span>
          </div>
          <div
            style={{ display: "flex", alignItems: "center", gap: "2px" }}
            className="legend-item"
          >
            <div
              style={{
                width: "16px",
                height: "16px",
                backgroundColor: "orange",
                borderRadius: "4px",
              }}
            />
            <span>Expired</span>
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
            <Form.Item label="Payment Status">
              <Input value="Pay on arrival" disabled />
            </Form.Item>
            <Form.Item label="Booking Status">
              <Select
                value={selectedBooking.visitStatus}
                onChange={handleStatusChange}
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
