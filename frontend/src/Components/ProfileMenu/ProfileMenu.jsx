import React, { useContext } from "react";
import { Dropdown, Menu, Avatar } from "antd";
import { UserOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useQuery } from "react-query";
import { fetchUserDetails } from "../../utils/api";
import UserDetailsContext from "../../context/UserDetailsContext";

function ProfileMenu({ user, logout }) {
  const { userDetails } = useContext(UserDetailsContext);
  const token = userDetails?.token;

  // fetch single user

  const { data: userDetail } = useQuery(
    ["fetchUserDetails", user?.email],
    () => fetchUserDetails(user?.email, token),
    {
      enabled: !!user?.email && !!token, // Only run the query if user email exists
    }
  );

  const navigate = useNavigate();
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
      {userDetail?.role === "admin" && (
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
    <Dropdown overlay={menu} trigger={["click"]}>
      {/* <Avatar
        src={user?.picture}
        icon={<UserOutlined />} // Fallback icon if no image is provided
        style={{ cursor: "pointer" }}
      /> */}
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
  );
}

export default ProfileMenu;
