import React from "react";
import { AiFillHeart } from "react-icons/ai";
import './PropertyCard.css'
import {truncate} from 'lodash'

function truncateToWords(text, numWords) {
  const words = text.split(" ");
  if (words.length > numWords) {
    return words.slice(0, numWords).join(" ") + "...";
  }
  return text;
}

function PropertyCard({ card }) {
  return (
    <div className="flexColStart r-card">
       <AiFillHeart size={24} color="white"/>
      <img src={card.images[0]} alt="home" />
     
      <span className="secondaryText r-price">
        <span style={{ color: "orange" }}>$</span>
        <span>{card.price}</span>
      </span>
      <span className="primaryText">{truncate(card.title, 3)}</span>
      <span className="secondaryText">{truncate(card.description, 5)}</span>
    </div>
  );
}

export default PropertyCard;
