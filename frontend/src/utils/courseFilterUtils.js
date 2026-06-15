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
        courseTypes: [],
        generalArea: "",

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
    const priority = [
        "전공필수",
        "전공선택",
        "학문의기초",
        "교양",
        "학부공통",
        "교직",
        "평생교육사",
        "군사학"
    ];

    const options = [
        ...new Set(
            courses
                .map((course) => course.courseType || course.type)
                .filter(Boolean)
        )
    ];

    return options.sort((a, b) => {
        const aIndex = priority.indexOf(a);
        const bIndex = priority.indexOf(b);

        if (aIndex !== -1 || bIndex !== -1) {
            if (aIndex === -1) return 1;
            if (bIndex === -1) return -1;
            return aIndex - bIndex;
        }

        return a.localeCompare(b, "ko");
    });
}

function getSelectedCourseTypes(filters = {}) {
    if (Array.isArray(filters.courseTypes)) {
        return filters.courseTypes.filter(Boolean);
    }

    return filters.courseType ? [filters.courseType] : [];
}

const GENERAL_AREA_RULES = [
    {
        label: "언어/글쓰기",
        keywords: [
            "글쓰기",
            "english",
            "영어",
            "언어",
            "외국어",
            "일본어",
            "중국어",
            "스페인어",
            "프랑스어",
            "독일어",
            "말하기",
            "토론",
            "작문",
            "커뮤니케이션"
        ]
    },
    {
        label: "문학/예술",
        keywords: [
            "문학",
            "예술",
            "미술",
            "음악",
            "영화",
            "연극",
            "디자인",
            "사진",
            "창작",
            "시",
            "소설",
            "공연"
        ]
    },
    {
        label: "역사/문화",
        keywords: [
            "역사",
            "문화",
            "세계",
            "한국사",
            "동아시아",
            "서양",
            "문명",
            "고전",
            "전통"
        ]
    },
    {
        label: "사회/경제",
        keywords: [
            "사회",
            "경제",
            "경영",
            "정치",
            "법",
            "행정",
            "미디어",
            "심리",
            "교육",
            "젠더",
            "환경",
            "국제"
        ]
    },
    {
        label: "과학/기술",
        keywords: [
            "과학",
            "기술",
            "물리",
            "화학",
            "생명",
            "수학",
            "통계",
            "공학",
            "기초과학",
            "우주",
            "에너지"
        ]
    },
    {
        label: "디지털/AI",
        keywords: [
            "디지털",
            "ai",
            "인공지능",
            "데이터",
            "컴퓨터",
            "소프트웨어",
            "코딩",
            "프로그래밍",
            "알고리즘",
            "정보",
            "혁신"
        ]
    },
    {
        label: "윤리/철학",
        keywords: [
            "윤리",
            "철학",
            "사상",
            "인문",
            "종교",
            "인권",
            "가치",
            "논리",
            "삶"
        ]
    },
    {
        label: "진로/창업",
        keywords: [
            "진로",
            "창업",
            "세미나",
            "리더십",
            "취업",
            "직업",
            "캡스톤",
            "기업가"
        ]
    },
    {
        label: "체육/건강",
        keywords: [
            "체육",
            "스포츠",
            "운동",
            "건강",
            "요가",
            "댄스",
            "피트니스",
            "웰니스"
        ]
    }
];

function isGeneralEducation(course) {
    return (course.courseType || course.type) === "교양";
}

function getGeneralAreaSearchText(course) {
    return [
        course.title,
        course.name,
        course.groupName,
        course.department,
        course.college,
        course.description,
        course.summary,
        course.syllabusText,
        course.detailText,
        course.objective,
        course.overview,
        course.instruction?.classType,
        ...(course.hashtags || []),
        ...(course.tags || [])
    ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
}

export function getGeneralEducationArea(course) {
    if (!isGeneralEducation(course)) return "";

    const text = getGeneralAreaSearchText(course);
    const matchedRule = GENERAL_AREA_RULES.find((rule) =>
        rule.keywords.some((keyword) => text.includes(keyword.toLowerCase()))
    );

    return matchedRule?.label || "기타 교양";
}

export function getGeneralEducationAreaOptions(courses) {
    const availableAreas = new Set(
        courses
            .filter(isGeneralEducation)
            .map(getGeneralEducationArea)
            .filter(Boolean)
    );

    return GENERAL_AREA_RULES.map((rule) => rule.label)
        .filter((area) => availableAreas.has(area))
        .concat(availableAreas.has("기타 교양") ? ["기타 교양"] : []);
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
        code: [course.code, course.section, `${course.code}-${course.section}`],
        courseType: [
            course.courseType,
            course.type,
            course.courseDivisionCode,
            course.groupName
        ]
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

    if (searchTarget === "courseType") {
        return fields.courseType.some((value) =>
            normalizeText(value).includes(normalizedKeyword)
        );
    }

    // 전체 검색도 대학/학과는 제외.
    // 전체 = 과목명 + 교수자 + 학수번호 + 이수구분
    return [
        ...fields.title,
        ...fields.professor,
        ...fields.code,
        ...fields.courseType
    ].some((value) => normalizeText(value).includes(normalizedKeyword));
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

    if (
        getSelectedCourseTypes(filters).includes("교양") &&
        filters.department?.enabled &&
        filters.generalArea
    ) {
        result = result.filter(
            (course) =>
                !isGeneralEducation(course) ||
                getGeneralEducationArea(course) === filters.generalArea
        );
    } else if (filters.department?.enabled && filters.department.value) {
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

    const selectedCourseTypes = getSelectedCourseTypes(filters);

    if (selectedCourseTypes.length > 0) {
        result = result.filter(
            (course) => selectedCourseTypes.includes(course.courseType || course.type)
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
