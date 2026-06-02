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

export async function getRecommendedCourses(req, res) {
    try {
        const { prompt } = req.body;

        const result = await recommendCourses(prompt);

        res.json(result);
    } catch (error) {
        console.error("추천 API 에러:", error);

        res.status(500).json({
            message: error.message || "과목 추천에 실패했습니다."
        });
    }
}
