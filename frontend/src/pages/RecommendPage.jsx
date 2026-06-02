import { useState } from "react";

import CourseCard from "../components/CourseCard.jsx";
import Button from "../components/Button.jsx";
import { sendRecommendationChat } from "../api/recommendApi";

function RecommendPage({
                           likedCourseIds,
                           onToggleLike,
                           onToggleTimetable = () => {}
                       }) {
    const [messages, setMessages] = useState([
        {
            role: "assistant",
            content:
                "어떤 과목을 원하시는지 자유롭게 말해주세요. 관심 분야, 선수지식, 피하고 싶은 요일, 과제 부담 등을 함께 말해주면 더 잘 추천할 수 있어요."
        }
    ]);

    const [input, setInput] = useState("");
    const [recommendedCourses, setRecommendedCourses] = useState([]);
    const [conversationId, setConversationId] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleSend = async () => {
        const trimmedInput = input.trim();
        if (!trimmedInput || loading) return;

        const userMessage = {
            role: "user",
            content: trimmedInput
        };

        setMessages((prev) => [...prev, userMessage]);
        setInput("");
        setLoading(true);

        try {
            const result = await sendRecommendationChat({
                message: trimmedInput,
                conversationId
            });

            setConversationId(result.conversationId);

            setMessages((prev) => [
                ...prev,
                {
                    role: "assistant",
                    content: result.message
                }
            ]);

            setRecommendedCourses(result.courses || []);
        } catch (error) {
            console.error("추천 채팅 에러:", error);

            setMessages((prev) => [
                ...prev,
                {
                    role: "assistant",
                    content:
                        error?.message ||
                        "추천 요청에 실패했습니다. 백엔드 서버 상태를 확인해주세요."
                }
            ]);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (event) => {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="recommend-layout">
            <section className="chat-panel">
                <div className="chat-header">
                    <h2>🪄 과목 추천 마법사</h2>
                    <p>대화하면서 조건을 추가하면 추천 과목이 오른쪽에서 바뀝니다.</p>
                </div>

                <div className="chat-message-list">
                    {messages.map((message, index) => (
                        <div
                            key={index}
                            className={`chat-message ${
                                message.role === "user" ? "user-message" : "assistant-message"
                            }`}
                        >
                            <div className="message-role">
                                {message.role === "user" ? "나" : "추천 마법사"}
                            </div>
                            <div className="message-content">{message.content}</div>
                        </div>
                    ))}

                    {loading && (
                        <div className="chat-message assistant-message">
                            <div className="message-role">추천 마법사</div>
                            <div className="message-content">추천 과목을 찾는 중...</div>
                        </div>
                    )}
                </div>

                <div className="chat-input-box">
          <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="예: 통계 기초가 부족한데 AI, 머신러닝 쪽 과목을 추천해줘. 금요일 수업은 피하고 싶어."
          />

                    <Button variant="primary" onClick={handleSend} disabled={loading}>
                        보내기
                    </Button>
                </div>
            </section>

            <section className="recommend-panel">
                <div className="recommend-panel-header">
                    <h2>추천 과목</h2>
                    <p>{recommendedCourses.length}개 과목이 추천되었습니다.</p>
                </div>

                {recommendedCourses.length === 0 ? (
                    <div className="empty-recommendation">
                        아직 추천 과목이 없습니다.
                        <br />
                        왼쪽 채팅창에 원하는 조건을 입력해보세요.
                    </div>
                ) : (
                    <div className="course-list">
                        {recommendedCourses.map((course) => (
                            <CourseCard
                                key={course.id}
                                course={course}
                                liked={likedCourseIds.includes(course.id)}
                                inTimetable={false}
                                blockReason=""
                                registrationOpen={false}
                                onToggleLike={onToggleLike}
                                onToggleTimetable={onToggleTimetable}
                                onEnrollCourse={() => {}}
                            />
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}

export default RecommendPage;