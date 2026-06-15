import fs from "fs";
import path from "path";
import axios from "axios";
import * as cheerio from "cheerio";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, "../src/data");

const DEPARTMENTS_PATH = path.join(DATA_DIR, "sugangDepartments.json");
const CONFIG_PATH = path.join(DATA_DIR, "sugangConfig.json");

const COURSES_PATH = path.join(DATA_DIR, "courses.json");
const COURSE_KEYS_PATH = path.join(DATA_DIR, "courseKeys.json");
const RAW_PATH = path.join(DATA_DIR, "rawSugangResponse.json");

const DEFAULT_CONFIG = {
    year: "2026",
    term: "1R",
    syllabusTerm: "1R",
    campus: "1",
    gradCd: "0136",
    courseDivisions: [
        { code: "00", label: "전공", collectionMode: "department" },
        { code: "24", label: "학문의기초", collectionMode: "department" },
        { code: "01", label: "교양", collectionMode: "group" },
        { code: "30", label: "교직", collectionMode: "global" },
        { code: "41", label: "군사학", collectionMode: "global" },
        { code: "71", label: "평생교육사", collectionMode: "global" }
    ],
    liberalArtsGroups: [
        { code: "24", label: "1학년세미나" },
        { code: "23", label: "ACADEMIC ENGLISH" },
        { code: "49", label: "DS/AI" },
        { code: "48", label: "GLOBAL ENGLISH" },
        { code: "16", label: "과학과기술" },
        { code: "51", label: "교양 선택" },
        { code: "50", label: "교양 필수" },
        { code: "55", label: "교양선택(기초과학)" },
        { code: "54", label: "교양선택(외국어)" },
        { code: "10", label: "군사학" },
        { code: "44", label: "글쓰기" },
        { code: "18", label: "디지털혁신과인간" },
        { code: "13", label: "문학과예술" },
        { code: "15", label: "사회의이해" },
        { code: "32", label: "선택교양" },
        { code: "46", label: "선택교양(기초과학)" },
        { code: "11", label: "세계의문화" },
        { code: "12", label: "역사의탐구" },
        { code: "14", label: "윤리와사상" },
        { code: "17", label: "정량적사고" },
        { code: "52", label: "학문세계의탐구 I" },
        { code: "53", label: "학문세계의탐구 II" }
    ],
    language: "KOR",
    requestDelayMs: 800
};

