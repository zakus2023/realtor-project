import React, { useContext } from "react";
import UserDetailsContext from "../../context/UserDetailsContext";
import { useAuth0 } from "@auth0/auth0-react";
import { useQuery, useMutation } from "react-query";
import { fetchAllUsers, fetchUserDetails, editUserDetails } from "../../utils/api";
import { Table, Select, Spin, Alert } from "antd";
import { toast } from "react-toastify";

const { Option } = Select;

function AllUsers() {
  const { userDetails } = useContext(UserDetailsContext);
  const token = userDetails.token;
  const { user } = useAuth0();

  // Fetch single user details
  const {
    data: userDetail,
    isLoading: isUserDetailLoading,
    isError: isUserDetailError,
  } = useQuery(
    ["fetchUserDetails", user?.email],
    () => fetchUserDetails(user?.email, token),
    {
      enabled: !!user?.email && !!token, // Only run the query if user email and token exist
      onError: (error) => {
        toast.error("Failed to fetch user details");
        console.error("Error fetching user details:", error);
      },
    }
  );

  // Fetch all users
  const {
    data: users,
    isLoading: isUsersLoading,
    isError: isUsersError,
  } = useQuery(
    ["allUsers", userDetail?.role], // Include role in the query key
    () => fetchAllUsers(user?.email, userDetail?.role, token),
    {
      enabled: !!userDetail?.role && !!token, // Only run the query if role and token exist
      refetchOnWindowFocus: false, // Disable refetch on window focus
      onError: (error) => {
        toast.error("Failed to fetch users");
        console.error("Error fetching users:", error);
      },
    }
  );

  // Mutation for editing user details
  const editUserMutation = useMutation(
    ({ email, updatedData }) => editUserDetails(email, updatedData, token),
    {
      onSuccess: () => {
        toast.success("User details updated successfully!");
      },
      onError: (error) => {
        toast.error("Failed to update user details");
        console.error("Error updating user details:", error);
      },
    }
  );

  // Handle role change
  const handleRoleChange = (id, value) => {
    const user = users?.users?.find((user) => user.id === id);
    if (user) {
      editUserMutation.mutate({
        email: user.email,
        updatedData: { role: value },
      });
    }
  };

  // Handle status change
  const handleStatusChange = (id, value) => {
    const user = users?.users?.find((user) => user.id === id);
    if (user) {
      editUserMutation.mutate({
        email: user.email,
        updatedData: { status: value },
      });
    }
  };

  // Define columns for the Antd Table
  const columns = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
    },
    {
      title: "Telephone",
      dataIndex: "telephone",
      key: "telephone",
    },
    {
      title: "Address",
      dataIndex: "address",
      key: "address",
    },
    {
      title: "Role",
      dataIndex: "role",
      key: "role",
      render: (text, record) => (
        <Select
          defaultValue={text}
          style={{ width: 120 }}
          onChange={(value) => handleRoleChange(record.id, value)}
        >
          <Option value="user">User</Option>
          <Option value="admin">Admin</Option>
        </Select>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (text, record) => (
        <Select
          defaultValue={text}
          style={{ width: 120 }}
          onChange={(value) => handleStatusChange(record.id, value)}
        >
          <Option value="active">Active</Option>
          <Option value="inactive">Inactive</Option>
        </Select>
      ),
    },
  ];

  // Display error message if there's an error
  if (isUsersError) {
    return (
      <div style={{ textAlign: "center", color: "white", marginTop: "20px" }}>
        <span>Error loading users</span>
      </div>
    );
  }

  // Display loading spinner while data is being fetched
  if (isUsersLoading) {
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
        All Users
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
          dataSource={users?.users} // Pass the user data to the table
          columns={columns} // Define the columns for the table
          rowKey="id" // Use the 'id' field as the unique key for each row
          pagination={{ pageSize: 10 }} // Add pagination
          style={{ width: "100%" }}
        />
      </div>
    </div>
  );
}

export default AllUsers;