import React, { useContext } from "react";
import { Dropdown, Menu, Avatar } from "antd";
import { UserOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useQuery } from "react-query";
import { fetchUserDetails } from "../../utils/api";
import { useAuth0 } from "@auth0/auth0-react";
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
      <Menu.Item key="mysettings" onClick={() => navigate("/mysettings")}>
        Settings
      </Menu.Item>
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
