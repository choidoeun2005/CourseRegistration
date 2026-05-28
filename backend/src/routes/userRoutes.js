import express from "express";

import {
    login,
    getMe,
    updateSettings
} from "../controllers/userController.js";

const router = express.Router();

router.post("/login", login);
router.get("/me", getMe);
router.patch("/settings", updateSettings);

export default router;