function readJson(filePath, fallback) {
    if (!fs.existsSync(filePath)) {
        return fallback;
    }

    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

const sugangConfig = {
    ...DEFAULT_CONFIG,
    ...readJson(CONFIG_PATH, {})
};

const SUGANG_YEAR = process.env.SUGANG_YEAR || sugangConfig.year;
const SUGANG_TERM = process.env.SUGANG_TERM || sugangConfig.term;
const SYLLABUS_TERM =
    process.env.SYLLABUS_TERM || sugangConfig.syllabusTerm || sugangConfig.term;

const CAMPUS = sugangConfig.campus || "1";
const GRAD_CD = sugangConfig.gradCd || "0136";
const LANGUAGE = sugangConfig.language || "KOR";
const REQUEST_DELAY_MS = Number(sugangConfig.requestDelayMs || 800);
const COURSE_DIVISIONS =
    Array.isArray(sugangConfig.courseDivisions) && sugangConfig.courseDivisions.length > 0
        ? sugangConfig.courseDivisions
        : DEFAULT_CONFIG.courseDivisions;
const LIBERAL_ARTS_GROUPS =
    Array.isArray(sugangConfig.liberalArtsGroups) && sugangConfig.liberalArtsGroups.length > 0
        ? sugangConfig.liberalArtsGroups
        : DEFAULT_CONFIG.liberalArtsGroups;

// Chrome Network Payload에서 보이던 값.
// 요청 실패 시 실제 Payload의 strUserType 값으로 바꾸면 됨.
const STR_USER_TYPE = process.env.SUGANG_STR_USER_TYPE || ".....";

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function isYes(value) {
    return String(value || "").trim().toUpperCase() === "Y";
}

function cleanText(value) {
    return String(value || "")
        .replace(/<br\s*\/?>/gi, " ")
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .replace(/[ \t]+/g, " ")
        .replace(/\n+/g, " ")
        .trim();
}

function padSection(value) {
    return String(value || "00").padStart(2, "0");
}

function makeUid({ year, term, code, section }) {
    return `${year}-${term}-${code}-${section}`;
}

function buildSugangUrl() {
    return `https://sugang.korea.ac.kr/view?attribute=lectHakbuData&fake=${Date.now()}`;
}

function buildPayload(target) {
    const params = {
        pYear: SUGANG_YEAR,
        pTerm: SUGANG_TERM,
        pCampus: CAMPUS,
        pGradCd: GRAD_CD,
        pCourDiv: target.courseDivisionCode,

        pCol: target.pCol || "",
        pDept: target.pDept || "",
        pGroupCd: target.pGroupCd || "",
        pgroupcd: target.pGroupCd || "",

        pCredit: "",
        pDay: "",
        pStartTime: "",
        pEndTime: "",
        pProf: "",
        pCourCd: "",
        pCourNm: "",

        strYear: SUGANG_YEAR,
        strTerm: SUGANG_TERM,
        strUserType: STR_USER_TYPE
    };

    return new URLSearchParams(params);
}

function buildCollectionTargets(departments) {
    return COURSE_DIVISIONS.flatMap((division) => {
        const courseDivisionCode = division.code;
        const courseDivisionLabel = division.label;
        const collectionMode = division.collectionMode || "global";

        if (collectionMode === "department") {
            return departments.map((department) => ({
                ...department,
                courseDivisionCode,
                courseDivisionLabel,
                collectionMode,
                displayName: `${courseDivisionLabel}: ${department.collegeName} / ${department.departmentName}`
            }));
        }

        if (collectionMode === "group") {
            return LIBERAL_ARTS_GROUPS.map((group) => ({
                collegeName: courseDivisionLabel,
                pCol: "",
                departmentName: group.label,
                pDept: "",
                pGroupCd: group.code,
                groupLabel: group.label,
                courseDivisionCode,
                courseDivisionLabel,
                collectionMode,
                displayName: `${courseDivisionLabel}: ${group.label}`
            }));
        }

        return [
            {
                collegeName: courseDivisionLabel,
                pCol: "",
                departmentName: "전체",
                pDept: "",
                courseDivisionCode,
                courseDivisionLabel,
                collectionMode,
                displayName: `${courseDivisionLabel}: 전체`
            }
        ];
    });
}

async function fetchTargetCourses(target) {
    const url = buildSugangUrl();
    const payload = buildPayload(target);

    const response = await axios.post(url, payload.toString(), {
        responseType: "text",
        transformResponse: [(data) => data],
        headers: {
            Accept: "application/json, text/javascript, */*; q=0.01",
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            "User-Agent": "Mozilla/5.0",
            "X-Requested-With": "XMLHttpRequest",
            Referer: "https://sugang.korea.ac.kr/"
        }
    });

    return response.data;
}

function tryParseJson(text) {
    try {
        return JSON.parse(text);
    } catch {
        return null;
    }
}

function looksLikeCourseObject(item) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
        return false;
    }

    return Boolean(
        item.cour_cd ||
        item.courCd ||
        item.COUR_CD ||
        item.cour_nm ||
        item.courNm ||
        item.COUR_NM
    );
}

function extractRowsFromJson(data) {
    if (Array.isArray(data)) {
        return data;
    }

    const candidates = [];

    function walk(value, pathName = "") {
        if (Array.isArray(value)) {
            candidates.push({
                pathName,
                value
            });

            value.forEach((child, index) => {
                walk(child, `${pathName}[${index}]`);
            });

            return;
        }

        if (value && typeof value === "object") {
            Object.entries(value).forEach(([key, child]) => {
                walk(child, pathName ? `${pathName}.${key}` : key);
            });
        }
    }

    walk(data);

    const courseLikeArrays = candidates.filter(({ value }) => {
        return value.some(looksLikeCourseObject);
    });

    if (courseLikeArrays.length > 0) {
        courseLikeArrays.sort((a, b) => b.value.length - a.value.length);
        return courseLikeArrays[0].value;
    }

    candidates.sort((a, b) => b.value.length - a.value.length);
    return candidates[0]?.value || [];
}

