import { useUser } from "@clerk/clerk-react";
import axios from "axios"; // Import Axios for making HTTP requests
import dayjs from "dayjs"; // Import Day.js for date/time manipulation (not used here but can be useful)
import { toast } from "react-toastify"; // Import toast notifications for error handling and user feedback

// Create an Axios instance with a base URL for API requests
export const api = axios.create({
  baseURL: "http://localhost:5000", // Base URL for backend API requests
});

// fetch user details
// Update your fetchUserDetails to handle token properly
export const fetchUserDetails = async (email, token) => {
  try {
    if (!token) throw new Error("No authentication token");
    
    const response = await api.get(`/api/user/userDetails/${email}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    
    return response.data;
  } catch (error) {
    console.error("Fetch error:", error);
    throw new Error(error.message || "Failed to fetch user details");
  }
};

// Function to fetch all property listings from the backend
export const getAllProperties = async () => {
  try {
    // Make a GET request to retrieve all properties
    const response = await api.get("/api/residence/fetchResidencies", {
      timeout: 10 * 1000, // Set a timeout of 10 seconds for the request
    });

    // Check if the response has a bad status code and throw an error if so
    if (response.status === 400 || response.status === 500) {
      throw response.data;
    }

    return response.data; // Return the response data if successful
  } catch (error) {
    toast.error("Something went wrong!"); // Show error notification to the user
    throw error; // Rethrow the error for further handling
  }
};

// Function to fetch a single property listing by ID
export const getListing = async (id) => {
  try {
    // Make a GET request to fetch a specific listing using its ID
    const response = await api.get(`/api/residence/fetchResidence/${id}`, {
      timeout: 10 * 1000, // Set a timeout of 10 seconds
    });

    // Check if response status is an error and throw if necessary
    if (response.status === 400 || response.status === 500) {
      throw response.data;
    }

    return response.data; // Return the listing details if successful
  } catch (error) {
    toast.error("Something went wrong!"); // Show error notification to the user
    throw error; // Rethrow the error for handling elsewhere
  }
};

// Function to create/register a user in the backend
export const createUser = async (userData, token) => {
  try {
    const response = await api.post(
      "/api/user/register",
      {
        email: userData.email,
        clerkId: userData.clerkId,
        name: userData.name,
        image: userData.image
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    toast.error("Something went wrong");
    throw error;
  }
};
// book a visit

export const bookVisit = async ({
  date,
  time,
  listingId,
  email,
  token,
  paymentMethod,
  paymentStatus,
  paymentReference, // Include payment reference
}) => {
  try {
    const response = await api.post(
      `/api/user/bookVisit/${listingId}`,
      {
        email,
        id: listingId,
        date: dayjs(date).format("YYYY-MM-DD"),
        time: dayjs(time).format("HH:mm"),
        visitStatus: "pending",
        paymentStatus,
        paymentMethod,
        paymentReference, // Pass payment reference for Paystack
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (response.status === 200) {
      return response;
    } else {
      throw new Error("Failed to book visit");
    }
  } catch (error) {
    console.error("Booking error:", error);
    throw error;
  }
};

// cancel Booking
export const cancelBooking = async (id, email, token) => {
  try {
    const response = api.post(
      `/api/user/cancelBooking/${id}`,
      {
        email,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
  } catch (error) {
    toast.error("Something went wrong");
    throw error;
  }
};

// Like or favourite

export const addToFavourites = async (resId, email, token) => {
  try {
    if (!email || !token) {
      toast.error("User authentication is required to add favourites");
      return;
    }
    const response = await api.post(
      `/api/user/addFavourites/${resId}`,
      { email },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    toast.success(response.data?.message, { position: "bottom-right" });
    return response.data; // Return the response data
  } catch (error) {
    toast.error("Error adding to favourites");
    console.error("Error in addToFavourites:", error);
    throw error;
  }
};

// add property
export const addPropertyApiCallFunction = async ({ payload, email, token }) => {
  try {
    const formData = new FormData();

    // Add all payload fields including clerkUserId
    for (const key in payload) {
      if (key === "facilities") {
        // Ensure facilities is properly stringified
        formData.append(key, JSON.stringify(payload[key]));
      } else if (key === "images" || key === "documentations") {
        payload[key].forEach((file) => {
          if (file.originFileObj) {
            formData.append(key, file.originFileObj);
          }
        });
      } else {
        formData.append(key, payload[key]);
      }
    }

    // Add email and imagesCount
    formData.append("email", email);
    formData.append("imagesCount", payload.imagesCount);

    const response = await api.post("/api/residence/addProperty", formData, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "multipart/form-data",
      },
    });

    toast.success("Property added successfully!");
    return response.data;
  } catch (error) {
    console.error("Error adding property:", error);
    toast.error(error.response?.data?.message || "Failed to add property");
    throw error;
  }
};

// =============================================================================

// edit property
export const editPropertyApiCallFunction = async ({
  id,
  payload,
  email,
  token,
}) => {
  try {
    const formData = new FormData();

    // Handle existing files
    const existingImages = payload.images
      .filter(img => typeof img === 'string' || img.url)
      .map(img => typeof img === 'string' ? img : img.url);
    const existingDocs = payload.documentations
      .filter(doc => typeof doc === 'string' || doc.url)
      .map(doc => typeof doc === 'string' ? doc : doc.url);

    formData.append('existingImages', JSON.stringify(existingImages));
    formData.append('existingDocs', JSON.stringify(existingDocs));
    formData.append('imagesCount', existingImages.length);

    // Handle new file uploads and other fields
    for (const key in payload) {
      if (key === "facilities") {
        // Ensure facilities is properly stringified
        formData.append(key, JSON.stringify(payload[key]));
      } else if (key === "images" || key === "documentations") {
        payload[key].forEach((file) => {
          if (file.originFileObj) {
            formData.append(key, file.originFileObj);
          }
        });
      } else if (key !== 'images' && key !== 'documentations') {
        formData.append(key, payload[key]);
      }
    }

    formData.append("email", email);
    formData.append("clerkUserId", payload.clerkUserId);

    const response = await api.put(
      `/api/residence/editProperty/${id}`,
      formData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      }
    );

    toast.success("Property updated successfully!");
    return response.data;
  } catch (error) {
    console.error("Error updating property:", error);
    toast.error(error.response?.data?.message || "Failed to update property");
    throw error;
  }
};

// fetch all current user properties
export const fetchAllUsersProperty = async (email, token) => {
  console.log("User from api: ", email, "token from api: ", token);

  try {
    const response = await api.get("/api/residence/getAllUserProperties", {
      params: { email }, // Send email as a query parameter
      headers: {
        Authorization: `Bearer ${token}`, // Include the token in the headers
      },
      timeout: 10 * 1000, // Set a timeout of 10 seconds
    });

    if (response.status === 400 || response.status === 500) {
      throw response.data;
    }

    return response.data;
  } catch (error) {
    toast.error("Something went wrong");
    throw error;
  }
};

// Function to fetch all bookings
export const fetchAllBookings = async (token) => {
  console.log(token);
  try {
    const response = await api.get("/api/user/fetchAllBookings", {
      headers: {
        Authorization: `Bearer ${token}`, // Include the token for authentication
      },
    });

    if (response.status === 200) {
      return response.data.bookings; // Return the list of bookings
    }

    throw new Error("Failed to fetch bookings");
  } catch (error) {
    console.error("Error fetching bookings:", error);
    throw error;
  }
};

// Function to fetch all users (with role check)
export const fetchAllUsers = async (email, role, token) => {
  try {
    // Make a GET request to fetch all users
    const response = await api.get(`/api/user/fetchAllUsers/${role}`, {
      params: { email }, // Send the user's email as a query parameter
      headers: {
        Authorization: `Bearer ${token}`, // Include the token for authentication
      },
      timeout: 10 * 1000, // Set a timeout of 10 seconds
    });

    // Check if the response has a bad status code and throw an error if so
    if (response.status === 400 || response.status === 500) {
      throw response.data;
    }

    // Check if the response indicates unauthorized access
    if (
      response.data.message === "Unauthorized: Only admins can fetch all users"
    ) {
      toast.error("You do not have permission to fetch all users.");
      throw new Error("Unauthorized: Only admins can fetch all users");
    }

    // Return the list of users if successful
    return response.data;
  } catch (error) {
    // Handle errors and show appropriate toast notifications
    if (error.response && error.response.status === 403) {
      toast.error("You do not have permission to fetch all users.");
    } else {
      toast.error("Something went wrong while fetching users!");
    }
    throw error; // Rethrow the error for further handling
  }
};

// =========================================================

// Function to edit user details

export const editUserDetails = async (email, updatedData, token) => {
  try {
    // Pre-process the data before sending
    const cleanData = Object.fromEntries(
      Object.entries(updatedData || {})
        .map(([key, value]) => [
          key,
          typeof value === 'string' && value.trim() === '' ? undefined : value
        ])
        .filter(([_, value]) => value !== undefined)
    );

    const response = await api.put(
      `/api/user/editUserDetails/${encodeURIComponent(email)}`,
      cleanData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error('Error updating user details:', error);
    throw error;
  }
};

// fetch a single subscription

export const fetchSubscription = async (email, token) => {
  const response = await api.get("/api/user/getSubscription", {
    params: { email }, // Pass email as a query parameter
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
};

// fetch all subscriptions
export const fetchAllSubscriptions = async (token) => {
  try {
    const response = await api.get("/api/user/fetchAllSubscriptions", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    toast.error("Failed to load subscriptions");
    throw error;
  }
};

export const updateVisitStatusFromAdmin = async (
  userEmail,
  bookingId,
  visitStatus,
  token
) => {

  try {
    const response = await api.put(
      `/api/user/${userEmail}/bookings/${bookingId}`,
      { visitStatus }, // Request body
      {
        headers: {
          Authorization: `Bearer ${token}`, // Headers
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error updating booking status:", error.response?.data || error.message);
    toast.error("Failed to update user bookings"); // Show error notification
    throw error; // Rethrow the error for further handling
  }
};