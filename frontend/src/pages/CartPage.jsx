import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { REGISTRATION_CONFIG } from "../config/registrationConfig";

import useCourses from "../hooks/useCourses";
import { useTimetableWideMode } from "../hooks/useTimetableWideMode";
import { useEnrollmentQueue } from "../hooks/useEnrollmentQueue";

import CourseCard from "../components/CourseCard.jsx";
import Timetable from "../components/Timetable.jsx";
import EnrollmentQueueOverlay from "../components/EnrollmentQueueOverlay.jsx";

import { getBlockReason } from "../utils/timeUtils";
import { SORT_OPTIONS, sortCourses } from "../utils/courseSortUtils";

function includesCourseId(ids = [], courseId) {
    return ids.map(Number).includes(Number(courseId));
}

function CartPage({
                      likedCourseIds,
                      timetableCourseIds,
                      enrolledCourseIds,
                      quickEnroll,
                      registrationOpen,
                      onToggleLike,
                      onToggleTimetable,
                      onEnrollCourse,
                      onCancelEnrollCourse
                  }) {
    const { courses, loading, error } = useCourses();

    const [viewType, setViewType] = useState("list");
    const [sortType, setSortType] = useState("time");
    const pageRootRef = useRef(null);

    useTimetableWideMode(viewType === "timetable");

    const normalizedLikedCourseIds = useMemo(
        () => likedCourseIds.map(Number),
        [likedCourseIds]
    );

    const normalizedTimetableCourseIds = useMemo(
        () => timetableCourseIds.map(Number),
        [timetableCourseIds]
    );

    const normalizedEnrolledCourseIds = useMemo(
        () => enrolledCourseIds.map(Number),
        [enrolledCourseIds]
    );

    const likedCourses = useMemo(() => {
        return courses.filter((course) =>
            includesCourseId(normalizedLikedCourseIds, course.id)
        );
    }, [courses, normalizedLikedCourseIds]);

    const timetableCourses = useMemo(() => {
        return courses.filter((course) =>
            includesCourseId(normalizedTimetableCourseIds, course.id)
        );
    }, [courses, normalizedTimetableCourseIds]);

    const enrolledCourses = useMemo(() => {
        return courses.filter((course) =>
            includesCourseId(normalizedEnrolledCourseIds, course.id)
        );
    }, [courses, normalizedEnrolledCourseIds]);

    const displayLikedCourses = useMemo(() => {
        return sortCourses(likedCourses, sortType);
    }, [likedCourses, sortType]);

    // 수강신청 시간이 아닐 때는 시간표 기준으로 중복 판단
    // 수강신청 시간이 열렸을 때는 실제 신청된 과목 기준으로 중복 판단
    const baseCourses = useMemo(() => {
        return registrationOpen ? enrolledCourses : timetableCourses;
    }, [registrationOpen, enrolledCourses, timetableCourses]);

    const {
        queueState,
        isQueueRunning,
        startEnrollment,
        startCancelEnrollment
    } = useEnrollmentQueue(onEnrollCourse, onCancelEnrollCourse);

    const getCourseByIdFromList = useCallback(
        (courseId) => {
            return (
                courses.find((course) => Number(course.id) === Number(courseId)) || {
                    id: courseId,
                    title: "선택한 과목"
                }
            );
        },
        [courses]
    );

    const handleEnroll = useCallback(
        (courseId) => {
            const targetCourse = getCourseByIdFromList(courseId);

            const alreadyEnrolled = normalizedEnrolledCourseIds.includes(
                Number(courseId)
            );

            const blockReason = alreadyEnrolled
                ? "이미 신청한 과목입니다."
                : getBlockReason(targetCourse, baseCourses);

            if (blockReason) {
                alert(blockReason);

                return Promise.resolve({
                    success: false,
                    message: blockReason
                });
            }

            return startEnrollment(targetCourse);
        },
        [
            getCourseByIdFromList,
            normalizedEnrolledCourseIds,
            baseCourses,
            startEnrollment
        ]
    );

    const handleCancelEnroll = useCallback(
        (courseId) => {
            const targetCourse = getCourseByIdFromList(courseId);

            const confirmed = window.confirm(
                `"${targetCourse.title}" 과목의 수강신청을 정말 취소하시겠습니까?`
            );

            if (!confirmed) {
                return Promise.resolve({
                    success: false,
                    message: "수강취소가 취소되었습니다."
                });
            }

            return startCancelEnrollment(targetCourse);
        },
        [getCourseByIdFromList, startCancelEnrollment]
    );

    useEffect(() => {
        if (!registrationOpen) return;

        const focusPage = () => {
            pageRootRef.current?.focus({ preventScroll: true });
        };

        focusPage();

        const frameId = window.requestAnimationFrame(focusPage);
        const timeoutId = window.setTimeout(focusPage, 100);

        return () => {
            window.cancelAnimationFrame(frameId);
            window.clearTimeout(timeoutId);
        };
    }, [registrationOpen]);

    useEffect(() => {
        if (!registrationOpen) return;
        if (isQueueRunning) return;

        const handleKeyDown = (event) => {
            if (!event.altKey) return;

            const digitMatch = event.code.match(/^Digit([1-9])$/);

            if (!digitMatch) return;

            const number = Number(digitMatch[1]);
            const targetCourse = displayLikedCourses[number - 1];

            if (!targetCourse) return;

            const alreadyEnrolled = includesCourseId(
                normalizedEnrolledCourseIds,
                targetCourse.id
            );

            const blockReason = alreadyEnrolled
                ? ""
                : getBlockReason(targetCourse, baseCourses);

            if (alreadyEnrolled || blockReason) return;

            event.preventDefault();
            event.stopPropagation();

            handleEnroll(targetCourse.id);
        };

        document.addEventListener("keydown", handleKeyDown, true);

        return () => {
            document.removeEventListener("keydown", handleKeyDown, true);
        };
    }, [
        registrationOpen,
        isQueueRunning,
        displayLikedCourses,
        normalizedEnrolledCourseIds,
        baseCourses,
        handleEnroll
    ]);

    if (loading) {
        return <div className="loading">관심과목을 불러오는 중...</div>;
    }

    if (error) {
        return <div className="loading">{error}</div>;
    }

    return (
        <div
            ref={pageRootRef}
            className="content-page"
            tabIndex={-1}
        >
            <h2 className="page-title">내 관심과목</h2>

            <section className="result-section">
                <div className="result-header">
                    <strong>관심과목 {likedCourses.length}개</strong>

                    <div className="view-controls">
                        <span className="control-label">정렬</span>

                        <div className="segmented-control sort-chip-group">
                            {SORT_OPTIONS.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    className={`sort-chip ${
                                        sortType === option.value ? "active" : ""
                                    }`}
                                    onClick={() => setSortType(option.value)}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>

                        <span className="control-label">보기</span>

                        <div className="segmented-control view-mode-group">
                            <button
                                type="button"
                                className={viewType === "list" ? "selected-view" : ""}
                                onClick={() => setViewType("list")}
                            >
                                리스트
                            </button>

                            <button
                                type="button"
                                className={viewType === "timetable" ? "selected-view" : ""}
                                onClick={() => setViewType("timetable")}
                            >
                                시간표
                            </button>
                        </div>
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
                    <div className="timetable-view-shell">
                        <div className="timetable-fixed-panel">
                            <Timetable
                                courses={timetableCourses}
                                maxCredits={REGISTRATION_CONFIG.maxCredits}
                                registrationOpen={registrationOpen}
                                enrolledCourseIds={normalizedEnrolledCourseIds}
                                onEnrollCourse={handleEnroll}
                                onCancelEnrollCourse={handleCancelEnroll}
                                onRemoveCourse={onToggleTimetable}
                            />
                        </div>

                        <div className="course-list narrow timetable-candidate-list">
                            {displayLikedCourses.map((course, index) => {
                                const alreadySelected = registrationOpen
                                    ? includesCourseId(normalizedEnrolledCourseIds, course.id)
                                    : includesCourseId(normalizedTimetableCourseIds, course.id);

                                const blockReason = alreadySelected
                                    ? ""
                                    : getBlockReason(course, baseCourses);

                                return (
                                    <CourseCard
                                        key={course.id}
                                        course={course}
                                        liked={includesCourseId(normalizedLikedCourseIds, course.id)}
                                        inTimetable={includesCourseId(
                                            normalizedTimetableCourseIds,
                                            course.id
                                        )}
                                        enrolled={includesCourseId(
                                            normalizedEnrolledCourseIds,
                                            course.id
                                        )}
                                        blockReason={blockReason}
                                        compact={true}
                                        registrationOpen={registrationOpen}
                                        showEnrollButton={quickEnroll || registrationOpen}
                                        quickIndex={
                                            registrationOpen && index < 9 ? index + 1 : undefined
                                        }
                                        onToggleLike={onToggleLike}
                                        onToggleTimetable={onToggleTimetable}
                                        onEnrollCourse={handleEnroll}
                                        onCancelEnrollCourse={handleCancelEnroll}
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
                                ? includesCourseId(normalizedEnrolledCourseIds, course.id)
                                : includesCourseId(normalizedTimetableCourseIds, course.id);

                            const blockReason = alreadySelected
                                ? ""
                                : getBlockReason(course, baseCourses);

                            return (
                                <CourseCard
                                    key={course.id}
                                    course={course}
                                    liked={includesCourseId(normalizedLikedCourseIds, course.id)}
                                    inTimetable={includesCourseId(
                                        normalizedTimetableCourseIds,
                                        course.id
                                    )}
                                    enrolled={includesCourseId(
                                        normalizedEnrolledCourseIds,
                                        course.id
                                    )}
                                    blockReason={blockReason}
                                    registrationOpen={registrationOpen}
                                    showEnrollButton={quickEnroll || registrationOpen}
                                    quickIndex={
                                        registrationOpen && index < 9 ? index + 1 : undefined
                                    }
                                    onToggleLike={onToggleLike}
                                    onToggleTimetable={onToggleTimetable}
                                    onEnrollCourse={handleEnroll}
                                    onCancelEnrollCourse={handleCancelEnroll}
                                />
                            );
                        })}
                    </div>
                )}
            </section>

            <EnrollmentQueueOverlay queue={queueState} />
        </div>
    );
}

export default CartPage;