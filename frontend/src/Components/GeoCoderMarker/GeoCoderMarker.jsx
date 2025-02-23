import React, { useState, useEffect } from "react";
import { Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import icon from "leaflet/dist/images/marker-icon.png"; // Import the default marker icon
import iconShadow from "leaflet/dist/images/marker-shadow.png";

// Define the default icon
let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
});

// Set the default icon for all markers
L.Marker.prototype.options.icon = DefaultIcon;

function GeoCoderMarker({ address }) {
  const map = useMap();
  const [position, setPosition] = useState([60, 19]); // Default position

  // Geocoding logic to convert address to coordinates
  useEffect(() => {
    if (address) {
      // Use a geocoding service (e.g., OpenStreetMap Nominatim)
      fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`)
        .then((response) => response.json())
        .then((data) => {
          if (data && data.length > 0) {
            const { lat, lon } = data[0];
            setPosition([parseFloat(lat), parseFloat(lon)]);
            map.flyTo([lat, lon], 10); // Zoom to the location
          }
        })
        .catch((error) => console.error("Geocoding error:", error));
    }
  }, [address, map]);

  return (
    <Marker position={position}>
      <Popup>{address}</Popup>
    </Marker>
  );
}

export default GeoCoderMarker;