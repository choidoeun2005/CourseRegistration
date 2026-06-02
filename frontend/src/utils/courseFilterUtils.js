import { getCourseSessions } from "./timeUtils";

export const DAYS = ["월", "화", "수", "목", "금", "토"];
export const FILTER_PERIODS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

export function createDefaultFilters() {
    return {
        keyword: "",
        searchTarget: "all", // all | title | professor | code

        college: {
            value: "",
            enabled: false
        },

        department: {
            value: "",
            enabled: false
        },

        dayStates: {
            월: "any",
            화: "any",
            수: "any",
            목: "any",
            금: "any",
            토: "any"
        },

        detailsOpen: false,

        credit: "",
        courseType: "",

        onlyAvailable: false,
        excludeDropRestricted: false,
        onlyMooc: false,
        onlyFlexible: false,
        onlyRemote: false,

        // all | only | exclude
        englishMode: "all",

        // key 예시: "월-1": "include", "화-2": "exclude"
        timeSlots: {}
    };
}

export function getCollegeOptions(courses) {
    return [...new Set(courses.map((course) => course.college).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b, "ko"));
}

export function getDepartmentOptions(courses, selectedCollege = "") {
    const targetCourses = selectedCollege
        ? courses.filter((course) => course.college === selectedCollege)
        : courses;

    const map = new Map();

    targetCourses.forEach((course) => {
        if (!course.department) return;

        const key = `${course.college || ""}__${course.department}`;

        map.set(key, {
            college: course.college || "",
            department: course.department
        });
    });

    return [...map.values()].sort((a, b) => {
        const collegeCompare = a.college.localeCompare(b.college, "ko");

        if (collegeCompare !== 0) return collegeCompare;

        return a.department.localeCompare(b.department, "ko");
    });
}

function normalizeCredit(value) {
    const number = Number(value);

    if (Number.isNaN(number)) {
        return String(value || "").trim();
    }

    return String(number);
}

export function getCreditOptions(courses) {
    return [
        ...new Set(
            courses
                .map((course) => normalizeCredit(course.credit))
                .filter((credit) => credit !== "" && credit !== "0")
        )
    ].sort((a, b) => Number(a) - Number(b));
}

export function getCourseTypeOptions(courses) {
    return [
        ...new Set(
            courses
                .map((course) => course.courseType || course.type)
                .filter(Boolean)
        )
    ].sort((a, b) => a.localeCompare(b, "ko"));
}

function normalizeText(value) {
    return String(value || "")
        .toLowerCase()
        .replace(/\s+/g, "");
}

function getSearchFields(course) {
    return {
        title: [course.title],
        professor: [course.professor],
        code: [course.code, course.section, `${course.code}-${course.section}`]
    };
}

function matchesKeyword(course, keyword, searchTarget) {
    const normalizedKeyword = normalizeText(keyword);

    if (!normalizedKeyword) return true;

    const fields = getSearchFields(course);

    if (searchTarget === "title") {
        return fields.title.some((value) =>
            normalizeText(value).includes(normalizedKeyword)
        );
    }

    if (searchTarget === "professor") {
        return fields.professor.some((value) =>
            normalizeText(value).includes(normalizedKeyword)
        );
    }

    if (searchTarget === "code") {
        return fields.code.some((value) =>
            normalizeText(value).includes(normalizedKeyword)
        );
    }

    // 전체 검색도 대학/학과는 제외.
    // 전체 = 과목명 + 교수자 + 학수번호
    return [...fields.title, ...fields.professor, ...fields.code].some((value) =>
        normalizeText(value).includes(normalizedKeyword)
    );
}

function getCourseDays(course) {
    const sessions = getCourseSessions(course);
    return [...new Set(sessions.map((session) => session.day))];
}

function matchesDayStates(course, dayStates = {}) {
    const courseDays = getCourseDays(course);

    return Object.entries(dayStates).every(([day, state]) => {
        if (state === "include") return courseDays.includes(day);
        if (state === "exclude") return !courseDays.includes(day);
        return true;
    });
}

