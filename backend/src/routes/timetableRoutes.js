import express from "express";

import {
    getTimetable,
    addTimetableCourse,
    deleteTimetableCourse,
    getLiked,
    toggleLiked,
    enroll,
    getEnrollment,
    cancelEnrollCourseController,
    resetTimetableController
} from "../controllers/timetableController.js";

const router = express.Router();

router.get("/", getTimetable);
router.post("/", addTimetableCourse);
router.delete("/:courseId", deleteTimetableCourse);

router.get("/liked/list", getLiked);
router.post("/liked/toggle", toggleLiked);

router.get("/enroll/status", getEnrollment);
router.post("/enroll", enroll);

router.delete("/enroll/:courseId", cancelEnrollCourseController);

router.post("/reset", resetTimetableController);
export default router;
