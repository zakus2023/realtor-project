import React from "react";
import "./Properties.css";
import { Swiper, SwiperSlide, useSwiper } from "swiper/react";
import "swiper/css";
import { sliderSettings } from "../../utils/common";
import PropertyCard from "../PropertyCard/PropertyCard";
import useProperties from "../../hooks/useProperties";
import { PuffLoader } from "react-spinners";

function Properties() {
  const { data, isError, isLoading } = useProperties();

  if (isError) {
    return (
      <div className="wrapper">
        <span>Error Loading Listings</span>
      </div>
    );
  }
  if (isLoading) {
    return (
      <div className="wrapper flexCenter" style={{ height: "60vh" }}>
        <PuffLoader
          height="80"
          width="80"
          radius={1}
          aria-label="puff-loading"
        />
      </div>
    );
  }
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
          {data.slice(0, 8).map((card, index) => (
            <SwiperSlide key={index}>
              <PropertyCard card={card} />
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
      <button onClick={() => swiper.slidePrev()} className="r-prevButton">
        &lt;
      </button>
      <button onClick={() => swiper.slideNext()} className="r-nextButton">
        &gt;
      </button>
    </div>
  );
};
