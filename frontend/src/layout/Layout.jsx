import React from "react";
import "./Layout.css";
import Header from "../Components/Header/Header";
import Footer from "../Components/Footer/Footer";
import { Outlet } from "react-router-dom";

function Layout() {
  return (
    <>
    <div style={{ background: "var(--black)", overflow: "hidden" }}>
      <Header />
      <Outlet />
      <Footer />
    </div>
    </>
    
  );
}

export default Layout;
