import express from "express";

import {
    getTimetable,
    addTimetableCourse,
    deleteTimetableCourse,
    getLiked,
    toggleLiked,
    enroll,
    getEnrollment
} from "../controllers/timetableController.js";

const router = express.Router();

router.get("/", getTimetable);
router.post("/", addTimetableCourse);
router.delete("/:courseId", deleteTimetableCourse);

router.get("/liked/list", getLiked);
router.post("/liked/toggle", toggleLiked);

router.get("/enroll/status", getEnrollment);
router.post("/enroll", enroll);

export default router;
