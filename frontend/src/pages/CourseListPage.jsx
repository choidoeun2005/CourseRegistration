import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { REGISTRATION_CONFIG } from "../config/registrationConfig";

import useCourses from "../hooks/useCourses";
import { useTimetableWideMode } from "../hooks/useTimetableWideMode";
import { useEnrollmentQueue } from "../hooks/useEnrollmentQueue";

import FilterPanel from "../components/FilterPanel.jsx";
import CourseCard from "../components/CourseCard.jsx";
import Timetable from "../components/Timetable.jsx";
import EnrollmentQueueOverlay from "../components/EnrollmentQueueOverlay.jsx";

import {
    courseIncludesCell,
    getBlockReason,
    getCourseSessions
} from "../utils/timeUtils";

import {
    applyCourseFilters,
    createDefaultFilters
} from "../utils/courseFilterUtils";

const SORT_OPTIONS = [
    { value: "time", label: "시간순" },
    { value: "name", label: "이름순" },
    { value: "capacity", label: "정원 많은 순" }
];

const DAY_ORDER = {
    월: 1,
    화: 2,
    수: 3,
    목: 4,
    금: 5,
    토: 6,
    일: 7
};

function includesCourseId(ids = [], courseId) {
    return ids.map(Number).includes(Number(courseId));
}

function getCourseBlockReason(course, selectedCourses, registrationOpen) {
    return getBlockReason(course, selectedCourses, {
        maxTimeOverlap: registrationOpen ? 1 : 3
    });
}

function getFirstSessionSortValue(course) {
    const sessions = course.schedule?.sessions || [];

    if (sessions.length === 0) {
        return Number.MAX_SAFE_INTEGER;
    }

    const sortedSessions = [...sessions].sort((a, b) => {
        const aDay = DAY_ORDER[a.day] || 99;
        const bDay = DAY_ORDER[b.day] || 99;

        if (aDay !== bDay) return aDay - bDay;

        const aPeriod = Math.min(...(a.periods || [99]));
        const bPeriod = Math.min(...(b.periods || [99]));

        return aPeriod - bPeriod;
    });

    const first = sortedSessions[0];

    return (
        (DAY_ORDER[first.day] || 99) * 100 +
        Math.min(...(first.periods || [99]))
    );
}

function getCapacityValue(course) {
    const candidates = [
        course.capacity,
        course.quota,
        course.limit,
        course.limitCount,
        course.enrollmentLimit,
        course.maxStudents,
        course.maxCapacity,
        course.studentLimit,
        course.seatCount,
        course.lmtCnt,
        course.lmt_cnt
    ];

    for (const value of candidates) {
        if (value === undefined || value === null || value === "") continue;

        const number = Number(String(value).replace(/[^\d.]/g, ""));

        if (!Number.isNaN(number)) {
            return number;
        }
    }

    return 0;
}

function sortCourses(courses, sortType) {
    const copied = [...courses];

    if (sortType === "name") {
        return copied.sort((a, b) =>
            String(a.title || "").localeCompare(String(b.title || ""), "ko")
        );
    }

    if (sortType === "capacity") {
        return copied.sort((a, b) => {
            const capacityDiff = getCapacityValue(b) - getCapacityValue(a);

            if (capacityDiff !== 0) return capacityDiff;

            return String(a.title || "").localeCompare(String(b.title || ""), "ko");
        });
    }

    return copied.sort((a, b) => {
        const timeDiff =
            getFirstSessionSortValue(a) - getFirstSessionSortValue(b);

        if (timeDiff !== 0) return timeDiff;

        return String(a.title || "").localeCompare(String(b.title || ""), "ko");
    });
}

const COURSE_COLORS = [
    "#2563eb", "#d946ef", "#16a34a", "#f59e0b",
    "#7c3aed", "#0891b2", "#e11d48", "#84cc16",
    "#4f46e5", "#0f766e", "#b45309", "#be185d"
];

