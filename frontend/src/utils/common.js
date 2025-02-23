export const sliderSettings = {
  slidesPerView: 1,
  spaceBetween: 50,
  breakpoints: {
    480: {
      slidesPerView: 1,
    },
    600: {
      slidesPerView: 2,
    },
    750: {
      slidesPerView: 3,
    },
    1100: {
      slidesPerView: 4,
    },
  },
};

// update favourites
export const updateFavourites = (id, favourites) => {
  // Ensure favourites is an array
  if (!Array.isArray(favourites)) {
    console.error("Favourites must be an array");
    return favourites; // Return the original value to avoid breaking the app
  }

  // Ensure id is valid
  if (id === undefined || id === null) {
    console.error("Invalid ID");
    return favourites; // Return the original value
  }

  // Check if the id is already in favourites
  if (favourites.includes(id)) {
    // Remove the id from the array (unfavorite)
    return favourites.filter((resId) => resId !== id);
  } else {
    // Add the id to the array (favorite)
    return [...favourites, id];
  }
};

