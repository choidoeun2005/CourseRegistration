import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { REGISTRATION_CONFIG } from "../config/registrationConfig";

import useCourses from "../hooks/useCourses";
import CourseCard from "../components/CourseCard.jsx";
import Timetable from "../components/Timetable.jsx";
import { getBlockReason } from "../utils/timeUtils";
import { useTimetableWideMode } from "../hooks/useTimetableWideMode";

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

    const firstSession = sessions
        .map((session) => ({
            dayValue: DAY_ORDER[session.day] || 99,
            periodValue: Math.min(...(session.periods || [99]))
        }))
        .sort((a, b) => {
            if (a.dayValue !== b.dayValue) {
                return a.dayValue - b.dayValue;
            }

            return a.periodValue - b.periodValue;
        })[0];

    return firstSession.dayValue * 100 + firstSession.periodValue;
}

function sortCourses(courses, sortType) {
    const copied = [...courses];

    if (sortType === "name") {
        return copied.sort((a, b) => a.title.localeCompare(b.title, "ko"));
    }

    if (sortType === "credit") {
        return copied.sort((a, b) => Number(b.credit || 0) - Number(a.credit || 0));
    }

    return copied.sort((a, b) => {
        const timeA = getFirstSessionSortValue(a);
        const timeB = getFirstSessionSortValue(b);

        if (timeA !== timeB) {
            return timeA - timeB;
        }

        return a.title.localeCompare(b.title, "ko");
    });
}

