import React from "react";
import Hero_Image from "/hero-image-new.png";
import "./Hero.css";
import CountUp from "react-countup";
import { motion } from "framer-motion";
import SearchBar from "../SearchBar/SearchBar";

function Hero() {
  return (
    <div>
      <section className="hero-wrapper">
        <div className="paddings innerWidth flexCenter hero-container">
          {/* Left side */}
          <div className="flexColStart hero-left">
            <div className="hero-title">
              <div className="orange-circle" />

              <motion.h1
                initial={{ y: "2rem", opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{
                  duration: 2,
                  type: "spring",
                }}
              >
                Discover <br />
                Most Suitable <br />
                Properties
              </motion.h1>
            </div>
            <div className="flexColStart hero-des">
              <span className="secondaryText">
                Find a variety of properties that suit your need very easily
              </span>
              <span className="secondaryText">
                Forget all difficulties in finding a property
              </span>
            </div>
            <SearchBar/>
            <div className="flexCenter stats">
              <div className="flexColCenter stat">
                <span>
                  <CountUp start={8800} end={9000} duration={4} />
                  <span>+</span>
                </span>
                <span className="secondaryText">Premium Products</span>
              </div>
              <div className="flexColCenter stat">
                <span>
                  <CountUp start={1950} end={2000} duration={4} />
                  <span>+</span>
                </span>
                <span className="secondaryText">Happy Customers</span>
              </div>
              <div className="flexColCenter stat">
                <span>
                  <CountUp end={28} duration={9} />
                  <span>+</span>
                </span>
                <span className="secondaryText">Awards</span>
              </div>
            </div>
          </div>
          {/* right side */}
          <motion.div
            className="flexCenter hero-right"
            initial={{ x: "7rem", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 2, type: "spring" }}
          >
            <div className="image-container">
              <img src={Hero_Image} alt="" />
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}

export default Hero;
