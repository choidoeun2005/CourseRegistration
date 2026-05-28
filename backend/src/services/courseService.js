import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const coursesPath = path.join(__dirname, "../data/courses.json");

function readCourses() {
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
        courses = courses.filter((course) => String(course.credit) === String(credit));
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

export function recommendCourses(prompt = "") {
    const courses = readCourses();

    const aiKeywords = ["AI", "인공지능", "머신러닝", "딥러닝", "강화학습", "ML"];
    const statisticsKeywords = ["통계", "회귀", "기초통계"];

    const hasAiInterest = aiKeywords.some((word) => prompt.includes(word));
    const hasStatisticsConcern = statisticsKeywords.some((word) =>
        prompt.includes(word)
    );

    if (hasAiInterest || hasStatisticsConcern) {
        return {
            message:
                "통계학 지식이 많지 않은데 AI, ML에 관심이 있다면 입문자용 AI 과목과 기초적인 딥러닝 과목을 추천해요.",
            courses: courses.filter((course) =>
                ["인공지능", "딥러닝", "강화학습"].includes(course.title)
            )
        };
    }

    return {
        message:
            "입력한 관심사와 가까운 과목을 추천했어요. 강의 시간과 선수지식을 함께 확인해보세요.",
        courses: courses.slice(0, 4)
    };
}
