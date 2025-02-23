import React from "react";
import "./PropertyImages.css";

function PropertyImages({ photos }) {
  return (
    <>
      <div className="flexStart r-card">
        <img src={photos} alt="photo" />
      </div>
    </>
  );
}

export default PropertyImages;
