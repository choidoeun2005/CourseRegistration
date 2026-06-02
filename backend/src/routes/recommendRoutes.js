import express from "express";
import { chatRecommend } from "../controllers/recommendController.js";

const router = express.Router();

router.post("/chat", chatRecommend);

export default router;