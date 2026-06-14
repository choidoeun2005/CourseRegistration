import {
    DAYS,
    PERIODS,
    getCourseSessions,
    getTotalCredits,
    isTimeUndecided
} from "../utils/timeUtils";


const DAY_TO_COLUMN = {
    월: 2,
    화: 3,
    수: 4,
    목: 5,
    금: 6,
    토: 7
};

function splitIntoConsecutiveBlocks(periods = []) {
    const sorted = [...new Set(periods)]
        .map(Number)
        .filter((value) => !Number.isNaN(value))
        .sort((a, b) => a - b);

    if (sorted.length === 0) return [];

    const blocks = [];
    let start = sorted[0];
    let prev = sorted[0];

    for (let i = 1; i < sorted.length; i += 1) {
        const current = sorted[i];

        if (current === prev + 1) {
            prev = current;
            continue;
        }

        blocks.push({
            start,
            end: prev,
            periods: Array.from({ length: prev - start + 1 }, (_, idx) => start + idx)
        });

        start = current;
        prev = current;
    }

    blocks.push({
        start,
        end: prev,
        periods: Array.from({ length: prev - start + 1 }, (_, idx) => start + idx)
    });

    return blocks;
}

function buildCourseBlocks(courses) {
    const blocks = [];

    courses.forEach((course) => {
        const sessions = getCourseSessions(course);

        sessions.forEach((session, sessionIndex) => {
            const day = session.day;
            const dayColumn = DAY_TO_COLUMN[day];

            if (!dayColumn) return;

            const consecutiveBlocks = splitIntoConsecutiveBlocks(session.periods);

            consecutiveBlocks.forEach((block, blockIndex) => {
                const startPeriod = block.start;
                const endPeriod = block.end;
                const span = endPeriod - startPeriod + 1;

                // row 1 = header row, so 1교시는 grid row 2
                const gridRowStart = startPeriod + 1;

                blocks.push({
                    key: `${course.id}-${sessionIndex}-${blockIndex}`,
                    course,
                    day,
                    room: session.room || "",
                    startPeriod,
                    endPeriod,
                    span,
                    gridColumn: dayColumn,
                    gridRow: `${gridRowStart} / span ${span}`,
                    lineClamp: Math.max(2, span * 2)
                });
            });
        });
    });

    return blocks;
}

function includesCourseId(ids = [], courseId) {
    return ids.map(Number).includes(Number(courseId));
}

