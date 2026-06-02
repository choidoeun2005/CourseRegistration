import express from "express";

import {
    getStatus,
    toggleStatus,
    updateStatus
} from "../controllers/registrationController.js";

const router = express.Router();

router.get("/status", getStatus);
router.post("/toggle", toggleStatus);
router.patch("/status", updateStatus);

export default router;