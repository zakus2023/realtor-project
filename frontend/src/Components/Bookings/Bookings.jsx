import React, { useContext } from "react";
import "./Bookings.css";
import SearchBar from "../../Components/SearchBar/SearchBar";
import useProperties from "../../hooks/useProperties";
import { PuffLoader } from "react-spinners";
import PropertyCard from "../../Components/PropertyCard/PropertyCard";
import UserDetailsContext from "../../context/UserDetailsContext";
import { fetchUserDetails } from "../../utils/api";
import { useAuth0 } from "@auth0/auth0-react";
import { useQuery } from "react-query";

function Bookings() {
  // Get the user info from Auth0
  const { user } = useAuth0();

  // Fetch the properties from useProperties hook
  const { data: properties, isError, isLoading } = useProperties();

  // Get the userDetails from the useContext (UserDetailsContext)
  const {
    userDetails: { token },
  } = useContext(UserDetailsContext);

  // Fetch the user information
  const { data: userDetail } = useQuery(
    ["fetchUserDetails", user?.email],
    () => fetchUserDetails(user?.email, token),
    {
      enabled: !!user?.email && !!token, // Only run the query if user email exists
    }
  );

  // Filter properties based on the listing IDs in the bookings
  const bookedProperties = properties?.filter((property) =>
    userDetail?.bookedVisit?.some(
      (booking) =>
        booking.propertyId === property.id &&
        booking.visitStatus === "pending" &&
        booking.bookingStatus === "active"
    )
  );

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
        <div className="flexCenter paddings booked-listings">
          {bookedProperties?.length > 0 ? (
            bookedProperties.map((card, i) => (
              <PropertyCard key={i} card={card} />
            ))
          ) : (
            <span>No Bookings Found</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default Bookings;
