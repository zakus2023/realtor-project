import React, { useContext } from "react";
import "./Bookings.css";
import SearchBar from "../../Components/SearchBar/SearchBar";
import useProperties from "../../hooks/useProperties";
import { PuffLoader } from "react-spinners";
import PropertyCard from "../../Components/PropertyCard/PropertyCard";
import UserDetailsContext from "../../context/UserDetailsContext";
import { fetchUserDetails } from "../../utils/api";
import { useQuery } from "react-query";
import { useUser } from "@clerk/clerk-react";

function Bookings() {
  const { user } = useUser();
  const { data: properties, isError, isLoading } = useProperties();
  const {
    userDetails: { token },
  } = useContext(UserDetailsContext);

  const userEmail = user?.primaryEmailAddress?.emailAddress;

  const { data: userDetail, isLoading: userLoading } = useQuery(
    ["fetchUserDetails", userEmail],
    () => fetchUserDetails(userEmail, token),
    {
      enabled: !!userEmail && !!token,
    }
  );


  // Get all active bookings with proper null checks
  const activeBookings = userDetail?.data?.bookedVisit?.filter(
    (booking) =>
      booking?.bookingStatus === "active" && 
      booking?.visitStatus === "pending"
  ) || [];

  console.log("Active bookings:", activeBookings);

  // Convert all IDs to strings for consistent comparison
  const bookedPropertyIds = activeBookings.map((booking) => {
    const propertyId = booking?.propertyId;
    if (!propertyId) return null;
    
    // Handle both object and string ID cases
    return typeof propertyId === 'object' 
      ? propertyId._id?.toString() 
      : propertyId.toString();
  }).filter(Boolean); // Remove any null values

  console.log("Booked property IDs:", bookedPropertyIds);

  // Filter properties that match the booked property IDs
  const bookedProperties = properties?.filter((property) => 
    bookedPropertyIds.includes(property.id?.toString())
  );

  console.log("Filtered booked properties:", bookedProperties);

  if (isError) {
    return (
      <div className="wrapper">
        <span>Error Loading Listings</span>
      </div>
    );
  }

  if (isLoading || userLoading) {
    return (
      <div className="wrapper flexCenter" style={{ height: "60vh" }}>
        <PuffLoader height="80" width="80" radius={1} />
      </div>
    );
  }

  return (
    <div className="wrapper">
      <div className="flexColCenter paddings innerWidth listings-container">
        <SearchBar />
        <div className="flexCenter paddings booked-listings">
          {bookedProperties?.length > 0 ? (
            bookedProperties.map((card, i) => (
              <PropertyCard key={i} card={card} />
            ))
          ) : (
            <span>
              {activeBookings.length > 0 
                ? "Properties not found for your bookings" 
                : "No Active Bookings Found"
              }
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default Bookings;