function extractRowsFromHtml(html) {
    const $ = cheerio.load(html);
    const rows = [];

    $("tr").each((_, tr) => {
        const cells = $(tr)
            .find("th, td")
            .map((_, cell) => cleanText($(cell).text()))
            .get()
            .filter(Boolean);

        if (cells.length > 0) {
            rows.push(cells);
        }
    });

    return rows;
}

function findHtmlString(value) {
    if (typeof value === "string") {
        if (value.includes("<tr") || value.includes("<table")) {
            return value;
        }

        return "";
    }

    if (Array.isArray(value)) {
        for (const item of value) {
            const found = findHtmlString(item);
            if (found) return found;
        }
    }

    if (value && typeof value === "object") {
        for (const child of Object.values(value)) {
            const found = findHtmlString(child);
            if (found) return found;
        }
    }

    return "";
}

function extractRows(rawText) {
    const parsed = tryParseJson(rawText);

    if (parsed) {
        const html = findHtmlString(parsed);

        if (html) {
            return extractRowsFromHtml(html);
        }

        return extractRowsFromJson(parsed);
    }

    return extractRowsFromHtml(rawText);
}

function pickValue(raw, keys) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
        return "";
    }

    for (const key of keys) {
        if (raw[key] !== undefined && raw[key] !== null) {
            return cleanText(raw[key]);
        }
    }

    return "";
}

function parseCredit(value) {
    const match = String(value || "").match(/\d+/);
    return match ? Number(match[0]) : 0;
}

function expandPeriodText(periodText) {
    const periods = [];

    String(periodText || "")
        .split(",")
        .map((part) => part.trim())
        .forEach((part) => {
            if (!part) return;

            if (part.includes("-")) {
                const [start, end] = part.split("-").map(Number);

                if (!Number.isNaN(start) && !Number.isNaN(end)) {
                    for (let i = start; i <= end; i += 1) {
                        periods.push(i);
                    }
                }
            } else {
                const num = Number(part);

                if (!Number.isNaN(num)) {
                    periods.push(num);
                }
            }
        });

    return [...new Set(periods)].sort((a, b) => a - b);
}

function formatPeriods(periods) {
    if (!periods || periods.length === 0) return "";

    const sorted = [...periods].sort((a, b) => a - b);

    if (sorted.length === 1) {
        return String(sorted[0]);
    }

    const isConsecutive = sorted.every((period, index) => {
        if (index === 0) return true;
        return period === sorted[index - 1] + 1;
    });

    if (isConsecutive) {
        return `${sorted[0]}-${sorted[sorted.length - 1]}`;
    }

    return sorted.join(",");
}

function cleanScheduleText(value) {
    return String(value || "")
        .replace(/<br\s*\/?>/gi, " ")
        .replace(/\r\n/g, " ")
        .replace(/\r/g, " ")
        .replace(/\n/g, " ")
        .replace(/[ \t]+/g, " ")
        .trim();
}

function buildByDay(sessions) {
    const byDay = {};

    sessions.forEach((session) => {
        if (!byDay[session.day]) {
            byDay[session.day] = [];
        }

        byDay[session.day].push(...session.periods);
    });

    Object.keys(byDay).forEach((day) => {
        byDay[day] = [...new Set(byDay[day])].sort((a, b) => a - b);
    });

    return byDay;
}

