import {
    getTimetableCourses,
    addCourseToTimetable,
    removeCourseFromTimetable,
    getLikedCourses,
    toggleLikedCourse,
    enrollCourse,
    getEnrollStatus
} from "../services/timetableService.js";

export function getTimetable(req, res) {
    res.json({
        courses: getTimetableCourses()
    });
}

export function addTimetableCourse(req, res) {
    const { courseId } = req.body;

    const result = addCourseToTimetable(courseId);

    res.status(result.success ? 200 : 400).json(result);
}

export function deleteTimetableCourse(req, res) {
    const { courseId } = req.params;

    const result = removeCourseFromTimetable(courseId);

    res.json(result);
}

export function getLiked(req, res) {
    res.json({
        courses: getLikedCourses()
    });
}

export function toggleLiked(req, res) {
    const { courseId } = req.body;

    const result = toggleLikedCourse(courseId);

    res.json(result);
}

export function enroll(req, res) {
    const { courseId } = req.body;

    const result = enrollCourse(courseId);

    res.status(result.success ? 200 : 400).json(result);
}

export function getEnrollment(req, res) {
    res.json(getEnrollStatus());
}
