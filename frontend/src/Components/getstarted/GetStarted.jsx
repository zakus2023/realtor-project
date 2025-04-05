import React, { useContext, useEffect, useState } from "react";
import "./GetStarted.css";
import { useQuery, useQueryClient } from "react-query";
import { toast } from "react-toastify";
import { useAuth, useUser } from "@clerk/clerk-react";
import UserDetailsContext from "../../context/UserDetailsContext";
import { fetchSubscription } from "../../utils/api";

function GetStarted() {
  const queryClient = useQueryClient();
  const { userDetails } = useContext(UserDetailsContext);
  const { getToken } = useAuth();
  const { user } = useUser();
  const [token, setToken] = useState("");

  const [unsubscribeIsLoading, setUnsubscribeIsLoading] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const email = user?.primaryEmailAddress?.emailAddress;

  const { data: subscription, isLoading: isCheckingSubscription } = useQuery(
    ["subscription", email],
    () => fetchSubscription(email, token),
    {
      enabled: !!email && !!token,
      select: (data) => {
        if (!data) return { status: 'none' }; // No subscription exists
        if (data.unsubscribedAt) return { status: 'unsubscribed', data }; // Unsubscribed
        return { status: 'subscribed', data }; // Active subscription
      },
      onError: (error) => {
        console.error("Subscription check error:", error);
      }
    }
  );

  useEffect(() => {
    const getAuthToken = async () => {
      try {
        const authToken = await getToken();
        setToken(authToken);
      } catch (error) {
        console.error("Error getting token:", error);
      }
    };
    getAuthToken();
  }, [getToken]);

  const handleSubscribe = async () => {
    if (!token) {
      toast.error("Please login to subscribe!");
      return;
    }

    try {
      setSubscribing(true);
      const response = await fetch(`${VITE_BACKEND_BASE_URL}/api/user/subscribe`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        if (data.errorCode === "DUPLICATE_SUBSCRIPTION") {
          // Update UI to show as subscribed
          queryClient.setQueryData(["subscription", email], { 
            status: 'subscribed',
            data: { ...data, unsubscribedAt: null } 
          });
          return toast.info("You're already subscribed!");
        }
        throw new Error(data.message || "Subscription failed");
      }

      toast.success("Subscribed successfully!");
      queryClient.invalidateQueries(["subscription", email]);
    } catch (error) {
      console.error("Subscribe error:", error);
      toast.error(error.message);
    } finally {
      setSubscribing(false);
    }
  };

  const handleUnsubscribe = async () => {
    try {
      setUnsubscribeIsLoading(true);
      const response = await fetch(`${BACKEND_BASE_URL}/api/user/unsubscribe`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        if (data.errorCode === "SUBSCRIPTION_NOT_FOUND") {
          // Update UI to show as unsubscribed
          queryClient.setQueryData(["subscription", email], { 
            status: 'none' 
          });
          return toast.info("No active subscription found");
        }
        throw new Error(data.message || "Unsubscription failed");
      }

      toast.success("Unsubscribed successfully!");
      queryClient.invalidateQueries(["subscription", email]);
    } catch (error) {
      console.error("Unsubscribe error:", error);
      toast.error(error.message);
    } finally {
      setUnsubscribeIsLoading(false);
    }
  };

  if (isCheckingSubscription) {
    return (
      <section className="g-wrapper">
        <div className="paddings innerWidth g-container">
          <div className="flexColCenter inner-container">
            <span className="primaryText">Checking subscription status...</span>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="g-wrapper">
      <div className="paddings innerWidth g-container">
        <div className="flexColCenter inner-container">
          <span className="primaryText">Get Started with AetherSoft Realtors</span>
          <span className="secondaryText">
            Subscribe and find super attractive price quotes from us <br /> 
            Find your dream property now
          </span>
          
          {subscription?.status === 'subscribed' ? (
            <button
              className="button"
              onClick={handleUnsubscribe}
              disabled={unsubscribeIsLoading}
            >
              {unsubscribeIsLoading ? "Unsubscribing..." : "Unsubscribe"}
            </button>
          ) : (
            <button
              className="button"
              onClick={handleSubscribe}
              disabled={subscribing}
            >
              {subscribing ? "Subscribing..." : "Subscribe"}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

export default GetStarted;