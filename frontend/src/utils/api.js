import axios from "axios"; // Import Axios for making HTTP requests
import dayjs from "dayjs"; // Import Day.js for date/time manipulation (not used here but can be useful)
import { toast } from "react-toastify"; // Import toast notifications for error handling and user feedback

// Create an Axios instance with a base URL for API requests
export const api = axios.create({
  baseURL: "http://localhost:5000", // Base URL for backend API requests
});




// fetch user details
export const fetchUserDetails = async (email, token) => {
  try {
    const response = await api.get(`/api/user/userDetails/${email}`, {
      headers: {
        Authorization: `Bearer ${token}`, // Correct headers format
      },
    });

    return response.data; // Axios automatically throws on errors
  } catch (error) {
    toast.error("Something went wrong!"); // Show error notification to the user
    throw error; // Rethrow the error for handling elsewhere
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
export const createUser = async (email, token) => {
  try {
    // Make a POST request to register a user with their email
    api.post(
      "/api/user/register",
      {
        email, // Send email in the request body
      },
      {
        headers: {
          Authorization: `Bearer ${token}`, // Include the token for authentication
        },
      }
    );
  } catch (error) {
    toast.error("Something went wrong"); // Show an error notification
    throw error; // Rethrow the error for further handling
  }
};

// book a visit

export const bookVisit = async (value, listingId, email, token) => {
  const date = value;
  try {
    await api.post(
      `/api/user/bookVisit/${listingId}`,
      {
        email,
        id: listingId,
        date: dayjs(date).format("DD/MM/YYYY"),
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
  } catch (error) {
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

// // fetch all favourites
// export const getUserFavourites = async (email, token) => {
//   try {
//     const response = await api.get(
//       `/api/user//fetchUserfavourites`,
//       { email },
//       {
//         headers: {
//           Authorization: `Bearer ${token}`, // Correct headers format
//         },
//       }
//     );

//     return response.data; // Axios automatically throws on errors
//   } catch (error) {
//     toast.error("Something went wrong!"); // Show error notification to the user
//     throw error; // Rethrow the error for handling elsewhere
//   }
// };

// // fetch all bookings for a user

// export const getUserBookings = async (email, token) => {
//   try {
//     const response = await api.get(
//       `/api/user//fetchUserfavourites`,
//       { email },
//       {
//         headers: {
//           Authorization: `Bearer ${token}`, // Correct headers format
//         },
//       }
//     );

//     return response.data; // Axios automatically throws on errors
//   } catch (error) {
//     toast.error("Something went wrong!"); // Show error notification to the user
//     throw error; // Rethrow the error for handling elsewhere
//   }
// };


// add property
export const addPropertyApiCallFunction = async ({ payload, email, token }) => {
  try {
    // Add email to the payload
    payload.email = email;

    const response = await api.post("/api/residence/addProperty", payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json", // Send as JSON
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