import React, { useContext, useState } from "react";
import UserDetailsContext from "../context/UserDetailsContext";
import { useAuth0 } from "@auth0/auth0-react";
import { useQuery, useMutation } from "react-query"; // Import useMutation
import { fetchUserDetails, editUserDetails } from "../utils/api"; // Import the editUserDetails function
import { Spin, Button, Avatar, Input, message } from "antd";
import { UserOutlined } from "@ant-design/icons";
import "./MySettings.css"; // Add custom CSS for styling
import { useNavigate } from "react-router-dom";

function MySettings() {
  const navigate = useNavigate();

  const { userDetails } = useContext(UserDetailsContext);
  const token = userDetails.token;
  const { user } = useAuth0();
  const [isEditing, setIsEditing] = useState(false); // State to toggle edit mode
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    address: "",
    telephone: "",
  });

  // Fetch user details
  const {
    data: userData,
    isLoading,
    isError,
  } = useQuery(
    ["fetchUserDetails", user?.email],
    () => fetchUserDetails(user?.email, token),
    {
      enabled: !!user?.email && !!token, // Only run the query if user email exists
      onSuccess: (data) => {
        // Initialize form data with fetched user details
        setFormData({
          name: data?.name || "",
          email: data?.email || "",
          address: data?.address || "",
          telephone: data?.telephone || "",
        });
      },
    }
  );

  // Mutation for editing user details
  const editUserMutation = useMutation(
    (updatedData) => editUserDetails(userData?.email, updatedData, token),
    {
      onSuccess: (updatedUser) => {
        // Update the local state with the updated user data
        setFormData({
          name: updatedUser.name,
          email: updatedUser.email,
          address: updatedUser.address,
          telephone: updatedUser.telephone,
        });
        message.success("Profile updated successfully!");
        setIsEditing(false); // Exit edit mode
      },
      onError: (error) => {
        console.error("Error updating profile:", error);
        message.error("Failed to update profile. Please try again.");
      },
    }
  );

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  // Handle save button click
  const handleSave = () => {
    // Prepare the updated data
    const updatedData = {
      name: formData.name,
      address: formData.address,
      telephone: formData.telephone,
    };

    // Call the mutation to update user details
    editUserMutation.mutate(updatedData);
  };

  // Handle loading state
  if (isLoading) {
    return (
      <div className="loading-container">
        <Spin size="large" />
      </div>
    );
  }

  // Handle error state
  if (isError) {
    return (
      <div className="error-container">
        <span>Error fetching user details. Please try again later.</span>
      </div>
    );
  }

  return (
    <div className="wrapper paddings innerWidth">
      <h1 className="settings-title">My Settings</h1>
      <div className="user-details-card">
        <div className="avatar-container">
          <Avatar
            size={100}
            icon={<UserOutlined />}
            src={userData?.image} // Display user's image if available
            className="user-avatar"
          />
        </div>
        <div className="user-info">
          <div className="user-info-item">
            <span className="info-label">Name:</span>
            {isEditing ? (
              <Input
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Enter your name"
              />
            ) : (
              <span className="info-value">{userData?.name || "N/A"}</span>
            )}
          </div>
          <div className="user-info-item">
            <span className="info-label">Email:</span>
            {isEditing ? (
              <Input
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="Enter your email"
                disabled // Email is non-editable
              />
            ) : (
              <span className="info-value">{userData?.email || "N/A"}</span>
            )}
          </div>
          <div className="user-info-item">
            <span className="info-label">Address:</span>
            {isEditing ? (
              <Input
                name="address"
                value={formData.address}
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
                value={formData.telephone}
                onChange={handleInputChange}
                placeholder="Enter your telephone"
              />
            ) : (
              <span className="info-value">{userData?.telephone || "N/A"}</span>
            )}
          </div>
          <div className="user-info-item">
            <span className="info-label">Role:</span>
            <span className="info-value">{userData?.role || "N/A"}</span>
          </div>
          <div className="user-info-item">
            <span className="info-label">Status:</span>
            <span className="info-value">{userData?.status || "N/A"}</span>
          </div>
        </div>
        <div
          className="button-container"
          style={{ display: "flex", gap: "1rem" }}
        >
          <button className="cancelButton" onClick={() => navigate("/")} type="button">
            Cancel
          </button>
          {isEditing ? (
            <Button
              type="primary"
              onClick={handleSave}
              loading={editUserMutation.isLoading} // Show loading state during mutation
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
}

export default MySettings;
