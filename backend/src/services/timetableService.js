import { getCourseById } from "./courseService.js";

let timetableCourseIds = [];
let likedCourseIds = [1, 2, 3, 4];
let enrolledCourseIds = [];

function hasTimeConflict(targetCourse, selectedCourses) {
    return selectedCourses.some((selectedCourse) => {
        const sameDay = targetCourse.days.some((day) =>
            selectedCourse.days.includes(day)
        );

        const samePeriod = targetCourse.periods.some((period) =>
            selectedCourse.periods.includes(period)
        );

        return sameDay && samePeriod && targetCourse.id !== selectedCourse.id;
    });
}

export function getTimetableCourses() {
    return timetableCourseIds
        .map((id) => getCourseById(id))
        .filter(Boolean);
}

export function addCourseToTimetable(courseId) {
    const course = getCourseById(courseId);

    if (!course) {
        return {
            success: false,
            message: "존재하지 않는 과목입니다."
        };
    }

    if (timetableCourseIds.includes(Number(courseId))) {
        return {
            success: false,
            message: "이미 시간표에 추가된 과목입니다."
        };
    }

    const selectedCourses = getTimetableCourses();
    const conflict = hasTimeConflict(course, selectedCourses);

    timetableCourseIds.push(Number(courseId));

    return {
        success: true,
        conflict,
        message: conflict
            ? "시간표에 추가했지만 교시가 중복됩니다."
            : "시간표에 추가되었습니다.",
        courses: getTimetableCourses()
    };
}

export function removeCourseFromTimetable(courseId) {
    timetableCourseIds = timetableCourseIds.filter(
        (id) => id !== Number(courseId)
    );

    return {
        success: true,
        message: "시간표에서 삭제되었습니다.",
        courses: getTimetableCourses()
    };
}

export function getLikedCourses() {
    return likedCourseIds
        .map((id) => getCourseById(id))
        .filter(Boolean);
}

export function toggleLikedCourse(courseId) {
    const numericId = Number(courseId);

    if (likedCourseIds.includes(numericId)) {
        likedCourseIds = likedCourseIds.filter((id) => id !== numericId);
    } else {
        likedCourseIds.push(numericId);
    }

    return {
        success: true,
        likedCourseIds,
        courses: getLikedCourses()
    };
}

export function enrollCourse(courseId) {
    const numericId = Number(courseId);
    const course = getCourseById(numericId);

    if (!course) {
        return {
            success: false,
            status: "NOT_FOUND",
            message: "존재하지 않는 과목입니다."
        };
    }

    if (enrolledCourseIds.includes(numericId)) {
        return {
            success: false,
            status: "DUPLICATED",
            message: "이미 신청한 과목입니다."
        };
    }

    const enrolledCourses = enrolledCourseIds
        .map((id) => getCourseById(id))
        .filter(Boolean);

    const conflict = hasTimeConflict(course, enrolledCourses);

    if (conflict) {
        return {
            success: false,
            status: "TIME_CONFLICT",
            message: "시간이 중복되어 신청할 수 없습니다."
        };
    }

    enrolledCourseIds.push(numericId);

    return {
        success: true,
        status: "ENROLLED",
        order: 1016,
        tip: "이 과목 신청에 실패하더라도 다른 과목들로 만들 수 있는 최선의 경우를 같이 생각해드릴게요!",
        message: "수강신청 요청이 접수되었습니다.",
        enrolledCourseIds
    };
}

export function getEnrollStatus() {
    return {
        enrolledCourseIds,
        enrolledCourses: enrolledCourseIds
            .map((id) => getCourseById(id))
            .filter(Boolean)
    };
}
