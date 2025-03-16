import React, { useContext } from "react";
import { Table, Select, Spin } from "antd";
import { useQuery, useMutation } from "react-query";
import { fetchAllBookings } from "../../utils/api";
import UserDetailsContext from "../../context/UserDetailsContext";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

const { Option } = Select;

function AllBookings() {
  const { userDetails } = useContext(UserDetailsContext);
  const token = userDetails.token;
  const navigate = useNavigate();

  // Fetch all bookings using useQuery
  const {
    data,
    isError,
    isLoading,
    refetch,
  } = useQuery(
    ["allBookings"], // Unique key for the query
    () => fetchAllBookings(token), // Fetch all bookings with the token
    { refetchOnWindowFocus: false } // Disable refetch on window focus
  );

  // Sort data so that "pending" bookings appear first
  const sortedData = data
    ?.map((booking) => ({ ...booking, key: booking.id })) // Add a unique key for Ant Design table
    .sort((a, b) => (a.visitStatus === "pending" ? -1 : 1)); // Sort by "pending" first

  // Define columns for the Ant Design table
  const columns = [
    {
      title: "Property",
      dataIndex: "property", // Access the nested `property` object
      key: "title",
      render: (property) => (
        <span
          style={{ color: "#1890ff", cursor: "pointer" }}
          onClick={() => navigate(`/listing/${property.id}`)} // Navigate using the property ID
        >
          {property?.title || "N/A"} {/* Fallback if title is missing */}
        </span>
      ),
    },
    {
      title: "Address",
      dataIndex: "property", // Access the nested `property` object
      key: "address",
      render: (property) => property?.address || "N/A", // Fallback if address is missing
    },
    {
      title: "GPS Code",
      dataIndex: "property", // Access the nested `property` object
      key: "gpsCode",
      render: (property) => property?.gpsCode || "N/A", // Fallback if GPS code is missing
    },
    {
      title: "Visitor",
      dataIndex: "user", // Access the nested `user` object
      key: "name",
      render: (user) => user?.name || "N/A", // Fallback if name is missing
    },
    {
      title: "Visitor's Email",
      dataIndex: "user", // Access the nested `user` object
      key: "email",
      render: (user) => user?.email || "N/A", // Fallback if email is missing
    },
    {
      title: "Visitor's Telephone",
      dataIndex: "user", // Access the nested `user` object
      key: "telephone",
      render: (user) => user?.telephone || "N/A", // Fallback if telephone is missing
    },
    {
      title: "Date",
      dataIndex: "date",
      key: "date",
    },
    {
      title: "Time",
      dataIndex: "time",
      key: "time",
    },
  ];

  // Display error message if there's an error
  if (isError) {
    return (
      <div style={{ textAlign: "center", color: "white", marginTop: "20px" }}>
        <span>Error loading bookings</span>
      </div>
    );
  }

  // Display loading spinner while data is being fetched
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
          dataSource={sortedData} // Pass the sorted data to the table
          columns={columns} // Define the columns for the table
          rowKey="id" // Use the 'id' field as the unique key for each row
          pagination={{ pageSize: 10 }} // Add pagination
          style={{ width: "100%" }}
        />
      </div>
    </div>
  );
}

export default AllBookings;