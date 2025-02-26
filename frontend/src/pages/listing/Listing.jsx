import React, { useContext, useState } from "react"; // Import useState
import "./Listing.css";
import { useMutation, useQuery } from "react-query";
import { useParams } from "react-router-dom";
import { cancelBooking, fetchUserDetails, getListing } from "../../utils/api";
import { PuffLoader } from "react-spinners";
import { AiFillHeart } from "react-icons/ai";
import { FaBed, FaCar, FaShower } from "react-icons/fa";
import { MdAddLocation, MdMap } from "react-icons/md";
import PropertyImages from "../../Components/PropertyImages/PropertyImages";
import { Swiper, SwiperSlide, useSwiper } from "swiper/react";
import "swiper/css";
import { sliderSettings } from "../../utils/common";
import Map from "../../Components/map/Map";
import useAuthCheck from "../../hooks/useAuthCheck";
import { useAuth0 } from "@auth0/auth0-react";
import BookingModal from "../../Components/BookingModal/BookingModal";
import UserDetailsContext from "../../context/UserDetailsContext";
import { Button } from "antd";
import { toast } from "react-toastify";
import LikeButton from "../../Components/LikeButton/LikeButton.";

function Listing() {
  const { user } = useAuth0();
  const { id } = useParams();
  const { data, isError, isLoading } = useQuery(["listing", id], () =>
    getListing(id)
  );
  console.log(data)

  // State to track the selected image
  const [selectedImage, setSelectedImage] = useState(data?.images[0]);

  const [modalOpened, setModalOpened] = useState(false);
  const { validateLogin } = useAuthCheck();

  // state for updating userDetails context
  const {
    userDetails: { token, bookings },
    setUserDetails,
  } = useContext(UserDetailsContext);

  // fetch single user

  const { data: userDetail } = useQuery(
    ["fetchUserDetails", user?.email],
    () => fetchUserDetails(user?.email, token),
    {
      enabled: !!user?.email && !!token, // Only run the query if user email exists
    }
  );

  // =======================================

  // cancel booking
  const { mutate: removeBooking, isLoading: cancelling } = useMutation({
    mutationFn: () => cancelBooking(id, user?.email, token),
    onSuccess: () => {
      setUserDetails((prev) => ({
        ...prev,
        bookings: prev.bookings.filter((booking) => booking?.id !== id), // Remove the cancelled booking
      }));

      // Update localStorage without clearing everything
      const storedBookings = JSON.parse(localStorage.getItem("bookings")) || [];
      const updatedBookings = storedBookings.filter(
        (booking) => booking.id !== id
      );
      localStorage.setItem("bookings", JSON.stringify(updatedBookings));

      toast.success("Booking cancelled successfully", {
        position: "bottom-right",
      });
    },
  });

  const bookedVisit =
    bookings?.find((booking) => booking.id === id) ||
    userDetail?.bookedVisit?.find((visit) => visit.id === id);

  // =======================================

  if (isError) {
    return (
      <div className="wrapper">
        <div className="flexCenter paddings">
          <span>Error fetching Listing</span>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="wrapper">
        <div className="flexCenter paddings">
          <PuffLoader />
        </div>
      </div>
    );
  }

  return (
    <div className="wrapper">
      <div className="flexColStart paddings innerWidth listing-container">
        {/* like button */}
        <LikeButton id={id}/>

        {/* main image */}
        <img
          src={selectedImage || data?.images[0]} // Use selectedImage or fallback to the first image
          alt="main"
          className="main-image"
        />

        {/* Swiper slider */}
        <Swiper {...sliderSettings} spaceBetween={0}>
          <SliderButtons />
          {data?.images?.map((photo, index) => (
            <SwiperSlide key={index}>
              <div
                onClick={() => setSelectedImage(photo)} // Update selectedImage on click
                style={{ cursor: "pointer" }} // Add pointer cursor for better UX
              >
                <PropertyImages photos={photo} />
              </div>
            </SwiperSlide>
          ))}
        </Swiper>

        {/* Listing details */}
        <div className="flexCenter listing-details">
          {/* left */}
          <div className="flexColStart left">
            {/* head */}
            <div className="flexStart head">
              <span className="primaryText">{data?.title}</span>
              <span className="lease-type">{data?.tenureType}</span>
              <span className="orangeText" style={{ fontSize: "1.5rem" }}>
                ${data?.price}
                {data?.tenureType === "Rent" && "/Month"}
              </span>
            </div>
            {/* facilities */}
            <div className="flexStart facilities">
              <div className="flexStart facility">
                <FaShower size={20} color="#1F3E72" />
                <span>{data?.facilities?.bathrooms} Bath(s)</span>
              </div>
              <div className="flexStart facility">
                <FaBed size={20} color="#1F3E72" />
                <span>{data?.facilities?.bedrooms} Bed(s)</span>
              </div>
              <div className="flexStart facility">
                <FaCar size={20} color="#1F3E72" />
                <span>{data?.facilities?.parking} Parking(s)</span>
              </div>
            </div>
            <div className="secondaryText" style={{ textAlign: "justify" }}>
              {data?.description}
            </div>
            <div className="flexStart">
              <MdAddLocation size={25} color="#1F3E72" />
              <span className="secondaryText">
                {data?.address} {data?.city} {data?.country}
              </span>
            </div>
            <div className="flexStart">
              <MdMap size={25} color="#1F3E72" />
              <span className="secondaryText">
                {" "}
                Ghana Post GPS Code:
                <b>{data?.gpsCode}</b>
              </span>
            </div>
            {bookedVisit ? (
              <>
                <Button
                  type="default"
                  danger
                  style={{ width: "100%" }}
                  onClick={() => removeBooking()}
                  disabled={cancelling} // Prevent multiple clicks while cancelling
                >
                  {cancelling ? "Cancelling Booking..." : "Cancel Booking"}
                </Button>
                <span>
                  Your visit is already booked for {bookedVisit?.date}.
                </span>
              </>
            ) : (
              <button
                className="button"
                onClick={() => validateLogin() && setModalOpened(true)}
              >
                Book your visit
              </button>
            )}

            <BookingModal
              opened={modalOpened}
              setOpened={setModalOpened}
              listingId={id}
              email={user?.email}
            />
          </div>
          {/* right */}

          <div className="map">
            {/* <MapComponent city={data?.city} /> */}
            <Map
              address={data?.address}
              city={data?.city}
              country={data?.country}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default Listing;

// Slider Buttons
const SliderButtons = () => {
  const swiper = useSwiper();
  return (
    <div className="flexCenter r-button">
      <button onClick={() => swiper.slidePrev()} className="r-prevButton">
        &lt;
      </button>
      <button onClick={() => swiper.slideNext()} className="r-nextButton">
        &gt;
      </button>
    </div>
  );
};
