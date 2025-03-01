import ImageKit from "imagekit";

const imagekit = new ImageKit({
  publicKey: import.meta.env.VITE_IMAGEKIT_PUBLIC_KEY, // Replace with your ImageKit Public API Key
  urlEndpoint: import.meta.env.VITE_IMAGEKIT_URL_ENDPOINT, // Replace with your ImageKit URL Endpoint
  authenticationEndpoint: import.meta.env.VITE_IMAGEKIT_BACKEND_API, // Replace with your backend endpoint for authentication
});

export default imagekit;