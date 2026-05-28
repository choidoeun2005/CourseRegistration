import { apiRequest } from "./client";

export async function fetchTimetableCourses() {
    const data = await apiRequest("/timetable");
    return data.courses;
}

export async function addCourseToTimetable(courseId) {
    return apiRequest("/timetable", {
        method: "POST",
        body: JSON.stringify({ courseId })
    });
}

export async function removeCourseFromTimetable(courseId) {
    return apiRequest(`/timetable/${courseId}`, {
        method: "DELETE"
    });
}

export async function fetchLikedCourses() {
    const data = await apiRequest("/timetable/liked/list");
    return data.courses;
}

export async function toggleLikedCourse(courseId) {
    return apiRequest("/timetable/liked/toggle", {
        method: "POST",
        body: JSON.stringify({ courseId })
    });
}

export async function fetchEnrollmentStatus() {
    return apiRequest("/timetable/enroll/status");
}

export async function enrollCourse(courseId) {
    return apiRequest("/timetable/enroll", {
        method: "POST",
        body: JSON.stringify({ courseId })
    });
}