function CartPage({
                      likedCourseIds,
                      timetableCourseIds,
                      enrolledCourseIds,
                      quickEnroll,
                      registrationOpen,
                      onToggleLike,
                      onToggleTimetable,
                      onEnrollCourse
                  }) {
    const { courses, loading, error } = useCourses();

    const [viewType, setViewType] = useState("list");
    const [sortType, setSortType] = useState("time");
    const [queueMessage, setQueueMessage] = useState("");

    const timetableShellRef = useRef(null);
    const [timetableShellHeight, setTimetableShellHeight] = useState(null);

    useTimetableWideMode(viewType === "timetable");

    const likedCourses = useMemo(() => {
        return courses.filter((course) => likedCourseIds.includes(course.id));
    }, [courses, likedCourseIds]);

    const timetableCourses = useMemo(() => {
        return courses.filter((course) => timetableCourseIds.includes(course.id));
    }, [courses, timetableCourseIds]);

    const enrolledCourses = useMemo(() => {
        return courses.filter((course) => enrolledCourseIds.includes(course.id));
    }, [courses, enrolledCourseIds]);

    const displayLikedCourses = useMemo(() => {
        return sortCourses(likedCourses, sortType);
    }, [likedCourses, sortType]);

    // 수강신청 시간이 아닐 때는 시간표 기준으로 중복 판단
    // 수강신청 시간이 열렸을 때는 실제 신청된 과목 기준으로 중복 판단
    const baseCourses = registrationOpen ? enrolledCourses : timetableCourses;

    const handleEnroll = useCallback(
        async (courseId) => {
            const result = await onEnrollCourse(courseId);

            if (result.success) {
                setQueueMessage(
                    `${result.order}번째 순서입니다. TIP) ${
                        result.tip || "행운을 빌어요!"
                    }`
                );
            } else {
                setQueueMessage(result.message);
            }

            return result;
        },
        [onEnrollCourse]
    );

    useEffect(() => {
        if (viewType !== "timetable") {
            setTimetableShellHeight(null);
            return;
        }

        const updateTimetableHeight = () => {
            if (!timetableShellRef.current) return;

            const rect = timetableShellRef.current.getBoundingClientRect();
            const bottomSafeGap = 24;
            const availableHeight = window.innerHeight - rect.top - bottomSafeGap;

            setTimetableShellHeight(Math.max(360, availableHeight));
        };

        updateTimetableHeight();

        const animationFrameId = window.requestAnimationFrame(updateTimetableHeight);
        const timeoutId = window.setTimeout(updateTimetableHeight, 0);

        window.addEventListener("resize", updateTimetableHeight);

        return () => {
            window.cancelAnimationFrame(animationFrameId);
            window.clearTimeout(timeoutId);
            window.removeEventListener("resize", updateTimetableHeight);
        };
    }, [
        viewType,
        displayLikedCourses.length,
        timetableCourses.length,
        registrationOpen
    ]);

    useEffect(() => {
        if (!quickEnroll && !registrationOpen) return;

        const handleKeyDown = (event) => {
            if (!event.ctrlKey) return;

            const index = Number(event.key) - 1;

            if (Number.isNaN(index) || index < 0) return;

            const targetCourse = displayLikedCourses[index];

            if (targetCourse) {
                handleEnroll(targetCourse.id);
            }
        };

        window.addEventListener("keydown", handleKeyDown);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [quickEnroll, registrationOpen, displayLikedCourses, handleEnroll]);

    if (loading) {
        return <div className="loading">관심과목을 불러오는 중...</div>;
    }

    if (error) {
        return <div className="loading">{error}</div>;
    }

    return (
        <div className="content-page cart-page">
            <h2 className="page-title">내 관심과목</h2>

            <section className="result-section">
                <div className="result-header">
                    <strong>관심과목 {likedCourses.length}개</strong>

                    <div className="view-controls">
                        <span>정렬</span>

                        <select
                            value={sortType}
                            onChange={(event) => setSortType(event.target.value)}
                        >
                            <option value="time">시간순</option>
                            <option value="name">이름순</option>
                            <option value="credit">학점순</option>
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

                {likedCourses.length === 0 && (
                    <div className="empty-recommendation">
                        아직 관심과목이 없습니다.
                        <br />
                        과목 목록에서 관심 버튼을 눌러 과목을 추가해보세요.
                    </div>
                )}

                {likedCourses.length > 0 && viewType === "timetable" && (
                    <div
                        ref={timetableShellRef}
                        className="timetable-view-shell"
                        style={
                            timetableShellHeight
                                ? { height: `${timetableShellHeight}px` }
                                : undefined
                        }
                    >
                        <div className="timetable-fixed-panel">
                            <Timetable
                                courses={timetableCourses}
                                maxCredits={REGISTRATION_CONFIG.maxCredits}
                                onRemoveCourse={onToggleTimetable}
                            />
                        </div>

                        <div className="course-list narrow timetable-candidate-list">
                            {displayLikedCourses.map((course, index) => {
                                const alreadySelected = registrationOpen
                                    ? enrolledCourseIds.includes(course.id)
                                    : timetableCourseIds.includes(course.id);

                                const blockReason = alreadySelected
                                    ? ""
                                    : getBlockReason(course, baseCourses);

                                return (
                                    <CourseCard
                                        key={course.id}
                                        course={course}
                                        liked={likedCourseIds.includes(course.id)}
                                        inTimetable={timetableCourseIds.includes(course.id)}
                                        enrolled={enrolledCourseIds.includes(course.id)}
                                        blockReason={blockReason}
                                        compact={true}
                                        registrationOpen={registrationOpen}
                                        showEnrollButton={quickEnroll || registrationOpen}
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

                {likedCourses.length > 0 && viewType === "list" && (
                    <div className="course-list">
                        {displayLikedCourses.map((course, index) => {
                            const alreadySelected = registrationOpen
                                ? enrolledCourseIds.includes(course.id)
                                : timetableCourseIds.includes(course.id);

                            const blockReason = alreadySelected
                                ? ""
                                : getBlockReason(course, baseCourses);

                            return (
                                <CourseCard
                                    key={course.id}
                                    course={course}
                                    liked={likedCourseIds.includes(course.id)}
                                    inTimetable={timetableCourseIds.includes(course.id)}
                                    enrolled={enrolledCourseIds.includes(course.id)}
                                    blockReason={blockReason}
                                    registrationOpen={registrationOpen}
                                    showEnrollButton={quickEnroll || registrationOpen}
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