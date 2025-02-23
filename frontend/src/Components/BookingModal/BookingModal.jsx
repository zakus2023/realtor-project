import { Button, DatePicker, Modal } from "antd"; // Importing UI components from Ant Design for modal, date picker, and button
import React, { useContext, useState } from "react"; // Importing React hooks: useContext for accessing context, useState for managing local state
import UserDetailsContext from "../../context/UserDetailsContext"; // Importing the UserDetailsContext to manage user details globally
import { toast } from "react-toastify"; // Importing toast notifications for user feedback
import dayjs from "dayjs"; // Importing Day.js for date formatting
import { useMutation } from "react-query"; // Importing useMutation from React Query for handling asynchronous API calls efficiently
import { bookVisit } from "../../utils/api"; // Importing the bookVisit function from API utilities

function BookingModal({ opened, setOpened, email, listingId }) {
  // Declaring a state variable to store the selected date
  const [value, setValue] = useState(null);

  // Extracting user token and setUserDetails function from the global user context
  const {
    userDetails: { token },
    setUserDetails,
  } = useContext(UserDetailsContext);

  // Function to handle successful booking
  const handleBookingSuccess = () => {
    toast.success("You have booked your visit", {
      position: "bottom-right", // Notification appears at the bottom-right corner
    });

    // Updating the user's booking list in global state
    setUserDetails((prev) => ({
      ...prev,
      bookings: [
        ...prev.bookings,
        {
          id: listingId,
          date: dayjs(value).format("DD/MM/YYYY"), // Formatting date before storing
        },
      ],
    }));
  };

  // Using React Query's useMutation hook to handle booking API call
  const { mutate, isLoading } = useMutation({
    mutationFn: () => bookVisit(value, listingId, email, token), // Calls the API function to book a visit
    onSuccess: () => handleBookingSuccess(), // Runs when the mutation is successful
    onError: ({ response }) => toast.error(response.data.message), // Shows an error message if the request fails
    onSettled: () => setOpened(false), // Closes the modal after the request is complete (whether successful or not)
  });

  return (
    <Modal
      open={opened} // Controls whether the modal is open or closed
      onCancel={() => setOpened(false)} // Closes modal when cancel button is clicked
      title="Book your visit" // Modal title
      footer={[
        <Button
          key="submit"
          type="primary" // Primary button style
          disabled={!value || isLoading} // Disables button if no date is selected or request is in progress
          loading={isLoading} // Shows loading indicator when API call is in progress
          onClick={() => mutate()} // Calls the mutation function when button is clicked
        >
          Book visit
        </Button>,
      ]}
      centered // Centers the modal on the screen
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <DatePicker
          value={value} // Binds the selected date to the date picker
          onChange={(date) => setValue(date)} // Updates the state when the user selects a date
          disabledDate={
            (current) => current && current < dayjs().startOf("day") // Disables past dates
          }
        />
      </div>
    </Modal>
  );
}

export default BookingModal; // Exports the component for use in other parts of the application
