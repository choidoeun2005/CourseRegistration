import { useEffect, useMemo, useRef, useState } from "react";
import { REGISTRATION_CONFIG } from "../config/registrationConfig";

import useCourses from "../hooks/useCourses";
import FilterPanel from "../components/FilterPanel.jsx";
import CourseCard from "../components/CourseCard.jsx";
import Timetable from "../components/Timetable.jsx";
import { getBlockReason } from "../utils/timeUtils";
import { useTimetableWideMode } from "../hooks/useTimetableWideMode";

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

    return (DAY_ORDER[first.day] || 99) * 100 + Math.min(...(first.periods || [99]));
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
        const timeDiff = getFirstSessionSortValue(a) - getFirstSessionSortValue(b);

        if (timeDiff !== 0) return timeDiff;

        return String(a.title || "").localeCompare(String(b.title || ""), "ko");
    });
}

function CourseListPage({
                            likedCourseIds,
                            timetableCourseIds,
                            enrolledCourseIds,
                            registrationOpen,
                            onToggleLike,
                            onToggleTimetable,
                            onEnrollCourse
                        }) {
    const { courses, loading, error } = useCourses();

    const [filters, setFilters] = useState(createDefaultFilters());
    const [viewType, setViewType] = useState("list");
    const [sortType, setSortType] = useState("time");

    const timetableShellRef = useRef(null);
    const [timetableShellHeight, setTimetableShellHeight] = useState(null);

    useTimetableWideMode(viewType === "timetable");

    const timetableCourses = useMemo(() => {
        return courses.filter((course) => timetableCourseIds.includes(course.id));
    }, [courses, timetableCourseIds]);

    const enrolledCourses = useMemo(() => {
        return courses.filter((course) => enrolledCourseIds.includes(course.id));
    }, [courses, enrolledCourseIds]);

    const baseCourses = registrationOpen ? enrolledCourses : timetableCourses;

    const filteredCourses = useMemo(() => {
        const result = applyCourseFilters(courses, filters, {
            baseCourses,
            getBlockReason
        });

        return sortCourses(result, sortType);
    }, [courses, filters, baseCourses, sortType]);

    if (loading) {
        return <div className="loading">강의 정보를 불러오는 중...</div>;
    }

    if (error) {
        return <div className="loading">{error}</div>;
    }

    return (
        <div className="content-page">
            <FilterPanel
                courses={courses}
                filters={filters}
                onChange={setFilters}
            />

            <section className="result-section">
                <div className="result-header">
                    <strong>검색 결과 {filteredCourses.length}개</strong>

                    <div className="view-controls">
                        <span className="control-label">정렬</span>

                        <div className="segmented-control sort-chip-group">
                            {SORT_OPTIONS.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    className={`sort-chip ${sortType === option.value ? "active" : ""}`}
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

                {viewType === "timetable" && (
                    <div className="timetable-view-shell">
                        <div className="timetable-fixed-panel">
                            <Timetable
                                courses={timetableCourses}
                                maxCredits={REGISTRATION_CONFIG.maxCredits}
                                onRemoveCourse={onToggleTimetable}
                            />
                        </div>

                        <div className="course-list narrow timetable-candidate-list">
                            {filteredCourses.map((course, index) => {
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
                                        quickIndex={index + 1}
                                        onToggleLike={onToggleLike}
                                        onToggleTimetable={onToggleTimetable}
                                        onEnrollCourse={onEnrollCourse}
                                    />
                                );
                            })}
                        </div>
                    </div>
                )}

                {viewType === "list" && (
                    <div className="course-list">
                        {filteredCourses.map((course, index) => {
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
                                    quickIndex={index + 1}
                                    onToggleLike={onToggleLike}
                                    onToggleTimetable={onToggleTimetable}
                                    onEnrollCourse={onEnrollCourse}
                                />
                            );
                        })}
                    </div>
                )}
            </section>
        </div>
    );
}

export default CourseListPage;