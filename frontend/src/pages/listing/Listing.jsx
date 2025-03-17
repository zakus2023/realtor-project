import React, { useContext, useState } from "react";
import "./Listing.css";
import { useMutation, useQuery } from "react-query";
import { useParams } from "react-router-dom";
import { cancelBooking, fetchUserDetails, getListing } from "../../utils/api";
import { PuffLoader } from "react-spinners";
import { FaBed, FaCar, FaCookie, FaShower } from "react-icons/fa";
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
import { FaEdit } from "react-icons/fa";
import EditListing from "../../Components/EditListing/EditListing";
import LikeButton from "../../Components/LikeButton/LikeButton.";

function Listing() {
  const { user } = useAuth0();
  const { id } = useParams();
  const { data, isError, isLoading } = useQuery(["listing", id], () =>
    getListing(id)
  );

  const [selectedImage, setSelectedImage] = useState(data?.images[0]);
  const [modalOpened, setModalOpened] = useState(false);
  const [editModalOpened, setEditModalOpened] = useState(false);
  const { validateLogin } = useAuthCheck();

  const {
    userDetails: { token, bookings },
    setUserDetails,
  } = useContext(UserDetailsContext);

  // Fetch user details
  const { data: userDetail } = useQuery(
    ["fetchUserDetails", user?.email],
    () => fetchUserDetails(user?.email, token),
    {
      enabled: !!user?.email && !!token,
    }
  );
  console.log(userDetail)

  // Cancel booking mutation
  const { mutate: removeBooking, isLoading: cancelling } = useMutation({
    mutationFn: () => cancelBooking(id, user?.email, token),
    onSuccess: () => {
      setUserDetails((prev) => {
        const updatedBookings = prev.bookings.map((booking) =>
          booking.id === id
            ? { ...booking, bookingStatus: "expired", visitStatus: "cancelled" }
            : booking
        );

        console.log("Updated Bookings:", updatedBookings); // Debugging

        // Update local storage with the updated bookings
        localStorage.setItem("bookings", JSON.stringify(updatedBookings));

        console.log("Local Storage Updated:", localStorage.getItem("bookings")); // Debugging

        return {
          ...prev,
          bookings: updatedBookings,
        };
      });

      toast.success("Booking cancelled successfully", {
        position: "bottom-right",
      });
    },
  });

  const bookedVisit =
    bookings?.find((booking) => booking.propertyId === id) ||
    userDetail?.bookedVisit?.find(
      (visit) =>
        visit.propertyId === id &&
        visit.bookingStatus === "active" &&
        visit.visitStatus === "pending"
    );

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
        {/* Like button */}
        <LikeButton id={id} />

        {/* Main image */}
        <img
          src={selectedImage || data?.images[0]}
          alt="main"
          className="main-image"
        />

        {/* Swiper slider */}
        <Swiper {...sliderSettings} spaceBetween={0}>
          <SliderButtons />
          {data?.images?.map((photo, index) => (
            <SwiperSlide key={index}>
              <div
                onClick={() => setSelectedImage(photo)}
                style={{ cursor: "pointer" }}
              >
                <PropertyImages photos={photo} />
              </div>
            </SwiperSlide>
          ))}
        </Swiper>

        {/* Listing details */}
        <div className="flexCenter listing-details">
          {/* Left */}
          <div className="flexColStart left">
            {/* Head */}
            <div className="flexStart head">
              <span className="primaryText">{data?.title}</span>
              <span className="lease-type">{data?.tenureType}</span>
              <span className="orangeText" style={{ fontSize: "1.5rem" }}>
                ${data?.price}
                {data?.tenureType === "rent" && "/Month"}
              </span>
            </div>
            {/* Facilities */}
            <div className="flexStart facilities">
              <div className="flexStart facility">
                <FaShower size={20} color="#1F3E72" />
                <span>{JSON.parse(data?.facilities)?.baths} Bath(s)</span>
              </div>
              <div className="flexStart facility">
                <FaBed size={20} color="#1F3E72" />
                <span>{JSON.parse(data?.facilities)?.beds} Beds(s)</span>
              </div>
              <div className="flexStart facility">
                <FaCookie size={20} color="#1F3E72" />
                <span>{JSON.parse(data?.facilities)?.kitchen} Kitchen(s)</span>
              </div>
              <div className="flexStart facility">
                <FaCar size={20} color="#1F3E72" />
                <span>{JSON.parse(data?.facilities)?.parking} Parking(s)</span>
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
                Ghana Post GPS Code: <b>{data?.gpsCode}</b>
              </span>
            </div>
            {user?.email === data?.userEmail || userDetail?.role === "admin" ? (
              <div
                className="flexStart"
                style={{ display: "flex", gap: "5px" }}
              >
                <span>
                  Online Status:{" "}
                  <button
                    style={{
                      padding: "5px 8px",
                      border: "none",
                      borderRadius: "5px",
                      backgroundColor: "green",
                      color: "white",
                      fontSize: "18px",
                      fontWeight: "600",
                    }}
                  >
                    {data?.status}
                  </button>
                </span>
                <span>
                  Availability:{" "}
                  <button
                    style={{
                      padding: "5px 8px",
                      border: "none",
                      borderRadius: "5px",
                      backgroundColor: "green",
                      color: "white",
                      fontSize: "18px",
                      fontWeight: "600",
                    }}
                  >
                    {data?.propertyStatus}
                  </button>
                </span>
              </div>
            ) : null}

            {bookedVisit &&
            (bookedVisit.bookingStatus === "active" ||
              bookedVisit.visitStatus === "pending") ? (
              <>
                <Button
                  type="default"
                  danger
                  style={{ width: "100%" }}
                  onClick={() => removeBooking()}
                  disabled={cancelling}
                >
                  {cancelling ? "Cancelling Booking..." : "Cancel Booking"}
                </Button>
                <div
                  className="booking-details"
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "10px",
                  }}
                >
                  <p>
                    <strong>Date:</strong> {bookedVisit.date}
                  </p>
                  <p>
                    <strong>Time:</strong> {bookedVisit.time}
                  </p>
                  <p>
                    <strong>Status:</strong> {bookedVisit.visitStatus}
                  </p>
                </div>
              </>
            ) : user?.email === data?.userEmail ||
              userDetail?.role === "admin" ? (
              <>
                <button
                  type="button"
                  className="button"
                  onClick={() => {
                    if (!validateLogin()) {
                      toast.error("You must log in to edit a listing.");
                    } else {
                      setEditModalOpened(true);
                    }
                  }}
                >
                  <FaEdit style={{ width: "50px" }} />
                </button>

                <EditListing
                  opened={editModalOpened}
                  setOpened={setEditModalOpened}
                  propertyToEdit={data}
                  currentUserDetails={userDetail}
                />
              </>
            ) : (
              <button
                className="button"
                onClick={() => validateLogin() && setModalOpened(true)}
              >
                Book your visit
              </button>
            )}

            {user?.email === data?.userEmail || userDetail?.role === "admin" ? (
              <div className="documentations-section">
                <h3>
                  Documentations:{" "}
                  <span style={{ fontWeight: "300" }}>Click to download</span>
                </h3>
                <ol>
                  {data?.documentations?.map((document, index) => {
                    const fileName = document.split("/").pop();
                    return (
                      <li key={index}>
                        <a
                          href={document}
                          download={fileName}
                          style={{ textDecoration: "none", color: "blue" }}
                        >
                          {fileName}
                        </a>
                      </li>
                    );
                  })}
                </ol>
              </div>
            ) : null}

            <BookingModal
              opened={modalOpened}
              setOpened={setModalOpened}
              listingId={id}
              email={user?.email}
            />
          </div>
          {/* Right */}
          <div className="map">
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