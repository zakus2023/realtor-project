import React, { useContext } from "react";
import UserDetailsContext from "../../context/UserDetailsContext";
import { useAuth0 } from "@auth0/auth0-react";
import { useQuery, useMutation } from "react-query";
import { fetchAllUsers, fetchUserDetails, editUserDetails } from "../../utils/api";
import { Table, Select, Spin } from "antd";
import { toast } from "react-toastify";
import "./AllUsers.css"; // Import the CSS file

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
          style={{ width: "100%" }} // Make the select dropdown responsive
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
          style={{ width: "100%" }} // Make the select dropdown responsive
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
      <div className="error-message">
        <span>Error loading users</span>
      </div>
    );
  }

  // Display loading spinner while data is being fetched
  if (isUsersLoading) {
    return (
      <div className="loading-spinner">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="all-users-container">
      <h1>All Users</h1>
      <div className="table-container">
        <Table
          dataSource={users?.users}
          columns={columns}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          scroll={{ x: true }} // Enable horizontal scrolling
          style={{ width: "100%" }}
        />
      </div>
    </div>
  );
}

export default AllUsers;