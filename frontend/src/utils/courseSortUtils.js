export const SORT_OPTIONS = [
    { value: "time", label: "시간순" },
    { value: "name", label: "이름순" },
    { value: "capacity", label: "정원 많은 순" }
];

const DAY_ORDER = {
    월: 1,
    화: 2,
    수: 3,
    목: 4,
    금: 5,
    토: 6,
    일: 7
};

function getFirstSessionSortValue(course) {
    const sessions = course.schedule?.sessions || [];

    if (sessions.length === 0) {
        return Number.MAX_SAFE_INTEGER;
    }

    const sortedSessions = [...sessions].sort((a, b) => {
        const aDay = DAY_ORDER[a.day] || 99;
        const bDay = DAY_ORDER[b.day] || 99;

        if (aDay !== bDay) return aDay - bDay;

        const aPeriod = Math.min(...(a.periods || [99]));
        const bPeriod = Math.min(...(b.periods || [99]));

        return aPeriod - bPeriod;
    });

    const first = sortedSessions[0];

    return (DAY_ORDER[first.day] || 99) * 100 + Math.min(...(first.periods || [99]));
}

function getCapacityValue(course) {
    const candidates = [
        course.capacity,
        course.quota,
        course.limit,
        course.limitCount,
        course.enrollmentLimit,
        course.maxStudents,
        course.maxCapacity,
        course.studentLimit,
        course.seatCount,
        course.lmtCnt,
        course.lmt_cnt
    ];

    for (const value of candidates) {
        if (value === undefined || value === null || value === "") continue;

        const number = Number(String(value).replace(/[^\d.]/g, ""));

        if (!Number.isNaN(number)) {
            return number;
        }
    }

    return 0;
}

export function sortCourses(courses, sortType) {
    const copied = [...courses];

    if (sortType === "name") {
        return copied.sort((a, b) =>
            String(a.title || "").localeCompare(String(b.title || ""), "ko")
        );
    }

    if (sortType === "capacity") {
        return copied.sort((a, b) => {
            const capacityDiff = getCapacityValue(b) - getCapacityValue(a);

            if (capacityDiff !== 0) return capacityDiff;

            return String(a.title || "").localeCompare(String(b.title || ""), "ko");
        });
    }

    return copied.sort((a, b) => {
        const timeDiff = getFirstSessionSortValue(a) - getFirstSessionSortValue(b);

        if (timeDiff !== 0) return timeDiff;

        return String(a.title || "").localeCompare(String(b.title || ""), "ko");
    });
}