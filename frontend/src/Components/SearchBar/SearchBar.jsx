import React from "react";
import "./SearchBar.css";
import { HiLocationMarker } from "react-icons/hi";

function SearchBar({ filter, setFilter }) {
  
  return (
    <div className="flexCenter search-bar">
      <HiLocationMarker color="var(--blue)" size={25} />
      <input
        type="text"
        value={filter}
        style={{color:"black"}}
        onChange={(e) => setFilter(e.target.value)}
      />
      <button className="button">Search</button>
    </div>
  );
}

export default SearchBar;
