import { Button, DatePicker, Modal, TimePicker } from "antd"; // Importing UI components from Ant Design
import React, { useContext, useState } from "react"; // Importing React hooks
import UserDetailsContext from "../../context/UserDetailsContext"; // Importing the UserDetailsContext
import { toast } from "react-toastify"; // Importing toast notifications
import dayjs from "dayjs"; // Importing Day.js for date formatting
import { useMutation } from "react-query"; // Importing useMutation from React Query
import { bookVisit } from "../../utils/api"; // Importing the bookVisit function

function BookingModal({ opened, setOpened, email, listingId }) {
  // State variables for date and time
  const [date, setDate] = useState(null);
  const [time, setTime] = useState(null);

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
          date: dayjs(date).format("DD/MM/YYYY"), // Formatting date before storing
          time: dayjs(time).format("HH:mm"), // Formatting time before storing
          visitStatus: "pending", // Default status
          bookingStatus: "active", // Add bookingStatus here
        },
      ],
    }));
  };

  // Using React Query's useMutation hook to handle booking API call
  const { mutate, isLoading } = useMutation({
    mutationFn: () =>
      bookVisit({ date, time, listingId, email, token }), // Calls the API function to book a visit
    onSuccess: () => handleBookingSuccess(), // Runs when the mutation is successful
    onError: ({ response }) => toast.error(response.data.message), // Shows an error message if the request fails
    onSettled: () => setOpened(false), // Closes the modal after the request is complete
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
          disabled={!date || !time || isLoading} // Disables button if no date/time is selected or request is in progress
          loading={isLoading} // Shows loading indicator when API call is in progress
          onClick={() => mutate()} // Calls the mutation function when button is clicked
        >
          Book visit
        </Button>,
      ]}
      centered // Centers the modal on the screen
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {/* Date Picker */}
        <DatePicker
          value={date} // Binds the selected date to the date picker
          onChange={(date) => setDate(date)} // Updates the state when the user selects a date
          disabledDate={(current) =>
            current && current < dayjs().startOf("day") // Disables past dates
          }
          style={{ width: "100%" }} // Full-width date picker
        />

        {/* Time Picker */}
        <TimePicker
          value={time} // Binds the selected time to the time picker
          onChange={(time) => setTime(time)} // Updates the state when the user selects a time
          format="HH:mm" // Time format (24-hour)
          style={{ width: "100%" }} // Full-width time picker
        />
      </div>
    </Modal>
  );
}

export default BookingModal; // Exports the component for use in other parts of the application