import { useState } from "react";
import CourseCard from "../components/CourseCard.jsx";
import Button from "../components/Button.jsx";
import { fetchRecommendedCourses } from "../api/courseApi";

function RecommendPage({ likedCourseIds, onToggleLike }) {
    const [prompt, setPrompt] = useState("");
    const [answer, setAnswer] = useState("");
    const [recommendedCourses, setRecommendedCourses] = useState([]);
    const [loading, setLoading] = useState(false);

    const handleRecommend = async () => {
        setLoading(true);

        try {
            const result = await fetchRecommendedCourses(prompt);
            setAnswer(result.message);
            setRecommendedCourses(result.courses);
        } catch (error) {
            setAnswer(error.message || "추천 결과를 불러오지 못했습니다.");
            setRecommendedCourses([]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="recommend-page">
            <h2>🪄 과목 추천 마법사</h2>

            <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="어떤 과목을 원하시는지 자유롭게 말해주세요!"
            />

            <Button variant="primary" onClick={handleRecommend}>
                {loading ? "추천 중..." : "추천받기"}
            </Button>

            {answer && (
                <section className="recommend-result">
                    <div className="chat-answer">
                        <strong>추천 결과</strong>
                        <p>{answer}</p>
                    </div>

                    <div className="course-list">
                        {recommendedCourses.map((course) => (
                            <CourseCard
                                key={course.id}
                                course={course}
                                liked={likedCourseIds.includes(course.id)}
                                inTimetable={false}
                                onToggleLike={onToggleLike}
                                onToggleTimetable={() => {}}
                            />
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}

export default RecommendPage;