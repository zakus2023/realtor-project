import React, { useState } from "react";
import "./Header.css";
import logo from "/logowhite.png";
import { BiMenuAltRight } from "react-icons/bi";
import OutsideClickHandler from "react-outside-click-handler";
import { Link, NavLink } from "react-router-dom";

function Header() {
  const [menuOpened, setMenuOpened] = useState(false);

  const getMenuStyles = (menuOpened) => {
    if (document.documentElement.clientWidth <= 800) {
      return { right: !menuOpened && "-100%" };
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
            <NavLink to="/listings">Listings</NavLink>

            <a href="mailto:idbsch2012@gmail.com">Contact</a>

            {/* Login button */}
            <button className="button">Login</button>
          </div>
        </OutsideClickHandler>

        {/* mobile menu */}
        <div
          className="menu-icon"
          onClick={() => setMenuOpened((prev) => !prev)}
        >
          <BiMenuAltRight size={30} />
        </div>
      </div>
    </section>
  );
}

export default Header;
