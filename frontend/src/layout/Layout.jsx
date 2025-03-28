import React, { useContext, useEffect, useRef } from "react";
import "./Layout.css";
import Header from "../Components/Header/Header";
import Footer from '../Components/footer/Footer';
import { Outlet } from "react-router-dom";
import { useUser, useAuth } from "@clerk/clerk-react";
import UserDetailsContext from "../context/UserDetailsContext";
import { useMutation } from "react-query";
import { createUser } from "../utils/api";

function Layout() {
  const { isLoaded, isSignedIn, user } = useUser();
  const { getToken } = useAuth();
  const { setUserDetails } = useContext(UserDetailsContext);
  const mountedRef = useRef(true);

  const { mutate } = useMutation({
    mutationKey: [user?.id],
    mutationFn: async (token) => {
      if (!mountedRef.current) return;
      return createUser({
        email: user?.primaryEmailAddress?.emailAddress,
        clerkId: user?.id,
        name: `${user?.firstName} ${user?.lastName}`,
        image: user?.profileImageUrl
      }, token);
    }
  });

  useEffect(() => {
    const handleAuth = async () => {
      if (mountedRef.current && isLoaded && isSignedIn && user) {
        try {
          const token = await getToken();
          
          setUserDetails(prev => ({
            ...prev,
            token,
            user: {
              id: user.id,
              email: user.primaryEmailAddress?.emailAddress,
              name: `${user.firstName} ${user.lastName}`,
              image: user.profileImageUrl
            }
          }));

          mutate(token);
        } catch (error) {
          console.error("Auth error:", error);
        }
      }
    };

    handleAuth();
    return () => {
      mountedRef.current = false;
    };
  }, [isLoaded, isSignedIn, user, getToken, setUserDetails]);

  return (
    <div style={{ background: "var(--black)", overflow: "hidden" }}>
      <Header />
      <Outlet />
      <Footer />
    </div>
  );
}

export default Layout;