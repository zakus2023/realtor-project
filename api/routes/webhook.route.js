// routes/webhook.route.js
import express from 'express';
import { clerkWebhook } from '../controllers/webhook.controller.js';


const router = express.Router();

router.post(
  '/clerk',
  express.raw({ type: 'application/json' }), // Crucial for signature verification
  clerkWebhook
);

export default router;