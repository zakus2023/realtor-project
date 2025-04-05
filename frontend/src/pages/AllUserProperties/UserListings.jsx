import React, { useContext, useEffect, useState } from "react";
import "./UserListings.css";
import SearchBar from "../../Components/SearchBar/SearchBar";
import { PuffLoader } from "react-spinners";
import PropertyCard from "../../Components/PropertyCard/PropertyCard";
import { useQuery } from "react-query";
import { fetchAllUsersProperty } from "../../utils/api";
import UserDetailsContext from "../../context/UserDetailsContext";
import { toast } from "react-toastify";
import { useAuth, useUser } from "@clerk/clerk-react";

function UserListings() {
  const { userDetails } = useContext(UserDetailsContext);
  const [token, setToken] = useState(null);
  const { getToken } = useAuth();
  const { user } = useUser();
  const [filter, setFilter] = useState("");

  useEffect(() => {
    const fetchToken = async () => {
      const token = await getToken();
      setToken(token);
    };
    fetchToken()
  }, [getToken]);

  const {
    data: userListings,
    isLoading,
    isError,
  } = useQuery(
    ["fetchAllUserListings", user?.primaryEmailAddress?.emailAddress],
    () => fetchAllUsersProperty(user?.primaryEmailAddress?.emailAddress, token),
    {
      enabled: !!user?.primaryEmailAddress?.emailAddress && !!token, // Only run the query if user email exists
      onError: (error) => {
        toast.error("Failed to fetch user listings");
        console.error("Error fetching user listings:", error);
      },
    }
  );

  // Handle loading state
  if (isLoading) {
    return (
      <div className="wrapper flexCenter" style={{ height: "60vh" }}>
        <PuffLoader color="#4066ff" size={80} />
      </div>
    );
  }

  // Handle error state
  if (isError) {
    return (
      <div className="wrapper flexCenter" style={{ height: "60vh" }}>
        <span>Error while fetching listings. Please try again later.</span>
      </div>
    );
  }

  // Handle empty state
  if (!userListings || userListings.length === 0) {
    return (
      <div className="wrapper flexCenter" style={{ height: "60vh" }}>
        <span>No listings found for the current user.</span>
      </div>
    );
  }

  return (
    <div className="wrapper">
      <div className="flexColCenter paddings innerWidth listings-container">
        <SearchBar filter={filter} setFilter={setFilter} />
        <div className="paddings flexCenter listings">
          {userListings
            .filter(
              (listing) =>
                listing.title.toLowerCase().includes(filter.toLowerCase()) ||
                listing.city.toLowerCase().includes(filter.toLowerCase()) ||
                listing.country.toLowerCase().includes(filter.toLowerCase())
            )
            .map((card, i) => (
              <PropertyCard key={i} card={card} />
            ))}
        </div>
      </div>
    </div>
  );
}

export default UserListings;
