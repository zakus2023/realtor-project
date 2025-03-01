import ImageKit from "imagekit";

const imagekit = new ImageKit({
  publicKey: "public_vP03kKuO/cNqdZtbGP8emOr7oYw=",  // Replace with your ImageKit Public API Key
  privateKey: "private_dNaDI3BwGhqYpdBSB1CAce5uRYc=",
  urlEndpoint: "https://ik.imagekit.io/yds4mej8p", // Replace with your ImageKit URL Endpoint
  authenticationEndpoint: "https://localhost:5000", // Replace with your backend endpoint for authentication
});

export default imagekit;

