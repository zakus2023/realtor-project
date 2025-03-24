import React from "react";
import './PropertyCard.css'
import {truncate} from 'lodash'
import { useNavigate } from "react-router-dom";
import LikeButton from "../LikeButton/LikeButton.";


function PropertyCard({ card }) {
  const navigate = useNavigate()

  return (
    <div className="flexColStart r-card" onClick={()=>navigate(`/listing/${card.id}`)}>
       <LikeButton id={card.id}/>
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
