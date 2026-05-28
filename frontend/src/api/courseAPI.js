import { apiRequest } from "./client";

export async function fetchCourses(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const path = queryString ? `/courses?${queryString}` : "/courses";

    const data = await apiRequest(path);
    return data.courses;
}

export async function fetchCourseById(courseId) {
    return apiRequest(`/courses/${courseId}`);
}

export async function fetchRecommendedCourses(prompt) {
    return apiRequest("/courses/recommend", {
        method: "POST",
        body: JSON.stringify({ prompt })
    });
}