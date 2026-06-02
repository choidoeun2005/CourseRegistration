import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import openai from "./openaiClient.js";
import { getExistingVectorStoreId } from "./syllabusService.js";
import {
    createConversation,
    getConversation,
    saveConversation
} from "./conversationStore.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const coursesPath = path.join(__dirname, "../data/courses.json");

function readCourses() {
    const rawData = fs.readFileSync(coursesPath, "utf-8");
    return JSON.parse(rawData);
}

function pickMockRecommendedCourseIds(message, courses) {
    const lower = message.toLowerCase();

    if (
        message.includes("AI") ||
        message.includes("인공지능") ||
        message.includes("머신러닝") ||
        message.includes("딥러닝") ||
        lower.includes("machine learning")
    ) {
        return courses
            .filter((course) =>
                ["인공지능", "딥러닝", "강화학습"].includes(course.title)
            )
            .map((course) => course.id);
    }

    if (message.includes("통계") || message.includes("부담")) {
        return courses
            .filter((course) =>
                ["인공지능", "자료구조", "데이터베이스"].includes(course.title)
            )
            .map((course) => course.id);
    }

    return courses.slice(0, 4).map((course) => course.id);
}

function buildCourseSummary(courses) {
    return courses.map((course) => ({
        id: course.id,
        title: course.title,
        code: course.code,
        professor: course.professor,
        credit: course.credit,
        time: course.timeText,
        room: course.room,
        tags: course.tags,
        prerequisites: course.prerequisites || [],
        recommendedBackground: course.recommendedBackground || [],
        difficulty: course.difficulty || "",
        workload: course.workload || "",
        keywords: course.keywords || []
    }));
}

export async function handleRecommendChat({ message, conversationId }) {
    const courses = readCourses();

    let currentConversationId = conversationId;
    let conversation = currentConversationId
        ? getConversation(currentConversationId)
        : null;

    if (!conversation) {
        currentConversationId = createConversation();
        conversation = getConversation(currentConversationId);
    }

    conversation.messages.push({
        role: "user",
        content: message
    });

    const useMock = process.env.USE_MOCK_RECOMMENDATION === "true";

    if (useMock) {
        const recommendedCourseIds = pickMockRecommendedCourseIds(message, courses);

        const recommendedCourses = courses.filter((course) =>
            recommendedCourseIds.includes(course.id)
        );

        const assistantMessage =
            "요청하신 조건을 바탕으로 추천 과목을 갱신했어요. 조건을 더 말해주면 추천 결과를 다시 조정할 수 있어요.";

        conversation.messages.push({
            role: "assistant",
            content: assistantMessage
        });

        saveConversation(currentConversationId, conversation);

        return {
            conversationId: currentConversationId,
            message: assistantMessage,
            recommendedCourseIds,
            courses: recommendedCourses
        };
    }

    const courseSummary = buildCourseSummary(courses);
    const vectorStoreId = getExistingVectorStoreId();

    const systemPrompt = `
너는 대학 수강신청 추천 도우미야.

목표:
- 사용자와 대화하면서 조건을 계속 반영해 추천 과목을 바꾼다.
- 반드시 제공된 과목 목록 안에서만 추천한다.
- 선수과목, 권장 배경지식, 난이도, 과제 부담, 강의 시간, 사용자의 선호를 고려한다.
- 강의계획서 PDF 검색 결과가 있으면 그 내용을 근거로 활용한다.
- 답변은 한국어로 한다.

반드시 아래 JSON 형식만 반환해라.
마크다운 코드블록은 쓰지 마라.

{
  "message": "사용자에게 보여줄 추천 설명",
  "recommendedCourseIds": [1, 2, 3]
}
`;

    const messagesForLLM = [
        {
            role: "system",
            content: systemPrompt
        },
        {
            role: "user",
            content: `
현재 시스템에 등록된 과목 목록:
${JSON.stringify(courseSummary, null, 2)}
`
        },
        ...conversation.messages
    ];

    const requestBody = {
        model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
        input: messagesForLLM
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
    } catch (error) {
        parsed = {
            message: text || "추천 결과를 생성했지만 JSON 변환에 실패했습니다.",
            recommendedCourseIds: []
        };
    }

    const recommendedCourseIds = parsed.recommendedCourseIds || [];

    const recommendedCourses = courses.filter((course) =>
        recommendedCourseIds.includes(course.id)
    );

    conversation.messages.push({
        role: "assistant",
        content: parsed.message
    });

    saveConversation(currentConversationId, conversation);

    return {
        conversationId: currentConversationId,
        message: parsed.message,
        recommendedCourseIds,
        courses: recommendedCourses
    };
}