import { useEffect, useMemo, useState } from "react";

import useCourses from "../hooks/useCourses";
import CourseCard from "../components/CourseCard.jsx";
import Timetable from "../components/Timetable.jsx";
import { hasTimeConflict } from "../utils/timeUtils";

function CartPage({
                      likedCourseIds,
                      timetableCourseIds,
                      enrolledCourseIds,
                      quickEnroll,
                      onToggleLike,
                      onToggleTimetable,
                      onEnrollCourse
                  }) {
    const { courses, loading, error } = useCourses();
    const [viewType, setViewType] = useState("list");
    const [queueMessage, setQueueMessage] = useState("");

    const likedCourses = useMemo(
        () => courses.filter((course) => likedCourseIds.includes(course.id)),
        [courses, likedCourseIds]
    );

    const timetableCourses = useMemo(
        () => courses.filter((course) => timetableCourseIds.includes(course.id)),
        [courses, timetableCourseIds]
    );

    const handleEnroll = async (courseId) => {
        const result = await onEnrollCourse(courseId);

        if (result.success) {
            setQueueMessage(
                `${result.order}번째 순서입니다. TIP) ${result.tip || "행운을 빌어요!"}`
            );
        } else {
            setQueueMessage(result.message);
        }
    };

    useEffect(() => {
        if (!quickEnroll) return;

        const handleKeyDown = (event) => {
            if (!event.ctrlKey) return;

            const index = Number(event.key) - 1;
            const targetCourse = likedCourses[index];

            if (targetCourse) {
                handleEnroll(targetCourse.id);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [quickEnroll, likedCourses]);

    if (loading) return <div className="loading">관심과목을 불러오는 중...</div>;
    if (error) return <div className="loading">{error}</div>;

    return (
        <div className="content-page">
            <h2 className="page-title">내관심과목</h2>

            <section className="result-section">
                <div className="result-header">
                    <strong>관심과목 {likedCourses.length}개</strong>

                    <div className="view-controls">
                        <span>정렬</span>
                        <select defaultValue="time">
                            <option value="time">시간순</option>
                            <option value="name">이름순</option>
                        </select>

                        <span>보기</span>
                        <button
                            className={viewType === "list" ? "selected-view" : ""}
                            onClick={() => setViewType("list")}
                        >
                            리스트
                        </button>
                        <button
                            className={viewType === "timetable" ? "selected-view" : ""}
                            onClick={() => setViewType("timetable")}
                        >
                            시간표
                        </button>
                    </div>
                </div>

                {viewType === "timetable" && (
                    <div className="split-layout">
                        <Timetable courses={timetableCourses} />

                        <div className="course-list narrow">
                            {likedCourses.map((course, index) => {
                                const conflict = hasTimeConflict(course, timetableCourses);

                                return (
                                    <CourseCard
                                        key={course.id}
                                        course={course}
                                        liked={likedCourseIds.includes(course.id)}
                                        inTimetable={timetableCourseIds.includes(course.id)}
                                        enrolled={enrolledCourseIds.includes(course.id)}
                                        conflict={conflict}
                                        showEnrollButton={quickEnroll}
                                        quickIndex={index + 1}
                                        onToggleLike={onToggleLike}
                                        onToggleTimetable={onToggleTimetable}
                                        onEnrollCourse={handleEnroll}
                                    />
                                );
                            })}
                        </div>
                    </div>
                )}

                {viewType === "list" && (
                    <div className="course-list">
                        {likedCourses.map((course, index) => {
                            const conflict = hasTimeConflict(course, timetableCourses);

                            return (
                                <CourseCard
                                    key={course.id}
                                    course={course}
                                    liked={likedCourseIds.includes(course.id)}
                                    inTimetable={timetableCourseIds.includes(course.id)}
                                    enrolled={enrolledCourseIds.includes(course.id)}
                                    conflict={conflict}
                                    showEnrollButton={quickEnroll}
                                    quickIndex={index + 1}
                                    onToggleLike={onToggleLike}
                                    onToggleTimetable={onToggleTimetable}
                                    onEnrollCourse={handleEnroll}
                                />
                            );
                        })}
                    </div>
                )}

                {queueMessage && <div className="queue-message">{queueMessage}</div>}
            </section>
        </div>
    );
}

export default CartPage;