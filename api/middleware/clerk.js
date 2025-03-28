import { createClerkClient } from '@clerk/clerk-sdk-node';
import dotenv from "dotenv";

dotenv.config();

let clerkInstance = null;

export const getClerkInstance = () => {
  if (!clerkInstance) {
    clerkInstance = createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY
    });
  }
  return clerkInstance;
};