function getCourseTimeSlotKeys(course) {
    const sessions = getCourseSessions(course);
    const keys = [];

    sessions.forEach((session) => {
        session.periods.forEach((period) => {
            keys.push(`${session.day}-${period}`);
        });
    });

    return [...new Set(keys)];
}

function matchesTimeSlots(course, timeSlots = {}) {
    const includeKeys = Object.entries(timeSlots)
        .filter(([, state]) => state === "include")
        .map(([key]) => key);

    const excludeKeys = Object.entries(timeSlots)
        .filter(([, state]) => state === "exclude")
        .map(([key]) => key);

    if (includeKeys.length === 0 && excludeKeys.length === 0) {
        return true;
    }

    const courseSlotKeys = getCourseTimeSlotKeys(course);

    // 포함 칸이 하나라도 있으면, 그중 하나 이상과 겹쳐야 함.
    if (includeKeys.length > 0) {
        const hasIncludedSlot = includeKeys.some((key) =>
            courseSlotKeys.includes(key)
        );

        if (!hasIncludedSlot) return false;
    }

    // 제외 칸과는 하나도 겹치면 안 됨.
    if (excludeKeys.length > 0) {
        const hasExcludedSlot = excludeKeys.some((key) =>
            courseSlotKeys.includes(key)
        );

        if (hasExcludedSlot) return false;
    }

    return true;
}

function isRemoteCourse(course) {
    const classType = course.instruction?.classType || "";
    const badges = course.badges || [];

    return (
        classType.includes("원격") ||
        classType.includes("병행") ||
        classType.includes("혼합") ||
        badges.includes("녹강") ||
        badges.includes("비대면") ||
        badges.includes("원격병행")
    );
}

function isEnglishCourse(course) {
    return (
        course.features?.isEnglish === true ||
        String(course.title || "").includes("영강") ||
        (course.instruction?.specialTypes || []).some((type) =>
            String(type).includes("외국어")
        )
    );
}

export function applyCourseFilters(courses, filters, options = {}) {
    const { baseCourses = [], getBlockReason } = options;

    let result = [...courses];

    if (filters.keyword?.trim()) {
        result = result.filter((course) =>
            matchesKeyword(
                course,
                filters.keyword,
                filters.searchTarget || "all"
            )
        );
    }

    if (filters.college?.enabled && filters.college.value) {
        result = result.filter(
            (course) => course.college === filters.college.value
        );
    }

    if (filters.department?.enabled && filters.department.value) {
        result = result.filter(
            (course) => course.department === filters.department.value
        );
    }

    result = result.filter((course) =>
        matchesDayStates(course, filters.dayStates)
    );

    result = result.filter((course) =>
        matchesTimeSlots(course, filters.timeSlots)
    );

    if (filters.credit) {
        result = result.filter(
            (course) => normalizeCredit(course.credit) === String(filters.credit)
        );
    }

    if (filters.courseType) {
        result = result.filter(
            (course) => (course.courseType || course.type) === filters.courseType
        );
    }

    if (filters.onlyAvailable && getBlockReason) {
        result = result.filter((course) => !getBlockReason(course, baseCourses));
    }

    if (filters.excludeDropRestricted) {
        result = result.filter(
            (course) => course.features?.isDropRestricted !== true
        );
    }

    if (filters.onlyMooc) {
        result = result.filter((course) => course.features?.isMooc === true);
    }

    if (filters.onlyFlexible) {
        result = result.filter(
            (course) => course.features?.isFlexibleSemester === true
        );
    }

    if (filters.onlyRemote) {
        result = result.filter(isRemoteCourse);
    }

    if (filters.englishMode === "only") {
        result = result.filter(isEnglishCourse);
    }

    if (filters.englishMode === "exclude") {
        result = result.filter((course) => !isEnglishCourse(course));
    }

    return result;
}