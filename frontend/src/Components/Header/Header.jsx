import React, { useEffect, useState } from "react";
import "./Header.css";
import logo from "/logowhite.png";
import { BiMenuAltRight } from "react-icons/bi";
import OutsideClickHandler from "react-outside-click-handler";
import { Link, NavLink } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import ProfileMenu from "../ProfileMenu/ProfileMenu";
import CreateListing from "../CreateListing/CreateListing";
import useAuthCheck from "../../hooks/useAuthCheck";
import { toast } from "react-toastify";
import ContactModal from "../ContactModal/ContactModal";


function Header() {

  const [menuOpened, setMenuOpened] = useState(false);
  const [modalOpened, setModalOpened] = useState(false);
  const [contactModalOpened, setContactModalOpened] = useState(false); // State for contact modal
  const { validateLogin } = useAuthCheck();
  const { loginWithRedirect, isAuthenticated, user, logout } = useAuth0();

  // Function to handle menu styles for mobile view
  const getMenuStyles = (menuOpened) => {
    if (document.documentElement.clientWidth <= 800) {
      return { right: !menuOpened && "-100%" };
    }
  };

  // Function to handle create listing
  const handleCreateListing = () => {
    if (!validateLogin()) {
      toast.error("You must log in to create a listing.");
      setModalOpened(false);
    } else {
      setModalOpened(true);
    }
  };

  return (
    <section className="h-wrapper">
      <div className="h-container flexCenter innerWidth paddings">
        {/* Logo */}
        <Link to="/">
          <img src={logo} alt="logo" width={80} height={60} />
        </Link>

        {/* Menu */}
        <OutsideClickHandler onOutsideClick={() => setMenuOpened(false)}>
          <div className="flexCenter h-menu" style={getMenuStyles(menuOpened)}>
            {/* Listings Link */}
            <NavLink
              to="/listings"
              onClick={() => setMenuOpened(false)}
              style={{ fontWeight: "600" }}
            >
              Listings
            </NavLink>

            {/* Contact Link */}
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setContactModalOpened(true); // Open the contact modal
                setMenuOpened(false);
              }}
              style={{ fontWeight: "600" }}
            >
              Contact
            </a>

            {/* Create Listing Button */}
            <div
              className="create-listing-btn"
              onClick={handleCreateListing}
              style={{
                cursor: "pointer",
                backgroundColor: "green",
                color: "white",
                padding: "8px 15px",
                borderRadius: "5px",
              }}
            >
              Add Property
            </div>
            <CreateListing opened={modalOpened} setOpened={setModalOpened} />

            {/* Login/Profile Menu */}
            {!isAuthenticated ? (
              <button className="button" onClick={loginWithRedirect}>
                Login
              </button>
            ) : (
              <ProfileMenu user={user} logout={logout} />
            )}
          </div>
        </OutsideClickHandler>

        {/* Mobile Menu Icon */}
        <div
          className="menu-icon"
          onClick={() => setMenuOpened((prev) => !prev)}
        >
          <BiMenuAltRight size={30} />
        </div>
      </div>

      {/* Contact Modal */}
      <ContactModal
        isOpen={contactModalOpened}
        onClose={() => setContactModalOpened(false)}
      />
    </section>
  );
}

export default Header;