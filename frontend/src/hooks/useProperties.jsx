import { useQuery } from "react-query";
import { getAllProperties } from "../utils/api";


function useProperties() {
  // Destructure the return values from useQuery
  const { data, isError, isLoading, refetch } = useQuery(
    ["allProperties"], // Unique key for the query
    getAllProperties, // Function that fetches the data
    { refetchOnWindowFocus: false } // Configuration options
  );

  // Return the relevant data and functions
  return {
    data,      // The fetched data
    isLoading, // Boolean indicating if the query is loading
    isError,   // Boolean indicating if there was an error
    refetch,   // Function to manually refetch the data
  };
}

export default useProperties;
