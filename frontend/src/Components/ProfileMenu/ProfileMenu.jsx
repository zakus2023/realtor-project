import React from "react";
import { Dropdown, Menu, Avatar } from "antd";
import { UserOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";

function ProfileMenu({ user, logout }) {
  const navigate = useNavigate();
  const menu = (
    <Menu>
      <Menu.Item key="favourites" onClick={()=>navigate("/favourites")}>Favourites</Menu.Item>
      <Menu.Item key="mybookings" onClick={() => navigate("/userBookings")}>
        My Bookings
      </Menu.Item>
      <Menu.Item key="mylistings">My Listings</Menu.Item>
      <Menu.Item key="allbookings">All Bookings</Menu.Item>
      <Menu.Item key="allusers">All Users</Menu.Item>
      <Menu.Item
        key="logout"
        onClick={() => {
          localStorage.clear();
          logout();
        }}
      >
        Logout
      </Menu.Item>
    </Menu>
  );

  return (
    <Dropdown overlay={menu} trigger={["click"]}>
      <Avatar
        src={user?.picture}
        icon={<UserOutlined />} // Fallback icon if no image is provided
        style={{ cursor: "pointer" }}
      />
    </Dropdown>
  );
}

export default ProfileMenu;
