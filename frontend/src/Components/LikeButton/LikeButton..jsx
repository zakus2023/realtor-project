import React, { useContext } from "react";
import { AiFillHeart } from "react-icons/ai";
import useAuthCheck from "../../hooks/useAuthCheck";
import { useMutation } from "react-query";
import { useAuth0 } from "@auth0/auth0-react";
import UserDetailsContext from "../../context/UserDetailsContext";
import { updateFavourites } from "../../utils/common";
import { addToFavourites } from "../../utils/api";
import { toast } from "react-toastify";
import "./LikeButton.css";

function LikeButton({ id }) {
  const { validateLogin } = useAuthCheck();
  const { user } = useAuth0();

  const {
    userDetails: { favourites, token },
    setUserDetails,
  } = useContext(UserDetailsContext);

  const likeColor = favourites.includes(id) ? "#fa3ef5" : "white";

  const { mutate } = useMutation({
    mutationFn: () => addToFavourites(id, user?.email, token),
    onMutate: async () => {
      // Optimistically update the UI
      setUserDetails((prev) => {
        const updatedFavourites = updateFavourites(id, prev.favourites);
        return { ...prev, favourites: updatedFavourites };
      });
    },
    onSuccess: (responseData) => {
      // Update the userDetails context with the response data
      setUserDetails((prev) => ({
        ...prev,
        favourites: responseData.favourites, // Assuming the response contains the updated favourites array
      }));

      // Save the updated favourites to local storage
      localStorage.setItem(
        "favourites",
        JSON.stringify(responseData.favourites)
      );
    },
    onError: () => {
      toast.error("Error updating favourites");
    },
  });

  const handleLike = () => {
    if (validateLogin()) {
      mutate(); // Trigger the mutation
    }
  };

  return (
    <div className="like">
      <AiFillHeart
        size={24}
        color={likeColor}
        onClick={(e) => {
          e.stopPropagation();
          handleLike();
        }}
      />
    </div>
  );
}

export default LikeButton;
