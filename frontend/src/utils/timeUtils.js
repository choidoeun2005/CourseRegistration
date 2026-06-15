export const DAYS = ["월", "화", "수", "목", "금", "토"];
export const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

function normalizePeriods(periods = []) {
    return periods
        .map((period) => Number(period))
        .filter((period) => !Number.isNaN(period))
        .sort((a, b) => a - b);
}

export function getCourseSessions(course) {
    if (course?.schedule?.sessions?.length > 0) {
        return course.schedule.sessions
            .map((session) => ({
                day: session.day,
                periods: normalizePeriods(session.periods),
                periodText: session.periodText || "",
                room: session.room || ""
            }))
            .filter((session) => session.day && session.periods.length > 0);
    }

    // 구버전 mock 데이터 fallback
    if (course?.days?.length && course?.periods?.length) {
        return course.days.map((day) => ({
            day,
            periods: normalizePeriods(course.periods),
            room: course.room || ""
        }));
    }

    return [];
}

export function isTimeUndecided(course) {
    return getCourseSessions(course).length === 0;
}

export function getTotalCredits(courses = []) {
    return courses.reduce((sum, course) => {
        const credit = Number(course.credit || 0);
        return sum + credit;
    }, 0);
}

export function isSameCourse(courseA, courseB) {
    if (!courseA || !courseB) return false;

    // 같은 학수번호면 같은 과목으로 판단
    if (courseA.code && courseB.code) {
        return courseA.code === courseB.code;
    }

    // 학수번호가 없을 때만 제목 fallback
    if (courseA.title && courseB.title) {
        return courseA.title === courseB.title;
    }

    return false;
}

export function hasCourseDuplicate(course, selectedCourses) {
    return selectedCourses.some((selected) => {
        if (selected.id === course.id) return false;
        return isSameCourse(course, selected);
    });
}

export function hasTimeConflict(course, selectedCourses, maxAllowed = 3) {
    const courseSessions = getCourseSessions(course);

    // 시간 미정 과목은 교시 충돌 판단 불가 → 충돌 없음으로 처리
    if (courseSessions.length === 0) return false;

    for (const session of courseSessions) {
        for (const period of session.periods) {
            const overlapCount = selectedCourses.filter((selected) => {
                if (selected.id === course.id) return false;
                const selectedSessions = getCourseSessions(selected);
                return selectedSessions.some(
                    (s) => s.day === session.day && s.periods.includes(period)
                );
            }).length;

            if (overlapCount >= maxAllowed) return true;
        }
    }

    return false;
}

export function courseIncludesCell(course, day, period) {
    const targetPeriod = Number(period);

    return getCourseSessions(course).some(
        (session) =>
            session.day === day && session.periods.includes(targetPeriod)
    );
}

export function getBlockReason(course, selectedCourses, options = {}) {
    const { maxTimeOverlap = 3 } = options;

    if (hasCourseDuplicate(course, selectedCourses)) {
        return "과목 중복";
    }

    if (hasTimeConflict(course, selectedCourses, maxTimeOverlap)) {
        return "교시 중복";
    }

    return "";
}

export function filterCoursesByDayState(courses, dayState) {
    return courses.filter((course) => {
        const sessions = getCourseSessions(course);
        const courseDays = [...new Set(sessions.map((session) => session.day))];

        return Object.entries(dayState).every(([day, state]) => {
            if (state === "include") return courseDays.includes(day);
            if (state === "exclude") return !courseDays.includes(day);
            return true;
        });
    });
}
