import { useState } from "react";
import Header from "./Components/Header/Header";
import Hero from "./Components/Hero/Hero";
import "./App.css";
import Partners from "./Components/partners/Partners";
import Properties from "./Components/properties/Properties";
import Value from "./Components/value/Value";
import Contact from "./Components/contact/Contact";
import GetStarted from "./Components/getstarted/GetStarted";
import Footer from "./Components/footer/Footer";

function App() {
  return (
    <div className="App">
      <div className="">
        <div className="white-gradient" />
        <Header />
        <Hero />
      </div>
      <Partners />
      <Properties />
      <Value />
      <Contact />
      <GetStarted />
      <Footer />
    </div>
  );
}

export default App;
