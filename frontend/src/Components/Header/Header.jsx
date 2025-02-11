import React, { useState } from "react";
import "./Header.css";
import logo from "/logowhite.png";
import { BiMenuAltRight } from "react-icons/bi";
import OutsideClickHandler  from "react-outside-click-handler";

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
        <img src={logo} alt="logo" width={80} height={60} />
        <OutsideClickHandler onOutsideClick={() => setMenuOpened(false)}>
          <div className="flexCenter h-menu" style={getMenuStyles(menuOpened)}>
            <a href="">Properties</a>
            <a href="">Our Value</a>
            <a href="">Get Started</a>
            <a href="">Contact Us</a>
            <button className="button">
              <a href="">Contact</a>
            </button>
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
