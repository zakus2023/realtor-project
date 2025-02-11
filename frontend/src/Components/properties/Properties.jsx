import React from "react";
import "./Properties.css";
import { Swiper, SwiperSlide, useSwiper } from "swiper/react";
import "swiper/css";
import data from "../../utils/slider.json";
import { sliderSettings } from "../../utils/common";

function truncateToWords(text, numWords) {
  const words = text.split(" ");
  if (words.length > numWords) {
    return words.slice(0, numWords).join(" ") + "...";
  }
  return text;
}

function Properties() {
  return (
    <section className="r-wrapper">
      <div className="paddings innerWidth r-container">
        <div className="flexColStart r-head">
          <span className="orangeText">Best Choices</span>
          <span className="primaryText">Popular Properties</span>
        </div>
        {/* Carousel starts here */}
        <Swiper {...sliderSettings}>
          <SliderButtons />
          {/* slider */}
          {data.map((card, index) => (
            <SwiperSlide key={index}>
              <div className="flexColStart r-card">
                <img src={card.image} alt="home" />
                <span className="secondaryText r-price">
                  <span style={{ color: "orange" }}>$</span>
                  <span>{card.price}</span>
                </span>
                <span className="primaryText">{card.name}</span>
                <span className="secondaryText">
                  {truncateToWords(card.detail, 5)}
                </span>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
        {/* ============================* */}
      </div>
    </section>
  );
}

export default Properties;

// Slider Buttons
const SliderButtons = () => {
  const swiper = useSwiper();
  return (
    <div className="flexCenter r-button">
      <button onClick={() => swiper.slidePrev()} className="r-prevButton">&lt;</button>
      <button onClick={() => swiper.slideNext()} className="r-nextButton">&gt;</button>
    </div>
  );
};
