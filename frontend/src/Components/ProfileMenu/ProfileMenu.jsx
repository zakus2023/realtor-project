import React, { 
  useContext, 
  useEffect, 
  useState, 
  useCallback, 
  memo, 
  useMemo
} from "react";
import {
  Dropdown,
  Menu,
  Modal,
  Spin,
  Button,
  Avatar,
  Input,
  message,
} from "antd";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "react-query";
import { fetchUserDetails, editUserDetails } from "../../utils/api";
import UserDetailsContext from "../../context/UserDetailsContext";
import { UserOutlined } from "@ant-design/icons";
import { useAuth } from "@clerk/clerk-react";

const ProfileMenu = memo(function ProfileMenu({ user, logout }) {
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const { userDetails } = useContext(UserDetailsContext);
  const [token, setToken] = useState(null);
  const navigate = useNavigate();
  const { getToken } = useAuth();

  useEffect(() => {
    const fetchToken = async () => {
      try {
        const token = await getToken();
        setToken(token);
      } catch (error) {
        console.error("Error fetching token:", error);
      }
    };
    fetchToken();
  }, [getToken]);

  const menu = useMemo(
    () => (
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
        <Menu.Item
          key="mysettings"
          onClick={() => setSettingsModalVisible(true)}
        >
          Settings
        </Menu.Item>
        {user?.publicMetadata?.role === "admin" && (
          <>
            <Menu.Item
              key="allbookings"
              onClick={() => navigate("/allbookings")}
            >
              All Bookings
            </Menu.Item>
            <Menu.Item key="allusers" onClick={() => navigate("allusers")}>
              All Users
            </Menu.Item>
          </>
        )}
      </Menu>
    ),
    [navigate, user]
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
        destroyOnClose
      >
        <SettingsModalContent
          user={user}
          token={token}
          onClose={() => setSettingsModalVisible(false)}
        />
      </Modal>
    </>
  );
});

const SettingsModalContent = memo(function SettingsModalContent({
  user,
  token,
  onClose,
}) {
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
    () => fetchUserDetails(
      user?.primaryEmailAddress?.emailAddress,
      token
    ),
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
  console.log("User Data from Settings",userData)

  const editUserMutation = useMutation(
    (updatedData) => editUserDetails(
      user?.primaryEmailAddress?.emailAddress,
      updatedData,
      token
    ),
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
        message.error(
          error.response?.data?.message ||
          "Failed to update profile. Please try again."
        );
      },
    }
  );

  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleSave = useCallback(() => {
    const updatedData = {
      name: formData.name?.trim() || user?.fullName,
      address: formData.address?.trim() || null,
      telephone: formData.telephone?.trim() || null,
    };

    if (!updatedData.name && !updatedData.address && !updatedData.telephone) {
      message.error("Please provide at least one field to update");
      return;
    }

    editUserMutation.mutate(updatedData);
  }, [formData, editUserMutation]);

  if (isLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 24 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (isError) {
    return (
      <div style={{ padding: 24, color: "red" }}>
        Error fetching user details. Please try again later.
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <Avatar size={100} icon={<UserOutlined />} src={userData?.image} />
      </div>

      <div style={{ marginBottom: 16 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 8,
          }}
        >
          <span style={{ fontWeight: "bold" }}>Name:</span>
          {isEditing ? (
            <Input
              name="name"
              value={formData.name || user?.fullName || ""}
              onChange={handleInputChange}
              style={{ width: "70%" }}
            />
          ) : (
            <span>{userData?.data?.name || user?.fullName || "N/A"}</span>
          )}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 8,
          }}
        >
          <span style={{ fontWeight: "bold" }}>Email:</span>
          {isEditing ? (
            <Input
              name="email"
              value={
                formData.email || user?.primaryEmailAddress?.emailAddress || ""
              }
              onChange={handleInputChange}
              disabled
              style={{ width: "70%" }}
            />
          ) : (
            <span>{user?.primaryEmailAddress?.emailAddress || "N/A"}</span>
          )}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 8,
          }}
        >
          <span style={{ fontWeight: "bold" }}>Address:</span>
          {isEditing ? (
            <Input
              name="address"
              value={formData.address || ""}
              onChange={handleInputChange}
              style={{ width: "70%" }}
            />
          ) : (
            <span>{userData?.data?.address || "N/A"}</span>
          )}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 8,
          }}
        >
          <span style={{ fontWeight: "bold" }}>Telephone:</span>
          {isEditing ? (
            <Input
              name="telephone"
              value={formData.telephone || ""}
              onChange={handleInputChange}
              style={{ width: "70%" }}
            />
          ) : (
            <span>{userData?.data?.telephone || "N/A"}</span>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontWeight: "bold" }}>Role:</span>
          <span>{userData?.role || user?.publicMetadata?.role || "N/A"}</span>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
        <Button onClick={onClose}>Close</Button>
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
  );
});

export default ProfileMenu;