import { useMemo, useState } from "react";

import useCourses from "../hooks/useCourses";
import SearchBar from "../components/SearchBar.jsx";
import FilterPanel from "../components/FilterPanel.jsx";
import CourseCard from "../components/CourseCard.jsx";
import Timetable from "../components/Timetable.jsx";
import {
    DAYS,
    filterCoursesByDayState,
    hasTimeConflict,
} from "../utils/timeUtils";

function CourseListPage({
    likedCourseIds,
    timetableCourseIds,
    onToggleLike,
    onToggleTimetable,
}) {
    const { courses, loading, error } = useCourses();

    const [keyword, setKeyword] = useState("");
    const [searchedKeyword, setSearchedKeyword] = useState("");
    const [viewType, setViewType] = useState("timetable");
    const [dayState, setDayState] = useState(
        DAYS.reduce((acc, day) => ({ ...acc, [day]: "none" }), {})
    );
    const [hoveredCourseId, setHoveredCourseId] = useState(null);
    const [selectedSlots, setSelectedSlots] = useState(new Set());

    const toggleDay = (day) => {
        setDayState((prev) => {
            const current = prev[day];
            const next =
                current === "none"
                    ? "include"
                    : current === "include"
                    ? "exclude"
                    : "none";
            return { ...prev, [day]: next };
        });
    };

    const toggleSlot = (slotKey) => {
        setSelectedSlots((prev) => {
            const next = new Set(prev);
            if (next.has(slotKey)) next.delete(slotKey);
            else next.add(slotKey);
            return next;
        });
    };

    const filteredCourses = useMemo(() => {
        const dayFiltered = filterCoursesByDayState(courses, dayState);

        if (!searchedKeyword.trim()) return dayFiltered;

        return dayFiltered.filter((course) => {
            const text = `${course.title} ${course.code} ${course.professor}`;
            return text.toLowerCase().includes(searchedKeyword.toLowerCase());
        });
    }, [courses, dayState, searchedKeyword]);

    const slotFilteredCourses = useMemo(() => {
        if (selectedSlots.size === 0) return filteredCourses;
        return filteredCourses.filter((course) =>
            [...selectedSlots].some((slotKey) => {
                const [day, periodStr] = slotKey.split("-");
                return (
                    course.days.includes(day) &&
                    course.periods.includes(Number(periodStr))
                );
            })
        );
    }, [filteredCourses, selectedSlots]);

    const timetableCourses = useMemo(
        () => courses.filter((c) => timetableCourseIds.includes(c.id)),
        [courses, timetableCourseIds]
    );

    const hoveredCourse = useMemo(
        () => (hoveredCourseId ? courses.find((c) => c.id === hoveredCourseId) ?? null : null),
        [hoveredCourseId, courses]
    );

    if (loading) return <div className="loading">강의 정보를 불러오는 중...</div>;
    if (error) return <div className="loading">{error}</div>;

    const renderCard = (course) => {
        const conflict = hasTimeConflict(course, timetableCourses);
        return (
            <CourseCard
                key={course.id}
                course={course}
                liked={likedCourseIds.includes(course.id)}
                inTimetable={timetableCourseIds.includes(course.id)}
                conflict={conflict}
                isHovered={hoveredCourseId === course.id}
                onToggleLike={onToggleLike}
                onToggleTimetable={onToggleTimetable}
                onMouseEnter={() => setHoveredCourseId(course.id)}
                onMouseLeave={() => setHoveredCourseId(null)}
            />
        );
    };

    return (
        <div className="content-page">
            <SearchBar
                keyword={keyword}
                onChange={setKeyword}
                onSearch={() => setSearchedKeyword(keyword)}
                onClear={() => { setKeyword(""); setSearchedKeyword(""); }}
            />

            <FilterPanel dayState={dayState} onToggleDay={toggleDay} />

            <section className="result-section">
                <div className="result-header">
                    <strong>검색 결과 {slotFilteredCourses.length}개</strong>

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
                            className={
                                viewType === "timetable" ? "selected-view" : ""
                            }
                            onClick={() => setViewType("timetable")}
                        >
                            시간표
                        </button>
                    </div>
                </div>

                {viewType === "timetable" && (
                    <div className="split-layout">
                        <div className="timetable-column">
                            <Timetable
                                courses={timetableCourses}
                                hoveredCourse={hoveredCourse}
                                selectedSlots={selectedSlots}
                                onToggleSlot={toggleSlot}
                            />
                            {selectedSlots.size > 0 ? (
                                <div className="slot-filter-info">
                                    <span>
                                        시간 검색:{" "}
                                        {[...selectedSlots]
                                            .sort((a, b) => {
                                                const [dayA, periodA] = a.split("-");
                                                const [dayB, periodB] = b.split("-");
                                                const dayOrder = DAYS.indexOf(dayA) - DAYS.indexOf(dayB);
                                                return dayOrder !== 0 ? dayOrder : Number(periodA) - Number(periodB);
                                            })
                                            .map((k) => {
                                                const [day, period] = k.split("-");
                                                return `${day}(${period})`;
                                            })
                                            .join(", ")}
                                    </span>
                                </div>
                            ) : (
                                <div className="slot-filter-info">
                                    <span>시간 검색: 전체</span>
                                </div>
                            )}
                            <button onClick={() => setSelectedSlots(new Set())}>
                                시간 선택 전체 해제
                            </button>
                        </div>

                        <div className="course-list narrow">
                            {slotFilteredCourses.map(renderCard)}
                        </div>
                    </div>
                )}

                {viewType === "list" && (
                    <div className="course-list">
                        {slotFilteredCourses.map(renderCard)}
                    </div>
                )}
            </section>
        </div>
    );
}

export default CourseListPage;
