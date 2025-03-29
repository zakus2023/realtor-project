import React, { useContext, useState, useEffect } from "react";
import { Dropdown, Menu, Modal, Spin, Button, Avatar, Input, message } from "antd";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "react-query";
import { fetchUserDetails, editUserDetails } from "../../utils/api";
import UserDetailsContext from "../../context/UserDetailsContext";
import { UserOutlined } from "@ant-design/icons";
import { useAuth } from "@clerk/clerk-react";

function ProfileMenu({ user, logout }) {
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const { userDetails } = useContext(UserDetailsContext);
  const [token, setToken] = useState(null);
  const navigate = useNavigate();
  const { getToken } = useAuth();

  useEffect(() => {
    const fetchToken = async () => {
      const token = await getToken();
      setToken(token);
    };
    fetchToken();
  }, [getToken]);

  const menu = (
    <Menu>
      <Menu.Item key="favourites" onClick={() => navigate("/favourites")}>
        Favourites
      </Menu.Item>
      <Menu.Item key="mybookings" onClick={() => navigate("/userBookings")}>
        My Bookings
      </Menu.Item>
      <Menu.Item key="mylistings" onClick={() => navigate("/mylistings")}>
        My Listings
      </Menu.Item>
      <Menu.Item key="mysettings" onClick={() => setSettingsModalVisible(true)}>
        Settings
      </Menu.Item>
      {user?.publicMetadata?.role === "admin" && (
        <>
          <Menu.Item key="allbookings" onClick={() => navigate("/allbookings")}>
            All Bookings
          </Menu.Item>
          <Menu.Item key="allusers" onClick={() => navigate("allusers")}>
            All Users
          </Menu.Item>
        </>
      )}
    </Menu>
  );

  return (
    <>
      <Dropdown overlay={menu} trigger={["click"]}>
        <button
          style={{
            cursor: "pointer",
            backgroundColor: "orange",
            padding: "8px 10px",
            borderRadius: "5px",
            border: "none",
            fontWeight: "600",
          }}
        >
          My Portal
        </button>
      </Dropdown>

      <Modal
        title="My Settings"
        open={settingsModalVisible}
        onCancel={() => setSettingsModalVisible(false)}
        footer={null}
        width={800}
      >
        <SettingsModalContent
          user={user}
          token={token}
          onClose={() => setSettingsModalVisible(false)}
        />
      </Modal>
    </>
  );
}

const SettingsModalContent = ({ user, token, onClose }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    address: "",
    telephone: "",
  });

  const {
    data: userData,
    isLoading,
    isError,
  } = useQuery(
    ["fetchUserDetails", user?.primaryEmailAddress?.emailAddress],
    () => fetchUserDetails(user?.primaryEmailAddress?.emailAddress, token),
    {
      enabled: !!user?.primaryEmailAddress?.emailAddress && !!token,
      onSuccess: (data) => {
        setFormData({
          name: data?.name || "",
          email: data?.email || "",
          address: data?.address || "",
          telephone: data?.telephone || "",
        });
      },
    }
  );

  const editUserMutation = useMutation(
    (updatedData) => editUserDetails(userData?.email, updatedData, token),
    {
      onSuccess: (updatedUser) => {
        setFormData({
          name: updatedUser.name,
          email: updatedUser.email,
          address: updatedUser.address,
          telephone: updatedUser.telephone,
        });
        message.success("Profile updated successfully!");
        setIsEditing(false);
      },
      onError: (error) => {
        console.error("Error updating profile:", error);
        const errorMessage = error.response?.data?.message || 
                           error.message || 
                           "Failed to update profile. Please try again.";
        message.error(errorMessage);
      },
    }
  );

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleSave = () => {
    // Convert empty strings to null before sending to the backend
    const updatedData = {
      name: formData.name?.trim() || null,
      address: formData.address?.trim() || null,
      telephone: formData.telephone?.trim() || null,
    };

    // Check if at least one field has a non-empty value
    const hasValidUpdate = Object.values(updatedData).some(
      value => value !== null && value !== undefined && value !== ""
    );

    if (!hasValidUpdate) {
      message.error("Please provide at least one field to update");
      return;
    }

    editUserMutation.mutate(updatedData);
  };

  if (isLoading) {
    return (
      <div className="loading-container">
        <Spin size="large" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="error-container">
        <span>Error fetching user details. Please try again later.</span>
      </div>
    );
  }

  return (
    <div className="wrapper paddings">
      <div className="user-details-card">
        <div className="avatar-container">
          <Avatar
            size={100}
            icon={<UserOutlined />}
            src={userData?.image}
            className="user-avatar"
          />
        </div>
        <div className="user-info">
          <div className="user-info-item">
            <span className="info-label">Name:</span>
            {isEditing ? (
              <Input
                name="name"
                value={formData.name || ""}
                onChange={handleInputChange}
                placeholder="Enter your name"
              />
            ) : (
              <span className="info-value">
                {userData?.name || user?.fullName}
              </span>
            )}
          </div>
          <div className="user-info-item">
            <span className="info-label">Email:</span>
            {isEditing ? (
              <Input
                name="email"
                value={formData.email || user?.primaryEmailAddress?.emailAddress || ""}
                onChange={handleInputChange}
                placeholder="Enter your email"
                disabled
              />
            ) : (
              <span className="info-value">
                {user?.primaryEmailAddress?.emailAddress || "N/A"}
              </span>
            )}
          </div>
          <div className="user-info-item">
            <span className="info-label">Address:</span>
            {isEditing ? (
              <Input
                name="address"
                value={formData.address || ""}
                onChange={handleInputChange}
                placeholder="Enter your address"
              />
            ) : (
              <span className="info-value">{userData?.address || "N/A"}</span>
            )}
          </div>
          <div className="user-info-item">
            <span className="info-label">Telephone:</span>
            {isEditing ? (
              <Input
                name="telephone"
                value={formData.telephone || ""}
                onChange={handleInputChange}
                placeholder="Enter your telephone"
              />
            ) : (
              <span className="info-value">{userData?.telephone || "N/A"}</span>
            )}
          </div>
          <div className="user-info-item">
            <span className="info-label">Role:</span>
            <span className="info-value">
              {userData?.role || user?.publicMetadata?.role}
            </span>
          </div>
        </div>
        <div
          className="button-container"
          style={{ display: "flex", gap: "1rem" }}
        >
          <button className="cancelButton" onClick={onClose} type="button">
            Close
          </button>
          {isEditing ? (
            <Button
              type="primary"
              onClick={handleSave}
              loading={editUserMutation.isLoading}
            >
              Save
            </Button>
          ) : (
            <Button type="primary" onClick={() => setIsEditing(true)}>
              Edit Profile
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileMenu;