import React, { useState } from "react";
import "./Listings.css";
import SearchBar from "../../Components/SearchBar/SearchBar";
import useProperties from "../../hooks/useProperties";
import { PuffLoader } from "react-spinners";
import PropertyCard from "../../Components/PropertyCard/PropertyCard";

function Listings() {
  const { data, isError, isLoading } = useProperties();
  const [filter, setFilter] = useState("");

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
        <SearchBar filter={filter} setFilter={setFilter} />
        <div className="paddings flexCenter listings">
          {
            /* {data.map((card, i) => (
            <PropertyCard key={i} card={card} />
          ))} */
            data
              .filter(
                (listing) =>
                  listing.title.toLowerCase().includes(filter.toLowerCase()) ||
                  listing.city.toLowerCase().includes(filter.toLowerCase()) ||
                  listing.country.toLowerCase().includes(filter.toLowerCase())
              )
              .map((card, i) => (
                <PropertyCard key={i} card={card} />
              ))
          }
        </div>
      </div>
    </div>
  );
}

export default Listings;
