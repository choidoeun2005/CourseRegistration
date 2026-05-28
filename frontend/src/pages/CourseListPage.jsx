import { useMemo, useState } from "react";

import useCourses from "../hooks/useCourses";
import SearchBar from "../components/SearchBar.jsx";
import FilterPanel from "../components/FilterPanel.jsx";
import CourseCard from "../components/CourseCard.jsx";
import Timetable from "../components/Timetable.jsx";
import {
    DAYS,
    filterCoursesByDayState,
    hasTimeConflict
} from "../utils/timeUtils";

function CourseListPage({
                            likedCourseIds,
                            timetableCourseIds,
                            onToggleLike,
                            onToggleTimetable
                        }) {
    const { courses, loading, error } = useCourses();

    const [keyword, setKeyword] = useState("");
    const [searchedKeyword, setSearchedKeyword] = useState("");
    const [viewType, setViewType] = useState("list");
    const [dayState, setDayState] = useState(
        DAYS.reduce((acc, day) => ({ ...acc, [day]: "none" }), {})
    );

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

    const filteredCourses = useMemo(() => {
        const dayFiltered = filterCoursesByDayState(courses, dayState);

        if (!searchedKeyword.trim()) return dayFiltered;

        return dayFiltered.filter((course) => {
            const text = `${course.title} ${course.code} ${course.professor}`;
            return text.toLowerCase().includes(searchedKeyword.toLowerCase());
        });
    }, [courses, dayState, searchedKeyword]);

    const timetableCourses = courses.filter((course) =>
        timetableCourseIds.includes(course.id)
    );

    if (loading) return <div className="loading">강의 정보를 불러오는 중...</div>;
    if (error) return <div className="loading">{error}</div>;

    return (
        <div className="content-page">
            <SearchBar
                keyword={keyword}
                onChange={setKeyword}
                onSearch={() => setSearchedKeyword(keyword)}
            />

            <FilterPanel dayState={dayState} onToggleDay={toggleDay} />

            <section className="result-section">
                <div className="result-header">
                    <strong>검색 결과 {filteredCourses.length}개</strong>

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
                            {filteredCourses.map((course) => {
                                const conflict = hasTimeConflict(course, timetableCourses);

                                return (
                                    <CourseCard
                                        key={course.id}
                                        course={course}
                                        liked={likedCourseIds.includes(course.id)}
                                        inTimetable={timetableCourseIds.includes(course.id)}
                                        conflict={conflict}
                                        onToggleLike={onToggleLike}
                                        onToggleTimetable={onToggleTimetable}
                                    />
                                );
                            })}
                        </div>
                    </div>
                )}

                {viewType === "list" && (
                    <div className="course-list">
                        {filteredCourses.map((course) => {
                            const conflict = hasTimeConflict(course, timetableCourses);

                            return (
                                <CourseCard
                                    key={course.id}
                                    course={course}
                                    liked={likedCourseIds.includes(course.id)}
                                    inTimetable={timetableCourseIds.includes(course.id)}
                                    conflict={conflict}
                                    onToggleLike={onToggleLike}
                                    onToggleTimetable={onToggleTimetable}
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