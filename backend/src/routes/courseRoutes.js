import express from "express";

import {
    getCourses,
    getCourse,
    getRecommendedCourses
} from "../controllers/courseController.js";

const router = express.Router();

router.get("/", getCourses);
router.get("/:id", getCourse);
router.post("/recommend", getRecommendedCourses);

export default router;
