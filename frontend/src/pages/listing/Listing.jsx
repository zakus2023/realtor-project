import React, { useContext, useEffect, useState } from "react";
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
import { useAuth, useUser } from "@clerk/clerk-react";
import BookingModal from "../../Components/BookingModal/BookingModal";
import UserDetailsContext from "../../context/UserDetailsContext";
import { Button } from "antd";
import { toast } from "react-toastify";
import { FaEdit } from "react-icons/fa";
import EditListing from "../../Components/EditListing/EditListing";
import LikeButton from "../../Components/LikeButton/LikeButton.";

function Listing() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const [token, setToken] = useState(null);
  const amount = 10
  
  const { id } = useParams();
  const { data, isError, isLoading } = useQuery(["listing", id], () =>
    getListing(id)
  );

  const [selectedImage, setSelectedImage] = useState(null);
  const [modalOpened, setModalOpened] = useState(false);
  const [editModalOpened, setEditModalOpened] = useState(false);
  const { validateLogin } = useAuthCheck();

  const {
    userDetails: { bookings },
    setUserDetails,
  } = useContext(UserDetailsContext);

  useEffect(() => {
    const fetchToken = async () => {
      const clerkToken = await getToken();
      setToken(clerkToken);
    };
    fetchToken();
  }, [getToken]);

  // Initialize selectedImage after data is loaded
  useEffect(() => {
    if (data?.images?.[0]) {
      setSelectedImage(data.images[0]);
    }
  }, [data]);

  // Fetch user details
  const { data: userDetail } = useQuery(
    ["fetchUserDetails", user?.primaryEmailAddress?.emailAddress],
    () => fetchUserDetails(user?.primaryEmailAddress?.emailAddress, token),
    {
      enabled: !!user?.primaryEmailAddress?.emailAddress && !!token,
    }
  );

  // Cancel booking mutation
  const { mutate: removeBooking, isLoading: cancelling } = useMutation({
    mutationFn: () => cancelBooking(id, user?.primaryEmailAddress?.emailAddress, token),
    onSuccess: () => {
      setUserDetails((prev) => {
        const updatedBookings = prev.bookings.map((booking) =>
          booking.id === id
            ? { ...booking, bookingStatus: "expired", visitStatus: "cancelled" }
            : booking
        );

        localStorage.setItem("bookings", JSON.stringify(updatedBookings));
        return { ...prev, bookings: updatedBookings };
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

  // Safely parse facilities data
  const getFacilities = () => {
    try {
      if (!data?.facilities) return { beds: 0, baths: 0, kitchen: 0, parking: 0 };
      
      if (typeof data.facilities === 'string') {
        return JSON.parse(data.facilities);
      }
      return data.facilities;
    } catch (error) {
      console.error("Error parsing facilities:", error);
      return { beds: 0, baths: 0, kitchen: 0, parking: 0 };
    }
  };

  const facilities = getFacilities();

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
        <LikeButton id={id} />

        {selectedImage && (
          <img src={selectedImage} alt="main" className="main-image" />
        )}

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

        <div className="flexCenter listing-details">
          <div className="flexColStart left">
            <div className="flexStart head">
              <span className="primaryText">{data?.title}</span>
              <span className="lease-type">{data?.tenureType}</span>
              <span className="orangeText" style={{ fontSize: "1.5rem" }}>
                ${data?.price}
                {data?.tenureType === "rent" && "/Month"}
              </span>
            </div>

            {/* Fixed facilities display */}
            <div className="flexStart facilities">
              <div className="flexStart facility">
                <FaShower size={20} color="#1F3E72" />
                <span>{facilities.baths || 0} Bath(s)</span>
              </div>
              <div className="flexStart facility">
                <FaBed size={20} color="#1F3E72" />
                <span>{facilities.beds || 0} Beds(s)</span>
              </div>
              <div className="flexStart facility">
                <FaCookie size={20} color="#1F3E72" />
                <span>{facilities.kitchen || 0} Kitchen(s)</span>
              </div>
              <div className="flexStart facility">
                <FaCar size={20} color="#1F3E72" />
                <span>{facilities.parking || 0} Parking(s)</span>
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

            {(user?.primaryEmailAddress?.emailAddress === data?.userEmail ||
              userDetail?.data?.role === "admin") && (
              <div style={{ display: "flex", gap: "5px" }}>
                <span>
                  Online Status:{" "}
                  <button className="status-button">{data?.status}</button>
                </span>
                <span>
                  Availability:{" "}
                  <button className="status-button">
                    {data?.propertyStatus}
                  </button>
                </span>
              </div>
            )}

            {bookedVisit ? (
              <>
                <Button
                  type="default"
                  danger
                  style={{ width: "100%" }}
                  onClick={() => removeBooking()}
                  disabled={cancelling}
                >
                  {cancelling ? "Cancelling..." : "Cancel Booking"}
                </Button>
                <div className="booking-details">
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
            ) : user?.primaryEmailAddress?.emailAddress === data?.userEmail ||
              userDetail?.data?.role === "admin" ? (
              <>
                <button
                  type="button"
                  className="button"
                  onClick={() => validateLogin() && setEditModalOpened(true)}
                >
                  <FaEdit />
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

            {(user?.primaryEmailAddress?.emailAddress === data?.userEmail ||
              userDetail?.data?.role === "admin") && (
              <div className="documentations-section">
                <h3>Documentations:</h3>
                <ol>
                  {data?.documentations?.map((document, index) => (
                    <li key={index}>
                      <a href={document} download className="doc-link">
                        {document.split("/").pop()}
                      </a>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            <BookingModal
              opened={modalOpened}
              setOpened={setModalOpened}
              listingId={id}
              email={user?.primaryEmailAddress?.emailAddress}
              amount={amount}
              user={user}
            />
          </div>

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

// Add Error Boundary
class ErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Error Boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="wrapper">
          <div className="flexCenter paddings">
            <h2>Something went wrong with this listing</h2>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function ListingWithBoundary() {
  return (
    <ErrorBoundary>
      <Listing />
    </ErrorBoundary>
  );
}

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