function parseSchedule(timeRoom = "", applyDept = "") {
    const rawText = cleanText(timeRoom);
    const sessions = [];

    // 예:
    // 화(1-2) 우정간호학관 401호 목(2) 우정간호학관 401호
    // 화(4-6) 우정간호학관 201호
    const regex =
        /([월화수목금토일])\(([\d,\-\s,]+)\)\s*([\s\S]*?)(?=\s*[월화수목금토일]\(|$)/g;

    let match;

    while ((match = regex.exec(rawText)) !== null) {
        const day = match[1];
        const periodTextFromRaw = match[2];
        const room = cleanText(match[3]);

        const periods = expandPeriodText(periodTextFromRaw);
        const periodText = formatPeriods(periods);

        sessions.push({
            day,
            periods,
            periodText,
            room
        });
    }

    const rooms = [
        ...new Set(sessions.map((session) => session.room).filter(Boolean))
    ];

    const timeText = sessions
        .map((session) => `${session.day}(${session.periodText})`)
        .join(" / ");

    return {
        rawText,
        timeText,
        roomText: rooms.join(" / "),
        detailText: cleanText(applyDept),
        sessions,
        byDay: buildByDay(sessions),
        rooms
    };
}

function buildSyllabusUrl({ year, term, gradCd, code, section }) {
    const params = new URLSearchParams({
        year,
        term: SYLLABUS_TERM || term,
        grad_cd: gradCd,
        cour_cd: code,
        cour_cls: section
    });

    return `https://infodepot.korea.ac.kr/lecture1/lecsubjectPlanViewNew.jsp?${params.toString()}`;
}

function buildSpecialTypes(raw, title) {
    const specialTypes = [];

    if (isYes(raw.mooc_yn)) {
        specialTypes.push("MOOC");
    }

    if (isYes(raw.flipped_class_yn)) {
        specialTypes.push("Flipped Class(거꾸로수업)");
    }

    if (isYes(raw.eng100) || title.includes("(영강)") || title.includes("영강")) {
        specialTypes.push("외국어(영어)");
    }

    if (isYes(raw.tutorial_yn)) {
        specialTypes.push("튜토리얼");
    }

    if (isYes(raw.nemo_yn)) {
        specialTypes.push("네모클래스");
    }

    if (isYes(raw.flexible_school_yn)) {
        specialTypes.push("유연학기(집중수업)");
    }

    return [...new Set(specialTypes)];
}

function buildInstruction(raw, title) {
    const canWithdraw =
        raw.drop_lmt_yn === "Y"
            ? false
            : raw.drop_lmt_yn === "N"
                ? true
                : null;

    const unattendedExam =
        raw.no_supervisor_yn === "Y"
            ? true
            : raw.no_supervisor_yn === "N"
                ? false
                : null;

    return {
        // 강의계획안의 수업방법 표에서 보강 가능:
        // 대면 / 병행 / 혼합 / 원격(녹화) / 원격(실시간)
        classType: null,

        // 과목조회 API에서 일부 확인 가능
        specialTypes: buildSpecialTypes(raw, title),

        // 강의계획안에서 보강:
        // 이론강의 / 발표 / 토론 / 실험 / 실습 / 퀴즈 등
        components: [],

        // 과목조회 API에서는 absolute_yn만 확인 가능.
        // 상대평가/PF 여부는 강의계획안에서 보강.
        gradingType: isYes(raw.absolute_yn) ? "절대평가" : null,

        canWithdraw,
        unattendedExam
    };
}

function buildFeatures(raw, title) {
    return {
        isLimited: isYes(raw.lmt_yn),
        isEnabled: isYes(raw.enable),

        isFlexibleSemester: isYes(raw.flexible_school_yn),
        isMooc: isYes(raw.mooc_yn),
        isEnglish:
            isYes(raw.eng100) || title.includes("(영강)") || title.includes("영강"),
        isFlippedClass: isYes(raw.flipped_class_yn),
        isTutorial: isYes(raw.tutorial_yn),
        isNemoClass: isYes(raw.nemo_yn),

        isExchangeStudentAvailable: isYes(raw.exch_cor_yn),
        isWaitingEnabled: isYes(raw.waiting_yn),
        isAttendanceFree: isYes(raw.attend_free_yn),

        isDropRestricted: isYes(raw.drop_lmt_yn),
        isAbsoluteGrading: isYes(raw.absolute_yn),
        isUnattendedExam: isYes(raw.no_supervisor_yn)
    };
}

function buildFlexiblePeriod(raw) {
    if (!isYes(raw.flexible_school_yn)) {
        return null;
    }

    return {
        from: raw.flexible_fr_dt || "",
        to: raw.flexible_to_dt || "",
        weeks: Number(raw.flexible_term || 0)
    };
}

function buildBadges({ instruction, features }) {
    const badges = [];

    // 중요 뱃지만 표시
    if (features.isMooc) {
        badges.push("MOOC");
    }

    if (features.isDropRestricted) {
        badges.push("수강포기제한");
    }

    if (features.isExchangeStudentAvailable) {
        badges.push("교환학생");
    }

    if (features.isFlexibleSemester) {
        badges.push("유연학기");
    }

    if (features.isAttendanceFree) {
        badges.push("출석자율");
    }

    const classType = instruction.classType || "";

    if (classType.includes("원격(녹화)")) {
        badges.push("녹강");
    }

    if (classType.includes("원격(실시간)")) {
        badges.push("비대면");
    }

    if (classType.includes("병행") || classType.includes("혼합")) {
        badges.push("원격병행");
    }

    return [...new Set(badges)];
}

function normalizeHashtag(text) {
    return String(text || "")
        .replace(/\s+/g, "-")
        .replace(/[()]/g, "")
        .replace(/거꾸로수업/g, "flipped-class")
        .replace(/Flipped-Class/gi, "flipped-class")
        .trim();
}

function buildHashtags({ instruction, features }) {
    const hashtags = [];

    const specialTypes = instruction.specialTypes || [];
    const components = instruction.components || [];

    specialTypes.forEach((type) => {
        // 중요 뱃지로 빠지는 것들은 해시태그에서 제외
        if (type.includes("MOOC")) return;
        if (type.includes("유연학기")) return;
        if (type.includes("외국어")) return;

        if (type.includes("Flipped")) {
            hashtags.push("flipped-class");
            return;
        }

        hashtags.push(normalizeHashtag(type));
    });

    components.forEach((component) => {
        hashtags.push(normalizeHashtag(component));
    });

    if (features.isTutorial) {
        hashtags.push("튜토리얼");
    }

    if (features.isNemoClass) {
        hashtags.push("네모클래스");
    }

    if (features.isFlippedClass) {
        hashtags.push("flipped-class");
    }

    if (instruction.gradingType) {
        hashtags.push(normalizeHashtag(instruction.gradingType));
    }

    return [...new Set(hashtags.filter(Boolean))].map((tag) =>
        tag.startsWith("#") ? tag : `#${tag}`
    );
}

function normalizeObjectRow(raw, department, index, target = {}) {
    const year = String(raw.year || SUGANG_YEAR);
    const term = String(raw.term || SUGANG_TERM);

    const code = String(raw.cour_cd || "");
    const section = padSection(raw.cour_cls);

    const title = String(raw.cour_nm || "");
    const courseType = String(raw.isu_nm || target.courseDivisionLabel || "");
    const courseDivisionCode = String(raw.cour_div || target.courseDivisionCode || "");

    const credit = Number(raw.credit || 0);
    const professor = String(raw.prof_nm || "");

    const schedule = parseSchedule(raw.time_room, raw.apply_dept);
    const instruction = buildInstruction(raw, title);
    const features = buildFeatures(raw, title);
    const badges = buildBadges({ instruction, features });
    const hashtags = buildHashtags({ instruction, features });

    const course = {
        id: index + 1,
        uid: makeUid({
            year,
            term,
            code,
            section
        }),

        year,
        term,
        campus: raw.campus || "",

        code,
        section,
        title,
        courseType,

        // 기존 프론트 호환용
        type: courseType,

        courseDivisionCode,
        credit,

        college: department.collegeName,
        collegeCode: department.pCol,

        department: raw.department || department.departmentName,
        departmentCode: raw.dept_cd || department.pDept,
        groupCode: target.pGroupCd || "",
        groupName: target.groupLabel || "",

        professor,

        schedule,

        // 기존 프론트 호환용
        timeText: schedule.timeText,
        room: schedule.roomText,
        days: Object.keys(schedule.byDay),
        periods: [
            ...new Set(schedule.sessions.flatMap((session) => session.periods))
        ].sort((a, b) => a - b),

        instruction,
        features,
        flexiblePeriod: buildFlexiblePeriod(raw),

        badges,
        hashtags,

        // 기존 프론트가 tags/flags를 보고 있어도 깨지지 않게 유지
        tags: badges,
        flags: [],

        syllabusUrl: buildSyllabusUrl({
            year,
            term,
            gradCd: raw.courgrad_cd || GRAD_CD,
            code,
            section
        }),

        source: {
            params: raw.params || `${code}@${section}`,
            rowid: raw.rowid ?? null,
            rawDepartmentCode: raw.dept_cd || "",
            rawCollegeCode: raw.col_cd || "",
            rawCourseDivisionCode: raw.cour_div || "",
            collectionMode: target.collectionMode || "",
            collectionLabel: target.displayName || "",
            raw
        }
    };

    return course;
}

function normalizeArrayRow(row, department, index, target = {}) {
    // 응답이 HTML table로 오는 경우를 위한 fallback.
    // 실제 고려대 API는 보통 object row라 이 경로는 거의 안 타는 게 정상.
    const guessed = {
        courseType: row[0] || "",
        code: row[1] || "",
        section: row[2] || "00",
        title: row[3] || "",
        credit: row[4] || "",
        professor: row[5] || "",
        timeRoom: row[6] || "",
        room: row[7] || ""
    };

    const year = SUGANG_YEAR;
    const term = SUGANG_TERM;
    const code = String(guessed.code || "");
    const section = padSection(guessed.section);
    const title = String(guessed.title || "");
    const courseType = String(guessed.courseType || target.courseDivisionLabel || "");
    const credit = parseCredit(guessed.credit);
    const professor = String(guessed.professor || "");

    const schedule = parseSchedule(
        guessed.room ? `${guessed.timeRoom} ${guessed.room}` : guessed.timeRoom,
        ""
    );

    const instruction = {
        classType: null,
        specialTypes: [],
        components: [],
        gradingType: null,
        canWithdraw: null,
        unattendedExam: null
    };

    const features = {
        isLimited: false,
        isEnabled: false,
        isFlexibleSemester: false,
        isMooc: false,
        isEnglish: title.includes("(영강)") || title.includes("영강"),
        isFlippedClass: false,
        isTutorial: false,
        isNemoClass: false,
        isExchangeStudentAvailable: false,
        isWaitingEnabled: false,
        isAttendanceFree: false,
        isDropRestricted: false,
        isAbsoluteGrading: false,
        isUnattendedExam: false
    };

    const badges = buildBadges({ instruction, features });

    return {
        id: index + 1,
        uid: makeUid({
            year,
            term,
            code,
            section
        }),

        year,
        term,
        campus: "",

        code,
        section,
        title,
        courseType,
        type: courseType,
        courseDivisionCode: target.courseDivisionCode || "",
        credit,

        college: department.collegeName,
        collegeCode: department.pCol,
        department: department.departmentName,
        departmentCode: department.pDept,
        groupCode: target.pGroupCd || "",
        groupName: target.groupLabel || "",

        professor,

        schedule,

        timeText: schedule.timeText,
        room: schedule.rooms.join(" / "),
        days: Object.keys(schedule.byDay),
        periods: [
            ...new Set(schedule.sessions.flatMap((session) => session.periods))
        ].sort((a, b) => a - b),

        instruction,
        features,
        flexiblePeriod: null,

        badges,
        tags: badges,
        flags: badges.filter((badge) => ["MOOC", "영강"].includes(badge)),

        syllabusUrl: buildSyllabusUrl({
            year,
            term,
            gradCd: GRAD_CD,
            code,
            section
        }),

        source: {
            params: `${code}@${section}`,
            rowid: null,
            collectionMode: target.collectionMode || "",
            collectionLabel: target.displayName || "",
            raw: row
        }
    };
}

function normalizeCourse(raw, department, index, target = {}) {
    if (Array.isArray(raw)) {
        return normalizeArrayRow(raw, department, index, target);
    }

    return normalizeObjectRow(raw, department, index, target);
}

function isValidCourse(course) {
    return Boolean(course.code && course.section && course.title);
}

function removeDuplicates(courses) {
    const map = new Map();

    for (const course of courses) {
        const key = `${course.year}_${course.term}_${course.code}_${course.section}`;

        if (!map.has(key)) {
            map.set(key, course);
            continue;
        }

        // 같은 과목이 여러 학과에서 중복 조회되는 경우가 있을 수 있음.
        // 먼저 들어온 값을 유지하되, departmentsListedIn에 출처를 누적.
        const existing = map.get(key);

        const departmentsListedIn = [
            ...(existing.departmentsListedIn || [
                {
                    college: existing.college,
                    department: existing.department
                }
            ]),
            {
                college: course.college,
                department: course.department
            }
        ];

        map.set(key, {
            ...existing,
            departmentsListedIn: Array.from(
                new Map(
                    departmentsListedIn.map((item) => [
                        `${item.college}_${item.department}`,
                        item
                    ])
                ).values()
            )
        });
    }

    return [...map.values()].map((course, index) => ({
        ...course,
        id: index + 1
    }));
}

function flattenDepartmentConfigs(colleges) {
    return colleges.flatMap((college) => {
        return (college.departments || [])
            .filter((department) => department.enabled !== false)
            .map((department) => ({
                collegeName: college.collegeName,
                pCol: college.pCol,
                departmentName: department.departmentName,
                pDept: department.pDept
            }));
    });
}

function buildCourseKeys(courses) {
    return courses.map((course) => ({
        year: course.year,
        term: course.term,
        cour_cd: course.code,
        cour_cls: course.section,
        title: course.title,
        professor: course.professor,
        syllabusUrl: course.syllabusUrl
    }));
}

function ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
}

