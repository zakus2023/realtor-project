import express from 'express'
import { addProperty, getAllProperties, getResidence } from '../controllers/residenceController.js'
import jwtCheck from '../config/auth0Config.js'

const router = express.Router()

router.post("/addProperty", jwtCheck, addProperty)

router.get("/fetchResidencies", getAllProperties)

router.get("/fetchResidence/:id", getResidence)

export default router