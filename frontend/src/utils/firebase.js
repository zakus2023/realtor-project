// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getStorage } from "firebase/storage";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDTKt3mAF4dfbJZB6QX5sbuyUo7gQlhNNI",
  authDomain: "aethersoft-realtors.firebaseapp.com",
  projectId: "aethersoft-realtors",
  storageBucket: "aethersoft-realtors.firebasestorage.app",
  messagingSenderId: "671022340201",
  appId: "1:671022340201:web:a3bc993dc9aeaa9b592af8"
};

// Initialize Firebase
// Initialize Firebase
const app = initializeApp(firebaseConfig);
const storage = getStorage(app);

export { storage };