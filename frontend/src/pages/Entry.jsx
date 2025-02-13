import React from "react";
import Hero from "../Components/Hero/Hero";
import Partners from "../Components/partners/Partners";
import Properties from "../Components/properties/Properties";
import Value from "../Components/value/Value";
import Contact from "../Components/contact/Contact";
import GetStarted from "../Components/getstarted/GetStarted";

function Entry() {
  return (
    <div className="">
      <div>
        <div className="white-gradient" />
        <Hero />
      </div>
      <div className="" style={{ background: "white" }}>
        <Partners />
        <Properties />
        <Value />
        <Contact />
        <GetStarted />
      </div>
    </div>
  );
}

export default Entry;
