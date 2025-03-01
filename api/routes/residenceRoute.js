import express from 'express';
import { addProperty, getAllProperties, getResidence, uploadAuth } from '../controllers/residenceController.js';
import jwtCheck from '../config/auth0Config.js';


const router = express.Router();

// Use multer middleware in your route
router.post("/addProperty", jwtCheck, addProperty);

//upload-image to imagekit.io
router.get("/upload-auth", uploadAuth)

router.get("/fetchResidencies", getAllProperties);

router.get("/fetchResidence/:id", getResidence);

export default router;