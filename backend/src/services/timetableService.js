import { getCourseById } from "./courseService.js";

let timetableCourseIds = [];
let likedCourseIds = [1, 2, 3, 4];
let enrolledCourseIds = [];

/**
 * course.schedule.sessions 기준 시간표 구조 예시:
 *
 * schedule: {
 *   sessions: [
 *     {
 *       day: "화",
 *       periods: [1, 2],
 *       periodText: "1-2",
 *       room: "우정간호학관 401호"
 *     },
 *     {
 *       day: "목",
 *       periods: [2],
 *       periodText: "2",
 *       room: "우정간호학관 401호"
 *     }
 *   ]
 * }
 */

/* =========================
 * 공통 유틸
 * ========================= */

function toNumber(value) {
    const number = Number(value);
    return Number.isNaN(number) ? null : number;
}

function normalizePeriods(periods = []) {
    return periods
        .map(toNumber)
        .filter((period) => period !== null)
        .sort((a, b) => a - b);
}

function getCourseSessions(course) {
    if (!course) return [];

    /**
     * 1순위: 새 courses.json 구조
     * course.schedule.sessions
     */
    if (Array.isArray(course.schedule?.sessions)) {
        return course.schedule.sessions
            .map((session) => ({
                day: session.day,
                periods: normalizePeriods(session.periods),
                room: session.room || ""
            }))
            .filter((session) => session.day && session.periods.length > 0);
    }

    /**
     * 2순위: schedule.byDay 구조가 있을 경우
     * byDay: { "화": [1, 2], "목": [2] }
     */
    if (course.schedule?.byDay && typeof course.schedule.byDay === "object") {
        return Object.entries(course.schedule.byDay)
            .map(([day, periods]) => ({
                day,
                periods: normalizePeriods(periods),
                room: course.schedule?.roomText || course.room || ""
            }))
            .filter((session) => session.day && session.periods.length > 0);
    }

    /**
     * 3순위: 예전 mock 데이터 호환용
     *
     * 주의:
     * 이 구조는 days와 periods의 pairing이 없어서 정확하지 않다.
     * 실제 크롤링 데이터에서는 반드시 schedule.sessions를 사용해야 한다.
     */
    if (Array.isArray(course.days) && Array.isArray(course.periods)) {
        return course.days
            .map((day) => ({
                day,
                periods: normalizePeriods(course.periods),
                room: course.room || ""
            }))
            .filter((session) => session.day && session.periods.length > 0);
    }

    return [];
}

function sessionsConflict(sessionA, sessionB) {
    if (!sessionA || !sessionB) return false;
    if (sessionA.day !== sessionB.day) return false;

    return sessionA.periods.some((period) =>
        sessionB.periods.includes(period)
    );
}

function hasTimeConflict(targetCourse, selectedCourses) {
    const targetSessions = getCourseSessions(targetCourse);

    return selectedCourses.some((selectedCourse) => {
        if (!selectedCourse) return false;
        if (targetCourse.id === selectedCourse.id) return false;

        const selectedSessions = getCourseSessions(selectedCourse);

        return targetSessions.some((targetSession) =>
            selectedSessions.some((selectedSession) =>
                sessionsConflict(targetSession, selectedSession)
            )
        );
    });
}

function getTimeConflictCourse(targetCourse, selectedCourses) {
    const targetSessions = getCourseSessions(targetCourse);

    return selectedCourses.find((selectedCourse) => {
        if (!selectedCourse) return false;
        if (targetCourse.id === selectedCourse.id) return false;

        const selectedSessions = getCourseSessions(selectedCourse);

        return targetSessions.some((targetSession) =>
            selectedSessions.some((selectedSession) =>
                sessionsConflict(targetSession, selectedSession)
            )
        );
    });
}

function isSameCourse(courseA, courseB) {
    if (!courseA || !courseB) return false;

    /**
     * 같은 학수번호면 같은 과목으로 판단.
     * 분반이 달라도 같은 학수번호면 중복으로 막는다.
     */
    if (courseA.code && courseB.code) {
        return courseA.code === courseB.code;
    }

    /**
     * 학수번호가 없을 때만 과목명으로 fallback.
     * 학수번호가 서로 다른데 과목명만 같다고 무조건 막으면
     * 서로 다른 학과의 동명이 과목까지 막힐 수 있음.
     */
    if (courseA.title && courseB.title) {
        return courseA.title === courseB.title;
    }

    return false;
}

function hasCourseDuplicate(targetCourse, selectedCourses) {
    return selectedCourses.some((selectedCourse) => {
        if (!selectedCourse) return false;
        if (targetCourse.id === selectedCourse.id) return false;

        return isSameCourse(targetCourse, selectedCourse);
    });
}

