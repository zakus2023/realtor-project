import React, { useContext } from "react";
import "./Favourites.css";
import SearchBar from "../../Components/SearchBar/SearchBar";
import useProperties from "../../hooks/useProperties";
import { PuffLoader } from "react-spinners";
import PropertyCard from "../../Components/PropertyCard/PropertyCard";
import UserDetailsContext from "../../context/UserDetailsContext";
import { fetchUserDetails } from "../../utils/api";
import { useQuery } from "react-query";
import { useUser } from "@clerk/clerk-react";

function Favourites() {
  const { user } = useUser();
  const { data: properties, isError, isLoading } = useProperties();
  const { userDetails: { token } } = useContext(UserDetailsContext);

  // Fetch user details with proper query key
  const { data: userDetail } = useQuery(
    ["fetchUserDetails", user?.primaryEmailAddress?.emailAddress, token],
    () => fetchUserDetails(user?.primaryEmailAddress?.emailAddress, token),
    {
      enabled: !!user?.primaryEmailAddress?.emailAddress && !!token,
    }
  );

  // Convert IDs to strings safely
  const favoriteIDs = userDetail?.data?.favResidenciesID?.map(favorite => 
    typeof favorite === 'object' ? favorite._id.toString() : favorite
  ) || [];

  // Filter properties with null checks
  const favouriteProperties = properties?.filter(property => 
    favoriteIDs.includes(property._id.toString())
  ) || [];

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
        <PuffLoader height="80" width="80" radius={1} />
      </div>
    );
  }

  return (
    <div className="wrapper">
      <div className="flexColCenter paddings innerWidth listings-container">
        <SearchBar />
        <div className="paddings flexCenter fav-listings">
          {favouriteProperties.length > 0 ? (
            favouriteProperties.map((card, i) => (
              <PropertyCard key={i} card={card} />
            ))
          ) : (
            <span>No Favourites Found</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default Favourites;