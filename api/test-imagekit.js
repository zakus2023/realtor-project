import ImageKit from "imagekit";

const imagekit = new ImageKit({
  publicKey: "public_vP03kKuO/cNqdZtbGP8emOr7oYw=",
  privateKey: "private_dNaDI3BwGhqYpdBSB1CAce5uRYc=",
  urlEndpoint: "https://ik.imagekit.io/yds4mej8p",
});

// Test uploading a file
imagekit
  .upload({
    file: "https://www.google.com/url?sa=i&url=https%3A%2F%2Fwww.istockphoto.com%2Fphotos%2Fbeauty-in-nature&psig=AOvVaw2efpKA60Hsvfz6xJMLNpCW&ust=1740944393784000&source=images&cd=vfe&opi=89978449&ved=0CBEQjRxqFwoTCNjV7LTR6YsDFQAAAAAdAAAAABAE", // URL of a sample image
    fileName: "sample.jpg",
    folder: "/test-folder",
  })
  .then((response) => {
    console.log("Upload successful:", response);
  })
  .catch((error) => {
    console.error("Upload failed:", error);
  });