function getDuplicateCourse(targetCourse, selectedCourses) {
    return selectedCourses.find((selectedCourse) => {
        if (!selectedCourse) return false;
        if (targetCourse.id === selectedCourse.id) return false;

        return isSameCourse(targetCourse, selectedCourse);
    });
}

function getCoursesByIds(ids) {
    return ids.map((id) => getCourseById(id)).filter(Boolean);
}

function normalizeCourseId(courseId) {
    return Number(courseId);
}

/* =========================
 * 시간표
 * ========================= */

export function getTimetableCourses() {
    return getCoursesByIds(timetableCourseIds);
}

export function addCourseToTimetable(courseId) {
    const numericId = normalizeCourseId(courseId);
    const course = getCourseById(numericId);

    if (!course) {
        return {
            success: false,
            status: "NOT_FOUND",
            message: "존재하지 않는 과목입니다."
        };
    }

    if (timetableCourseIds.includes(numericId)) {
        return {
            success: false,
            status: "ALREADY_IN_TIMETABLE",
            message: "이미 시간표에 추가된 과목입니다."
        };
    }

    const selectedCourses = getTimetableCourses();

    const duplicateCourse = getDuplicateCourse(course, selectedCourses);

    if (duplicateCourse) {
        return {
            success: false,
            status: "COURSE_DUPLICATE",
            message: "같은 과목이 이미 시간표에 있습니다.",
            conflictCourse: duplicateCourse
        };
    }

    const conflictCourse = getTimeConflictCourse(course, selectedCourses);

    if (conflictCourse) {
        return {
            success: false,
            status: "TIME_CONFLICT",
            message: "교시가 중복되어 시간표에 추가할 수 없습니다.",
            conflictCourse
        };
    }

    timetableCourseIds.push(numericId);

    return {
        success: true,
        status: "ADDED",
        message: "시간표에 추가되었습니다.",
        courses: getTimetableCourses()
    };
}

export function removeCourseFromTimetable(courseId) {
    const numericId = normalizeCourseId(courseId);

    timetableCourseIds = timetableCourseIds.filter((id) => id !== numericId);

    return {
        success: true,
        status: "REMOVED",
        message: "시간표에서 삭제되었습니다.",
        courses: getTimetableCourses()
    };
}

/* =========================
 * 관심과목
 * ========================= */

export function getLikedCourses() {
    return getCoursesByIds(likedCourseIds);
}

export function toggleLikedCourse(courseId) {
    const numericId = normalizeCourseId(courseId);
    const course = getCourseById(numericId);

    if (!course) {
        return {
            success: false,
            status: "NOT_FOUND",
            message: "존재하지 않는 과목입니다.",
            likedCourseIds,
            courses: getLikedCourses()
        };
    }

    if (likedCourseIds.includes(numericId)) {
        likedCourseIds = likedCourseIds.filter((id) => id !== numericId);
    } else {
        likedCourseIds.push(numericId);
    }

    return {
        success: true,
        status: "UPDATED",
        likedCourseIds,
        courses: getLikedCourses()
    };
}

/* =========================
 * 수강신청
 * ========================= */

export function enrollCourse(courseId) {
    const numericId = normalizeCourseId(courseId);
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

    const enrolledCourses = getCoursesByIds(enrolledCourseIds);

    const duplicateCourse = getDuplicateCourse(course, enrolledCourses);

    if (duplicateCourse) {
        return {
            success: false,
            status: "COURSE_DUPLICATE",
            message: "과목이 중복되어 신청할 수 없습니다.",
            conflictCourse: duplicateCourse
        };
    }

    const conflictCourse = getTimeConflictCourse(course, enrolledCourses);

    if (conflictCourse) {
        return {
            success: false,
            status: "TIME_CONFLICT",
            message: "시간이 중복되어 신청할 수 없습니다.",
            conflictCourse
        };
    }

    enrolledCourseIds.push(numericId);

    return {
        success: true,
        status: "ENROLLED",
        order: 1016,
        tip: "이 과목 신청에 실패하더라도 다른 과목들로 만들 수 있는 최선의 경우를 같이 생각해드릴게요!",
        message: "수강신청 요청이 접수되었습니다.",
        enrolledCourseIds,
        enrolledCourses: getCoursesByIds(enrolledCourseIds)
    };
}

export function getEnrollStatus() {
    return {
        enrolledCourseIds,
        enrolledCourses: getCoursesByIds(enrolledCourseIds)
    };
}

/* =========================
 * 디버그/초기화용
 * 필요 없으면 안 써도 됨
 * ========================= */

export function resetTimetableState() {
    timetableCourseIds = [];
    likedCourseIds = [];
    enrolledCourseIds = [];

    return {
        success: true,
        message: "시간표, 관심과목, 신청 상태가 초기화되었습니다."
    };
}