async function main() {
    ensureDataDir();

    const colleges = readJson(DEPARTMENTS_PATH, []);
    const departments = flattenDepartmentConfigs(colleges);

    if (departments.length === 0) {
        throw new Error(
            "sugangDepartments.json에서 수집할 학과 정보를 찾지 못했습니다."
        );
    }

    console.log("=== 고려대 과목 동기화 시작 ===");
    console.log("조회 연도:", SUGANG_YEAR);
    console.log("조회 학기:", SUGANG_TERM);
    console.log("강의계획안 학기:", SYLLABUS_TERM);
    console.log("캠퍼스:", CAMPUS);
    console.log("학부/대학원 코드:", GRAD_CD);
    const targets = buildCollectionTargets(departments);

    console.log(
        "과목구분:",
        COURSE_DIVISIONS.map((division) => `${division.label}(${division.code})`).join(", ")
    );
    console.log(`수집 대상 학과 수: ${departments.length}`);
    console.log(`수집 요청 타깃 수: ${targets.length}`);
    console.log("");

    const allRawRows = [];
    const allCourses = [];

    for (const target of targets) {
        console.log(`과목 수집 중: ${target.displayName}`);

        try {
            const rawText = await fetchTargetCourses(target);
            const rows = extractRows(rawText);

            console.log(`  응답 row 수: ${rows.length}`);

            allRawRows.push({
                target,
                rowCount: rows.length,
                rows
            });

            for (const row of rows) {
                const course = normalizeCourse(row, target, allCourses.length, target);

                if (isValidCourse(course)) {
                    allCourses.push(course);
                }
            }
        } catch (error) {
            console.error(`  실패: ${target.displayName}`);

            if (error.response) {
                console.error("  status:", error.response.status);
                console.error("  data:", error.response.data);
            } else {
                console.error("  message:", error.message);
            }

            allRawRows.push({
                target,
                rowCount: 0,
                error: error.message,
                rows: []
            });
        }

        await sleep(REQUEST_DELAY_MS);
    }

    const dedupedCourses = removeDuplicates(allCourses);
    const courseKeys = buildCourseKeys(dedupedCourses);

    fs.writeFileSync(RAW_PATH, JSON.stringify(allRawRows, null, 2), "utf-8");
    fs.writeFileSync(
        COURSES_PATH,
        JSON.stringify(dedupedCourses, null, 2),
        "utf-8"
    );
    fs.writeFileSync(
        COURSE_KEYS_PATH,
        JSON.stringify(courseKeys, null, 2),
        "utf-8"
    );

    console.log("");
    console.log("=== 고려대 과목 동기화 완료 ===");
    console.log(`원본 row 수: ${allCourses.length}`);
    console.log(`최종 과목 수: ${dedupedCourses.length}`);
    console.log(`저장 완료: ${RAW_PATH}`);
    console.log(`저장 완료: ${COURSES_PATH}`);
    console.log(`저장 완료: ${COURSE_KEYS_PATH}`);
}

main().catch((error) => {
    console.error("과목 동기화 실패");

    if (error.response) {
        console.error("status:", error.response.status);
        console.error("data:", error.response.data);
    } else {
        console.error(error.message);
    }

    process.exit(1);
});
