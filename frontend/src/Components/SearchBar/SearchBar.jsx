import React from 'react'
import './SearchBar.css'
import { HiLocationMarker } from 'react-icons/hi'

function SearchBar() {
  return (
    <div className="flexCenter search-bar">
    <HiLocationMarker color="var(--blue)" size={25} />
    <input type="text" />
    <button className="button">Search</button>
  </div>

  )
}

export default SearchBar
