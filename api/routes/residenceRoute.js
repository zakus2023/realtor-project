import express from 'express'
import { addProperty, getAllProperties, getResidence } from '../controllers/residenceController.js'

const router = express.Router()

router.post("/addProperty", addProperty)

router.get("/fetchResidencies", getAllProperties)

router.get("/fetchResidence/:id", getResidence)

export default router