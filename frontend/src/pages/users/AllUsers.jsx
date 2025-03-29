import React, { useContext, useEffect, useState } from "react";
import UserDetailsContext from "../../context/UserDetailsContext";
import { useQuery } from "react-query";
import { fetchAllUsers } from "../../utils/api";
import { Table, Spin } from "antd";
import { toast } from "react-toastify";
import "./AllUsers.css";
import { useAuth, useUser } from "@clerk/clerk-react";

function AllUsers() {
  const { userDetails } = useContext(UserDetailsContext);
  const { user } = useUser();
  const [token, setToken] = useState(null);
  const { getToken } = useAuth();

  useEffect(() => {
    const fetchToken = async () => {
      const token = await getToken();
      setToken(token);
    };
    fetchToken();
  }, [getToken]);

  // Fetch all users
  const {
    data: users,
    isLoading: isUsersLoading,
    isError: isUsersError,
  } = useQuery(
    ["allUsers", user?.publicMetadata?.role],
    () =>
      fetchAllUsers(
        user?.primaryEmailAddress?.emailAddress,
        user?.publicMetadata?.role,
        token
      ),
    {
      enabled: !!user?.publicMetadata?.role && !!token,
      refetchOnWindowFocus: false,
      onError: (error) => {
        toast.error("Failed to fetch users");
        console.error("Error fetching users:", error);
      },
    }
  );

  // Define columns for the Antd Table (only display columns)
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
    },
  ];

  if (isUsersError) {
    return (
      <div className="error-message">
        <span>Error loading users</span>
      </div>
    );
  }

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
          scroll={{ x: true }}
          style={{ width: "100%" }}
        />
      </div>
    </div>
  );
}

export default AllUsers;
