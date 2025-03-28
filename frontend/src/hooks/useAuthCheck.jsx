// useAuthCheck.js
import { useAuth } from "@clerk/clerk-react";
import { toast } from "react-toastify";

function useAuthCheck() {
  const { userId } = useAuth();
  const validateLogin = () => {
    if (!userId) {
      toast.error("You must be logged in", { position: "bottom-right" });
      return false;
    } else return true;
  };
  return {
    validateLogin,
  };
}

export default useAuthCheck;