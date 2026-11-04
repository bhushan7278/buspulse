import express from 'express'
import multer from 'multer'
import { evaluateExtraBus } from '../controllers/extraBusController.js'
import { verifyToken } from '../middleware/authMiddleware.js'

const router = express.Router()
const storage = multer.memoryStorage()
const upload = multer({ storage })

router.post('/extra-bus/evaluate', verifyToken, upload.array('images', 4), evaluateExtraBus)

export default router