function CourseListPage({
                            likedCourseIds,
                            timetableCourseIds,
                            enrolledCourseIds,
                            registrationOpen,
                            activeTimetableTab = 1,
                            onSwitchTimetableTab,
                            onToggleLike,
                            onToggleTimetable,
                            onEnrollCourse,
                            onCancelEnrollCourse
                        }) {
    const { courses, loading, error } = useCourses();

    const [filters, setFilters] = useState(createDefaultFilters());
    const [viewType, setViewType] = useState("list");
    const [sortType, setSortType] = useState("time");
    const [hoveredCourseId, setHoveredCourseId] = useState(null);
    const [recommendationCell, setRecommendationCell] = useState(null);

    const hoveredCells = useMemo(() => {
        if (hoveredCourseId === null) return new Set();
        const course = courses.find((c) => Number(c.id) === Number(hoveredCourseId));
        if (!course) return new Set();
        const cells = new Set();
        getCourseSessions(course).forEach((session) => {
            session.periods.forEach((period) => cells.add(`${session.day}-${period}`));
        });
        return cells;
    }, [hoveredCourseId, courses]);
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

    const courseColorMap = useMemo(() => {
        const map = {};
        normalizedTimetableCourseIds.forEach((id, index) => {
            map[id] = COURSE_COLORS[index % COURSE_COLORS.length];
        });
        return map;
    }, [normalizedTimetableCourseIds]);

    const normalizedEnrolledCourseIds = useMemo(
        () => enrolledCourseIds.map(Number),
        [enrolledCourseIds]
    );

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

    const baseCourses = useMemo(() => {
        return registrationOpen ? enrolledCourses : timetableCourses;
    }, [registrationOpen, enrolledCourses, timetableCourses]);

    const getCurrentBlockReason = useCallback(
        (course, selectedCourses = baseCourses) =>
            getCourseBlockReason(course, selectedCourses, registrationOpen),
        [baseCourses, registrationOpen]
    );

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

    const handleQueuedEnroll = useCallback(
        (courseId) => {
            const targetCourse = getCourseByIdFromList(courseId);

            const alreadyEnrolled = normalizedEnrolledCourseIds.includes(
                Number(courseId)
            );

            const blockReason = alreadyEnrolled
                ? "이미 신청한 과목입니다."
                : getCurrentBlockReason(targetCourse);

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
            getCurrentBlockReason,
            startEnrollment
        ]
    );

    const handleQueuedCancelEnroll = useCallback(
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

    const filteredCourses = useMemo(() => {
        const result = applyCourseFilters(courses, filters, {
            baseCourses,
            getBlockReason: (course, selectedCourses) =>
                getCurrentBlockReason(course, selectedCourses)
        });

        return sortCourses(result, sortType);
    }, [courses, filters, baseCourses, getCurrentBlockReason, sortType]);

    const recommendedCourses = useMemo(() => {
        if (!recommendationCell) return filteredCourses;

        return filteredCourses.filter((course) => {
            if (!courseIncludesCell(course, recommendationCell.day, recommendationCell.period)) {
                return false;
            }

            if (includesCourseId(normalizedTimetableCourseIds, course.id)) {
                return false;
            }

            return !getBlockReason(course, timetableCourses, { maxTimeOverlap: 1 });
        });
    }, [
        filteredCourses,
        normalizedTimetableCourseIds,
        recommendationCell,
        timetableCourses
    ]);

    const displayedCourses =
        viewType === "timetable" && recommendationCell
            ? recommendedCourses
            : filteredCourses;

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
            const targetCourse = displayedCourses[number - 1];

            if (!targetCourse) return;

            const alreadyEnrolled = includesCourseId(
                normalizedEnrolledCourseIds,
                targetCourse.id
            );

            const blockReason = alreadyEnrolled
                ? ""
                : getCurrentBlockReason(targetCourse);

            if (alreadyEnrolled || blockReason) return;

            event.preventDefault();
            event.stopPropagation();

            handleQueuedEnroll(targetCourse.id);
        };

        document.addEventListener("keydown", handleKeyDown, true);

        return () => {
            document.removeEventListener("keydown", handleKeyDown, true);
        };
    }, [
        registrationOpen,
        isQueueRunning,
        displayedCourses,
        normalizedEnrolledCourseIds,
        getCurrentBlockReason,
        handleQueuedEnroll
    ]);

    if (loading) {
        return <div className="loading">강의 정보를 불러오는 중...</div>;
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
            <FilterPanel
                courses={courses}
                filters={filters}
                onChange={setFilters}
            />

            <section className="result-section">
                <div className="result-header">
                    <strong>
                        {recommendationCell && viewType === "timetable"
                            ? `${recommendationCell.day} ${recommendationCell.period}교시 추천 ${displayedCourses.length}개`
                            : `검색 결과 ${filteredCourses.length}개`}
                    </strong>

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

                        <button
                            type="button"
                            className={`availability-toggle ${
                                filters.onlyAvailable ? "active" : ""
                            }`}
                            onClick={() =>
                                setFilters((prev) => ({
                                    ...prev,
                                    onlyAvailable: !prev.onlyAvailable
                                }))
                            }
                        >
                            담을 수 있는 과목만
                        </button>

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

	                {viewType === "timetable" && (
	                    <>
	                        <div className="timetable-view-shell">
	                            <div className="timetable-fixed-panel">
	                                <Timetable
	                                    courses={timetableCourses}
                                    maxCredits={REGISTRATION_CONFIG.maxCredits}
                                    registrationOpen={registrationOpen}
                                    enrolledCourseIds={normalizedEnrolledCourseIds}
                                    hoveredCells={hoveredCells}
                                    courseColorMap={courseColorMap}
                                    getBlockReason={(course) => getCurrentBlockReason(course)}
                                    activeTimetableTab={activeTimetableTab}
                                    onSwitchTimetableTab={onSwitchTimetableTab}
                                    onCellClick={(day, period) =>
                                        setRecommendationCell({ day, period })
                                    }
                                    onEnrollCourse={handleQueuedEnroll}
                                    onCancelEnrollCourse={handleQueuedCancelEnroll}
                                    onRemoveCourse={onToggleTimetable}
                                />
                            </div>

                            <div className="course-list narrow timetable-candidate-list">
                                {recommendationCell && (
                                    <div className="recommendation-banner">
                                        <strong>
                                            {recommendationCell.day} {recommendationCell.period}교시 후보
                                        </strong>
                                        <span>현재 시간표와 겹치지 않는 과목만 표시 중</span>
                                        <button
                                            type="button"
                                            onClick={() => setRecommendationCell(null)}
                                        >
                                            전체 보기
                                        </button>
                                    </div>
                                )}

                                {displayedCourses.map((course, index) => {
                                    const alreadySelected = registrationOpen
                                        ? includesCourseId(normalizedEnrolledCourseIds, course.id)
                                        : includesCourseId(normalizedTimetableCourseIds, course.id);

                                    const blockReason = alreadySelected
                                        ? ""
                                        : getCurrentBlockReason(course);

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
                                            quickIndex={
                                                registrationOpen && index < 9 ? index + 1 : undefined
                                            }
                                            colorDot={courseColorMap[Number(course.id)] ?? null}
                                            onToggleLike={onToggleLike}
                                            onToggleTimetable={onToggleTimetable}
                                            onEnrollCourse={handleQueuedEnroll}
                                            onCancelEnrollCourse={handleQueuedCancelEnroll}
                                            isHovered={hoveredCourseId === course.id}
                                            onMouseEnter={() => setHoveredCourseId(course.id)}
                                            onMouseLeave={() => setHoveredCourseId(null)}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    </>
                )}

                {viewType === "list" && (
                    <div className="course-list">
                        {filteredCourses.map((course, index) => {
                            const alreadySelected = registrationOpen
                                ? includesCourseId(normalizedEnrolledCourseIds, course.id)
                                : includesCourseId(normalizedTimetableCourseIds, course.id);

                            const blockReason = alreadySelected
                                ? ""
                                : getCurrentBlockReason(course);

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
                                    quickIndex={
                                        registrationOpen && index < 9 ? index + 1 : undefined
                                    }
                                    colorDot={courseColorMap[Number(course.id)] ?? null}
                                    onToggleLike={onToggleLike}
                                    onToggleTimetable={onToggleTimetable}
                                    onEnrollCourse={handleQueuedEnroll}
                                    onCancelEnrollCourse={handleQueuedCancelEnroll}
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

export default CourseListPage;
