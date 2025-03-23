import React, { useContext, useEffect } from "react"; // Import React and required hooks
import "./Layout.css"; // Import the CSS for layout styling
import Header from "../Components/Header/Header"; // Import Header component
import Footer from '../Components/footer/Footer'; // Note lowercase 'c'
import { Outlet } from "react-router-dom"; // React Router component for rendering child routes
import { useAuth0 } from "@auth0/auth0-react"; // Auth0 authentication hook for user authentication
import UserDetailsContext from "../context/UserDetailsContext"; // Context to manage user details globally
import { useMutation } from "react-query"; // React Query hook to handle API requests efficiently
import { createUser } from "../utils/api"; // API function to create/register a user in the backend

function Layout() {
  // Extract authentication-related functions and state from the Auth0 hook
  const { isAuthenticated, user, getAccessTokenWithPopup, loginWithPopup } = useAuth0();
  
  // Access user details context to update state globally
  const { setUserDetails } = useContext(UserDetailsContext);

  // Define a mutation for user creation using React Query
  const { mutate } = useMutation({
    mutationKey: [user?.email], // Ensures this mutation is uniquely identified by user email
    mutationFn: (token) => createUser(user?.email, token), // Calls backend API to create user with token
  });

  // useEffect runs whenever authentication status changes
  useEffect(() => {
    console.log("Checking authentication status...");

    // Function to obtain an access token and register user
    const getTokenAndRegister = async () => {
      try {
        console.log("Fetching access token...");
        
        // Ensure getAccessTokenWithPopup is available before calling
        if (!getAccessTokenWithPopup) {
          throw new Error("getAccessTokenWithPopup is undefined. Check Auth0 setup.");
        }

        // Request an access token from Auth0 to authorize API requests
        const token = await getAccessTokenWithPopup({
          authorizationParams: {
            audience: "http://localhost:5000", // API audience URL for authentication
            scope: "openid profile email", // Scopes define what user data can be accessed
          },
        });

        // Store the access token in local storage for future API requests
        localStorage.setItem("access_token", token);

        // Update global user context with the token, allowing other components to use it
        setUserDetails((prev) => ({ ...prev, token }));

        // Call mutation function to register user in backend
        // The token is passed to authenticate the API request
        mutate(token);
      } catch (error) {
        console.error("Error fetching access token:", error); // Log errors
      }
    };

    // If the user is authenticated, retrieve token and register user
    if (isAuthenticated) {
      getTokenAndRegister();
    } else {
      console.warn("User is not authenticated. Token request skipped."); // Log if user is not authenticated
    }
  }, [isAuthenticated, getAccessTokenWithPopup, setUserDetails]); // Dependencies for the effect hook

  return (
    <>
      <div style={{ background: "var(--black)", overflow: "hidden" }}>
        <Header /> {/* Render the Header component */}    
        <Outlet /> {/* Render nested routes dynamically */}
        <Footer /> {/* Render the Footer component */}
      </div>
    </>
  );
}

export default Layout;
