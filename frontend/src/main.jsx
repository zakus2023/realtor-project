import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { Auth0Provider } from "@auth0/auth0-react";

createRoot(document.getElementById("root")).render(
  <StrictMode>
  <Auth0Provider
  domain="dev-ccmy6um2itf0jid5.us.auth0.com"
  clientId="7rwwJVBGjwYR4jdd8CG3E6wlnxcdWaPC"
  authorizationParams={{
    redirect_uri: window.location.origin + "/callback",
    audience: import.meta.env.PROD 
      ? "https://aethersoft-realtors.onrender.com" 
      : "http://localhost:5000"
  }}
>
  <App />
</Auth0Provider>
  </StrictMode>
);
