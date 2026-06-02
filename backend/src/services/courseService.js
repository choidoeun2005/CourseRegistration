import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import openai from "./openaiClient.js";
import { getExistingVectorStoreId } from "./syllabusService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const coursesPath = path.join(__dirname, "../data/courses.json");

function readCourses() {
    if (!fs.existsSync(coursesPath)) {
        return [];
    }

    const rawData = fs.readFileSync(coursesPath, "utf-8");
    return JSON.parse(rawData);
}

export function getAllCourses(query = {}) {
    let courses = readCourses();

    const {
        keyword,
        college,
        department,
        credit,
        includeDays,
        excludeDays
    } = query;

    if (keyword) {
        const lowerKeyword = keyword.toLowerCase();

        courses = courses.filter((course) => {
            const targetText = `${course.title} ${course.code} ${course.professor}`;
            return targetText.toLowerCase().includes(lowerKeyword);
        });
    }

    if (college) {
        courses = courses.filter((course) => course.college === college);
    }

    if (department) {
        courses = courses.filter((course) => course.department === department);
    }

    if (credit) {
        courses = courses.filter(
            (course) => String(course.credit) === String(credit)
        );
    }

    if (includeDays) {
        const days = includeDays.split(",");

        courses = courses.filter((course) =>
            days.every((day) => course.days.includes(day))
        );
    }

    if (excludeDays) {
        const days = excludeDays.split(",");

        courses = courses.filter((course) =>
            days.every((day) => !course.days.includes(day))
        );
    }

    return courses;
}

export function getCourseById(courseId) {
    const courses = readCourses();
    return courses.find((course) => course.id === Number(courseId));
}

export async function recommendCourses(prompt = "") {
    const courses = readCourses();
    const vectorStoreId = getExistingVectorStoreId();

    const courseSummary = courses.map((course) => ({
        id: course.id,
        title: course.title,
        code: course.code,
        professor: course.professor,
        credit: course.credit,
        time: course.timeText,
        room: course.room,
        tags: course.tags,
        syllabusUrl: course.syllabusUrl,
        prerequisites: course.prerequisites || [],
        recommendedBackground: course.recommendedBackground || [],
        difficulty: course.difficulty || "",
        workload: course.workload || "",
        keywords: course.keywords || []
    }));

    const systemPrompt = `
너는 대학 수강신청 추천 도우미야.

목표:
- 사용자의 관심사, 선수지식, 학년, 부담 정도를 고려해 과목을 추천한다.
- 반드시 제공된 과목 목록 안에서만 추천한다.
- 답변은 한국어로 한다.

반드시 아래 JSON 형식만 반환해라.
마크다운 코드블록은 쓰지 마라.

{
  "message": "추천 이유 요약",
  "recommendedCourseIds": [1, 2, 3]
}
`;

    const userPrompt = `
사용자 요청:
${prompt}

현재 시스템에 등록된 과목 목록:
${JSON.stringify(courseSummary, null, 2)}
`;

    const requestBody = {
        model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
        input: [
            {
                role: "system",
                content: systemPrompt
            },
            {
                role: "user",
                content: userPrompt
            }
        ]
    };

    if (vectorStoreId) {
        requestBody.tools = [
            {
                type: "file_search",
                vector_store_ids: [vectorStoreId],
                max_num_results: 5
            }
        ];
    }

    const response = await openai.responses.create(requestBody);

    const text = response.output_text || "";

    let parsed;

    try {
        parsed = JSON.parse(text);
    } catch {
        parsed = {
            message: text || "추천 결과를 생성했지만 JSON 형식 변환에 실패했습니다.",
            recommendedCourseIds: []
        };
    }

    const recommendedCourses = courses.filter((course) =>
        parsed.recommendedCourseIds?.includes(course.id)
    );

    return {
        message: parsed.message,
        courses: recommendedCourses
    };
}