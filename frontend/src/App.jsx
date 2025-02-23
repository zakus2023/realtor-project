import React, { Suspense, useState, useEffect } from "react";
import "./App.css";
import Entry from "./pages/Entry";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "./layout/Layout";
import Listings from "./pages/Listings/Listings";
import { QueryClient, QueryClientProvider } from "react-query";
import { ReactQueryDevtools } from "react-query/devtools";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Listing from "./pages/listing/Listing";
import UserDetailsContext from "./context/UserDetailsContext";
import Bookings from "./Components/Bookings/Bookings";
import Favourites from "./Components/Favourites/Favourites";

const queryClient = new QueryClient(); // Moved outside to prevent re-creation on each render

function App() {
  const [userDetails, setUserDetails] = useState(() => {
    try {
      const storedDetails = localStorage.getItem("userDetails");
      return storedDetails
        ? JSON.parse(storedDetails)
        : { favourites: [], bookings: [], token: null };
    } catch (error) {
      console.error("Error parsing userDetails from localStorage:", error);
      return { favourites: [], bookings: [], token: null };
    }
  });

  useEffect(() => {
    // Only update localStorage if userDetails actually changed
    const storedDetails = localStorage.getItem("userDetails");
    if (JSON.stringify(userDetails) !== storedDetails) {
      localStorage.setItem("userDetails", JSON.stringify(userDetails));
    }
  }, [userDetails]);

  return (
    <UserDetailsContext.Provider value={{ userDetails, setUserDetails }}>
      <QueryClientProvider client={queryClient}>
        <Router>
          <Suspense fallback={<div>Loading ...</div>}>
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<Entry />} />
                <Route path="/listings" element={<Listings />} />
                <Route path="/listing/:id" element={<Listing />} />
                <Route path="/userBookings" element={<Bookings/>}/>
                <Route path="/favourites" element={<Favourites/>}/>
              </Route>
            </Routes>
          </Suspense>
        </Router>
        <ToastContainer />
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </UserDetailsContext.Provider>
  );
}

export default App;
