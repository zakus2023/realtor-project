import React, { useState } from "react";
import "./Listings.css";
import SearchBar from "../../Components/SearchBar/SearchBar";
import useProperties from "../../hooks/useProperties";
import { PuffLoader } from "react-spinners";
import PropertyCard from "../../Components/PropertyCard/PropertyCard";

function Listings() {
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
    <div className="wrapper">
      <div className="flexColCenter paddings innerWidth listings-container">
        <SearchBar />
        <div className="paddings flexCenter listings">
          {data.map((card, i) => (
            <PropertyCard key={card.id || i} card={card} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default Listings;
