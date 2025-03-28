import React, { useEffect, useState } from "react";
import "./Header.css";
import logo from "/logowhite.png";
import { BiMenuAltRight } from "react-icons/bi";
import OutsideClickHandler from "react-outside-click-handler";
import { Link, NavLink } from "react-router-dom";
import { useUser, useClerk } from "@clerk/clerk-react"; // Clerk instead of Auth0
import ProfileMenu from "../ProfileMenu/ProfileMenu";
import CreateListing from "../CreateListing/CreateListing";
import useAuthCheck from "../../hooks/useAuthCheck";
import { toast } from "react-toastify";
import ContactModal from "../ContactModal/ContactModal";
import { SignedIn, SignedOut, UserButton } from "@clerk/clerk-react";

function Header() {
  const [menuOpened, setMenuOpened] = useState(false);
  const [modalOpened, setModalOpened] = useState(false);
  const [contactModalOpened, setContactModalOpened] = useState(false);
  const { validateLogin } = useAuthCheck();
  const { user } = useUser(); // Clerk user
  const { signOut, openSignIn } = useClerk(); // Clerk methods

  // Keep everything else exactly the same below
  const getMenuStyles = (menuOpened) => {
    if (document.documentElement.clientWidth <= 800) {
      return { right: !menuOpened && "-100%" };
    }
  };

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
        <Link to="/">
          <img src={logo} alt="logo" width={80} height={60} />
        </Link>

        <OutsideClickHandler onOutsideClick={() => setMenuOpened(false)}>
          <div className="flexCenter h-menu" style={getMenuStyles(menuOpened)}>
            <NavLink
              to="/listings"
              onClick={() => setMenuOpened(false)}
              style={{ fontWeight: "600" }}
            >
              Listings
            </NavLink>

            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setContactModalOpened(true);
                setMenuOpened(false);
              }}
              style={{ fontWeight: "600" }}
            >
              Contact
            </a>

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

            <SignedOut>
              <button
                onClick={() => openSignIn()} // Changed to Clerk's sign-in
                style={{
                  backgroundColor: "blue",
                  padding: "8px 10px",
                  borderRadius: "5px",
                  border: "none",
                  fontWeight: "600",
                  cursor:"pointer"
                }}
              >
                Login
              </button>
            </SignedOut>
            <SignedIn>
              <ProfileMenu user={user} logout={signOut} /> {/* Clerk logout */}
              <UserButton />
            </SignedIn>
          </div>
        </OutsideClickHandler>

        <div
          className="menu-icon"
          onClick={() => setMenuOpened((prev) => !prev)}
        >
          <BiMenuAltRight size={30} />
        </div>
      </div>

      <ContactModal
        isOpen={contactModalOpened}
        onClose={() => setContactModalOpened(false)}
      />
    </section>
  );
}

export default Header;