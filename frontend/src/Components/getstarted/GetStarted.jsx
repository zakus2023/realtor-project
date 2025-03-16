import React, { useContext, useState } from "react";
import "./GetStarted.css";
import { useAuth0 } from "@auth0/auth0-react";
import UserDetailsContext from "../../context/UserDetailsContext";
import { useQuery, useQueryClient } from "react-query"; // Import useQueryClient
import { fetchSubscription } from "../../utils/api";
import { toast } from "react-toastify";

function GetStarted() {
  const queryClient = useQueryClient(); // Initialize the query client

  const { userDetails } = useContext(UserDetailsContext);
  const token = userDetails?.token;
  const { user } = useAuth0();

  const [unsubscribeIsLoading, setUnsubscribeIsLoading] = useState(false);
  const [subscribing, setSubscribing] = useState(false);

  const email = user?.email;

  const [subscribed, setSubscribed] = useState(false);
  const [error, setError] = useState("");

  // Fetch subscriptions
  const { data, isLoading, isError } = useQuery(
    ["getSubscription", user?.email],
    () => fetchSubscription(user?.email, token),
    {
      enabled: !!user?.email && !!token,
      onSuccess: (data) => {
        console.log("Subscription data:", data); // Log the data
        setSubscribed(!!data); // Update subscribed state based on data
      },
      onError: () => {
        return;
      },
    }
  );
  console.log("Data: ", data);

  // Function to handle unsubscribe
  const handleUnsubscribe = async () => {
    try {
      setUnsubscribeIsLoading(true); // Set loading state to true

      const response = await fetch(
        "http://localhost:5000/api/user/unsubscribe",
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ email }),
        }
      );

      if (response.ok) {
        // Unsubscribe successful
        setUnsubscribeIsLoading(false); // Set loading state to false
        setSubscribed(false); // Update subscribed state to false
        toast.success("You have unsubscribed successfully!");

        // Invalidate the query to refetch subscription status
        queryClient.invalidateQueries(["getSubscription", email]);
        console.log("Query invalidated for:", email); // Log query invalidation
      } else {
        // Handle non-OK responses (e.g., 400, 404, 500)
        const data = await response.json();
        toast.error(
          data.error || "Failed to unsubscribe. Please try again later."
        );
      }
    } catch (error) {
      // Handle network or other errors
      setUnsubscribeIsLoading(false); // Set loading state to false
      console.error("Error:", error);
      toast.error("An error occurred. Please try again later.");
    }
  };

  // Function to handle subscribe
  const handleSubscribe = async () => {
    if (!token) {
      toast.error("Please you must login to subscribe!");
      return;
    }
    try {
      setSubscribing(true); // Set subscribing state to true
      const response = await fetch("http://localhost:5000/api/user/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        toast.success("You have subscribed successfully!");
        setSubscribed(true); // Update subscribed state to true
      } else {
        const data = await response.json();
        setError(data.error || "Failed to subscribe. Please try again later.");
      }
    } catch (error) {
      console.error("Error:", error);
      setError("An error occurred. Please try again later.");
    } finally {
      setSubscribing(false); // Reset subscribing state
    }
  };

  return (
    <section className="g-wrapper">
      <div className="paddings innerWidth g-container">
        <div className="flexColCenter inner-container">
          <span className="primaryText">
            Get Started with AetherSoft Realtors
          </span>
          <span className="secondaryText">
            Subscribe and find super attractive price quotes from us <br /> Find
            your dream property now
          </span>
          {subscribed && data?.email ? (
            <button
              className="button"
              onClick={handleUnsubscribe}
              disabled={unsubscribeIsLoading}
            >
              {unsubscribeIsLoading ? (
                <span>Unsubscribing ...</span>
              ) : (
                <span>Unsubscribe</span>
              )}
            </button>
          ) : (
            <button
              className="button"
              onClick={handleSubscribe}
              disabled={subscribing}
            >
              {subscribing ? (
                <span>Subscribing...</span>
              ) : (
                <span>Subscribe</span>
              )}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

export default GetStarted;
