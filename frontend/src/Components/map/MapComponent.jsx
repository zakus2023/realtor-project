import React from "react";
import { GoogleMap, Marker, useLoadScript } from "@react-google-maps/api";

// Map container style
const mapContainerStyle = {
  width: "100%",
  height: "40vh",
  background: "red", // Optional: Add a background color for debugging
};

// Center of the map
const center = {
  lat: 6.8814698, // Latitude
  lng: -1.3919261, // Longitude
};

// Map options
const options = {
  disableDefaultUI: false, // Disable default UI controls
  zoomControl: true, // Enable zoom control
};

const MapComponent = ({ city }) => {
  console.log(city);
  // Load the Google Maps script
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.GOOGLE_MAPS_API_KEY, // Replace with your API key
  });

  // Handle loading errors
  if (loadError) return <div>Error loading maps</div>;
  if (!isLoaded) return <div>Loading Maps...</div>;

  return (
    <GoogleMap
      mapContainerStyle={mapContainerStyle}
      zoom={15} // Initial zoom level
      center={center} // Initial center
      options={options} // Map options
    >
      {/* Single marker at the center */}
      <Marker
       position={center}
        label={city}
        icon={{
          url: "https://maps.google.com/mapfiles/ms/icons/red-dot.png", // Custom icon URL
          scaledSize: new window.google.maps.Size(40, 40), // Resize the icon
        }}
      />
    </GoogleMap>
  );
};

export default MapComponent;