function Timetable({
                       courses = [],
                       maxCredits = 22,
                       registrationOpen = false,
                       enrolledCourseIds = [],
                       hoveredCells = new Set(),
                       onEnrollCourse,
                       onCancelEnrollCourse,
                       onRemoveCourse
                   }) {
    const totalCredits = getTotalCredits(courses);

    const safeMaxCredits = Number(maxCredits) > 0 ? Number(maxCredits) : 22;
    const creditRatio = Math.min(totalCredits / safeMaxCredits, 1);
    const creditPercent = Math.round(creditRatio * 100);
    const isCreditOverLimit = totalCredits > safeMaxCredits;

    const formatCredit = (value) => {
        const number = Number(value);

        if (Number.isInteger(number)) {
            return String(number);
        }

        return number.toFixed(1);
    };

    const timedCourses = courses.filter((course) => !isTimeUndecided(course));
    const untimedCourses = courses.filter(isTimeUndecided);
    const courseBlocks = buildCourseBlocks(timedCourses);

    return (
        <section className="timetable-section">
            <div className="timetable-summary">
                <div className="timetable-summary-left">
                    <strong>시간표</strong>
                    <span>{courses.length}과목</span>
                </div>

                <div className="credit-progress-box">
                    <div className="credit-progress-text">
      <span>
        {formatCredit(totalCredits)} / {formatCredit(safeMaxCredits)}학점
      </span>

                        {isCreditOverLimit && <em>초과</em>}
                    </div>

                    <div className="credit-progress-track">
                        <div
                            className={`credit-progress-fill ${
                                isCreditOverLimit ? "over-limit" : ""
                            }`}
                            style={{ width: `${creditPercent}%` }}
                        />
                    </div>
                </div>

                <span className="timetable-hint">
  {registrationOpen
      ? "파란색 과목 좌클릭: 수강신청 · 빨간색 과목 우클릭: 수강취소"
      : "과목 우클릭 시 시간표에서 제거"}
</span>
            </div>

            <div className="timetable-grid">
                {/* 좌상단 빈칸 */}
                <div className="tt-corner" style={{ gridColumn: 1, gridRow: 1 }} />

                {/* 요일 헤더 */}
                {DAYS.map((day, index) => (
                    <div
                        key={day}
                        className="tt-day-header"
                        style={{ gridColumn: index + 2, gridRow: 1 }}
                    >
                        {day}
                    </div>
                ))}

                {/* 교시 라벨 + 배경 셀 */}
                {PERIODS.map((period) => (
                    <div key={`row-${period}`} className="tt-row-group">
                        <div
                            className="tt-time-label"
                            style={{ gridColumn: 1, gridRow: period + 1 }}
                        >
                            {period}
                        </div>

                        {DAYS.map((day, index) => (
                            <div
                                key={`${day}-${period}`}
                                className={`tt-bg-cell${hoveredCells.has(`${day}-${period}`) ? " card-hovered" : ""}`}
                                style={{ gridColumn: index + 2, gridRow: period + 1 }}
                            />
                        ))}
                    </div>
                ))}

                {/* 실제 과목 블록 */}
                {courseBlocks.map((block) => {
                    const isEnrolled = includesCourseId(enrolledCourseIds, block.course.id);

                    return (
                        <div
                            key={block.key}
                            className={`tt-course-block ${
                                isEnrolled ? "enrolled" : "pending"
                            } ${registrationOpen ? "registration-clickable" : ""}`}
                            style={{
                                gridColumn: block.gridColumn,
                                gridRow: block.gridRow
                            }}
                            title={
                                registrationOpen
                                    ? isEnrolled
                                        ? "좌클릭하면 신청취소, 우클릭하면 시간표에서 제거됩니다."
                                        : "좌클릭하면 수강신청, 우클릭하면 시간표에서 제거됩니다."
                                    : "우클릭하면 시간표에서 제거됩니다."
                            }
                            onClick={() => {
                                if (!registrationOpen) return;

                                if (isEnrolled) {
                                    onCancelEnrollCourse?.(block.course.id);
                                    return;
                                }

                                onEnrollCourse?.(block.course.id);
                            }}
                            onContextMenu={(event) => {
                                event.preventDefault();

                                // 수강신청 ON + 신청완료 과목
                                // → 우클릭도 수강취소로 처리
                                if (registrationOpen && isEnrolled) {
                                    onCancelEnrollCourse?.(block.course.id);
                                    return;
                                }

                                // 수강신청 OFF + 신청완료 과목
                                // → 이미 확정된 과목이므로 시간표에서 제거 불가
                                if (!registrationOpen && isEnrolled) {
                                    return;
                                }

                                // 그 외에는 시간표에서 제거 가능
                                onRemoveCourse?.(block.course.id);
                            }}
                        >
                            <div className="tt-course-title-wrap">
                                <div
                                    className="tt-course-title"
                                    style={{ WebkitLineClamp: block.lineClamp }}
                                >
                                    {block.course.title}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div
                className={`untimed-course-box ${
                    untimedCourses.length === 0 ? "empty" : ""
                }`}
            >
                <div className="untimed-title">
                    시간 미정 과목
                    {untimedCourses.length > 0 ? (
                        <span className="untimed-hint">우클릭하면 시간표에서 제거</span>
                    ) : (
                        <span className="untimed-hint muted">현재 없음</span>
                    )}
                </div>

                {untimedCourses.length > 0 ? (
                    <div className="untimed-list">
                        {untimedCourses.map((course) => {
                            const isEnrolled = includesCourseId(enrolledCourseIds, course.id);
                            const canEnrollFromTimetable = registrationOpen && !isEnrolled;

                            return (
                                <div
                                    key={course.id}
                                    className={`untimed-item ${
                                        isEnrolled ? "enrolled" : "pending"
                                    } ${canEnrollFromTimetable ? "registration-clickable" : ""}`}
                                    title={
                                        registrationOpen
                                            ? "좌클릭하면 수강신청, 우클릭하면 시간표에서 제거됩니다."
                                            : "우클릭하면 시간표에서 제거됩니다."
                                    }
                                    onClick={() => {
                                        if (!registrationOpen) return;

                                        if (isEnrolled) {
                                            onCancelEnrollCourse?.(course.id);
                                            return;
                                        }

                                        onEnrollCourse?.(course.id);
                                    }}
                                    onContextMenu={(event) => {
                                        event.preventDefault();

                                        // 수강신청 ON + 신청완료 과목
                                        // → 우클릭도 수강취소로 처리
                                        if (registrationOpen && isEnrolled) {
                                            onCancelEnrollCourse?.(block.course.id);
                                            return;
                                        }

                                        // 수강신청 OFF + 신청완료 과목
                                        // → 이미 확정된 과목이므로 시간표에서 제거 불가
                                        if (!registrationOpen && isEnrolled) {
                                            return;
                                        }

                                        // 그 외에는 시간표에서 제거 가능
                                        onRemoveCourse?.(block.course.id);
                                    }}
                                >
                                    <strong>{course.title}</strong>
                                    <span>
        {course.code} - {course.section} | {course.credit}학점
      </span>
                                    <span>{course.professor || "교수 미정"}</span>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="untimed-empty-text">
                        시간이 정해지지 않은 과목은 여기에 표시됩니다.
                    </div>
                )}
            </div>
        </section>
    );
}

export default Timetable;