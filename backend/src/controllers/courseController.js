import {
    getAllCourses,
    getCourseById,
    recommendCourses
} from "../services/courseService.js";

export function getCourses(req, res) {
    const courses = getAllCourses(req.query);

    res.json({
        count: courses.length,
        courses
    });
}

export function getCourse(req, res) {
    const { id } = req.params;
    const course = getCourseById(id);

    if (!course) {
        return res.status(404).json({
            message: "과목을 찾을 수 없습니다."
        });
    }

    res.json(course);
}

export function getRecommendedCourses(req, res) {
    const { prompt } = req.body;

    const result = recommendCourses(prompt);

    res.json(result);
}
