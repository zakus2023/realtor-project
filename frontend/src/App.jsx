import React, { Suspense, useState, useEffect } from "react";
import "./App.css";
import Entry from "./pages/Entry";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useNavigate,
} from "react-router-dom";
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
import UserListings from "./pages/AllUserProperties/UserListings";
import AllBookings from "./pages/AllBookings/AllBookings";
import AllUsers from "./pages/users/AllUsers";
import Login from "./hooks/clerkLogin/Login";
import Register from "./hooks/clerkSignUp/Register";
import { ClerkProvider } from "@clerk/clerk-react";
import { useAuth } from "@clerk/clerk-react";
import StripePaymentSuccess from "./pages/StripePaymentSuccess";
import StripePaymentCancel from "./pages/StripePaymentCancel";

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
if (!PUBLISHABLE_KEY) {
  throw new Error("Missing Publishable Key");
}

const queryClient = new QueryClient();

const ClerkProviderWithRoutes = ({ children }) => {
  const navigate = useNavigate();
  return (
    <ClerkProvider
      publishableKey={PUBLISHABLE_KEY}
      navigate={(to) => navigate(to)}
      signInUrl="/login"
      signUpUrl="/register"
      afterSignInUrl="/"
      afterSignUpUrl="/"
    >
      {children}
    </ClerkProvider>
  );
};

const UserDetailsProvider = ({ children }) => {
  const { getToken } = useAuth();
  const [userDetails, setUserDetails] = useState({
    favourites: [],
    bookings: [],
    token: null,
    loading: true,
  });

  useEffect(() => {
    const fetchToken = async () => {
      try {
        const token = await getToken();
        setUserDetails((prev) => ({
          ...prev,
          token,
          loading: false,
        }));
      } catch (error) {
        console.error("Token fetch error:", error);
        setUserDetails((prev) => ({ ...prev, loading: false }));
      }
    };

    fetchToken();
  }, [getToken]);

  return (
    <UserDetailsContext.Provider value={{ userDetails, setUserDetails }}>
      {children}
    </UserDetailsContext.Provider>
  );
};

function App() {
  return (
    <Router>
      <QueryClientProvider client={queryClient}>
        <ClerkProviderWithRoutes>
          <UserDetailsProvider>
            <Suspense
              fallback={<div className="loading-screen">Loading...</div>}
            >
              <Routes>
                <Route path="/" element={<Layout />}>
                  <Route index element={<Entry />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/listings" element={<Listings />} />
                  <Route path="/listing/:id" element={<Listing />} />
                  <Route path="/userBookings" element={<Bookings />} />
                  <Route path="/favourites" element={<Favourites />} />
                  <Route path="/mylistings" element={<UserListings />} />
                  <Route path="/allbookings" element={<AllBookings />} />
                  <Route path="/allusers" element={<AllUsers />} />
                  <Route
                    path="/stripe-payment-success"
                    element={<StripePaymentSuccess />}
                  />
                  <Route
                    path="/stripe-payment-cancel"
                    element={<StripePaymentCancel />}
                  />
                  {/* <Route path="/mysettings" element={<MySettings />} /> */}
                </Route>
              </Routes>
            </Suspense>
            <ToastContainer
              position="bottom-right"
              autoClose={5000}
              hideProgressBar={false}
              newestOnTop={false}
              closeOnClick
              rtl={false}
              pauseOnFocusLoss
              draggable
              pauseOnHover
            />
            <ReactQueryDevtools initialIsOpen={false} />
          </UserDetailsProvider>
        </ClerkProviderWithRoutes>
      </QueryClientProvider>
    </Router>
  );
}

export default App;
