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

const HEADER_ROW_HEIGHT = 42;
const PERIOD_ROW_HEIGHT = 54;

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

function buildCourseLayout(courses) {
    const baseBlocks = [];

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
                const gridRowStart = startPeriod + 1;
                const gridRowEnd = gridRowStart + span;

                baseBlocks.push({
                    key: `${course.id}-${sessionIndex}-${blockIndex}`,
                    course,
                    day,
                    room: session.room || "",
                    startPeriod,
                    endPeriod,
                    span,
                    periods: block.periods,
                    gridColumn: dayColumn,
                    gridRowStart,
                    gridRowEnd,
                    lineClamp: Math.max(1, span)
                });
            });
        });
    });

    const cellCounts = baseBlocks.reduce((counts, block) => {
        block.periods.forEach((period) => {
            const key = `${block.gridColumn}-${period}`;
            counts[key] = (counts[key] || 0) + 1;
        });

        return counts;
    }, {});

    const allBlocks = baseBlocks.flatMap((block) => {
        const shouldSplit =
            block.span > 1 &&
            block.periods.some(
                (period) => (cellCounts[`${block.gridColumn}-${period}`] || 0) > 1
            );

        if (!shouldSplit) return [block];

        return block.periods.map((period, periodIndex) => {
            const gridRowStart = period + 1;

            return {
                ...block,
                key: `${block.key}-period-${periodIndex}`,
                startPeriod: period,
                endPeriod: period,
                span: 1,
                periods: [period],
                gridRowStart,
                gridRowEnd: gridRowStart + 1,
                lineClamp: 1
            };
        });
    });

    const groups = [];
    const assigned = new Set();
    const rowLayerCounts = PERIODS.reduce((acc, period) => {
        acc[period] = 1;
        return acc;
    }, {});

    allBlocks.forEach((block, i) => {
        if (assigned.has(i)) return;

        const groupIndices = [i];
        assigned.add(i);

        let changed = true;
        while (changed) {
            changed = false;
            allBlocks.forEach((other, j) => {
                if (assigned.has(j)) return;
                if (other.gridColumn !== block.gridColumn) return;

                const overlapsWithGroup = groupIndices.some((gi) => {
                    const gb = allBlocks[gi];
                    return (
                        gb.gridColumn === other.gridColumn &&
                        gb.gridRowStart < other.gridRowEnd &&
                        other.gridRowStart < gb.gridRowEnd
                    );
                });

                if (overlapsWithGroup) {
                    groupIndices.push(j);
                    assigned.add(j);
                    changed = true;
                }
            });
        }

        const groupBlocks = groupIndices.map((gi) => allBlocks[gi]);
        const minRow = Math.min(...groupBlocks.map((b) => b.gridRowStart));
        const maxRow = Math.max(...groupBlocks.map((b) => b.gridRowEnd));
        const groupSpan = maxRow - minRow;
        const stackCount = groupBlocks.length;

        for (let row = minRow; row < maxRow; row += 1) {
            const period = row - 1;
            if (rowLayerCounts[period] !== undefined) {
                rowLayerCounts[period] = Math.max(rowLayerCounts[period], stackCount);
            }
        }

        groups.push({
            key: `group-${i}`,
            gridColumn: block.gridColumn,
            gridRowStart: minRow,
            gridRowEnd: maxRow,
            blocks: groupBlocks.map((b, stackIndex) => {
                const blockTopFrac = (b.gridRowStart - minRow) / groupSpan;
                const blockHeightFrac = (b.gridRowEnd - b.gridRowStart) / groupSpan;

                return {
                    ...b,
                    stackIndex,
                    stackCount,
                    topFrac: blockTopFrac + (blockHeightFrac * stackIndex) / stackCount,
                    heightFrac: blockHeightFrac / stackCount,
                    lineClamp: Math.max(1, Math.min(3, b.span * 2))
                };
            })
        });
    });

    return { groups, rowLayerCounts };
}

function includesCourseId(ids = [], courseId) {
    return ids.map(Number).includes(Number(courseId));
}

function CourseSyllabusLink({ course, children, className = "" }) {
    if (!course.syllabusUrl) {
        return children;
    }

    return (
        <a
            className={className}
            href={course.syllabusUrl}
            target="_blank"
            rel="noreferrer"
            onClick={(event) => event.stopPropagation()}
            onContextMenu={(event) => event.stopPropagation()}
        >
            {children}
        </a>
    );
}

function Timetable({
                       courses = [],
                       maxCredits = 22,
                       registrationOpen = false,
                       enrolledCourseIds = [],
                       hoveredCells = new Set(),
                       courseColorMap = {},
                       getBlockReason,
                       activeTimetableTab = 1,
                       onSwitchTimetableTab,
                       onCellClick,
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
    const { groups: courseGroups, rowLayerCounts } = buildCourseLayout(timedCourses);
    const gridTemplateRows = [
        `${HEADER_ROW_HEIGHT}px`,
        ...PERIODS.map(
            (period) =>
                `minmax(${PERIOD_ROW_HEIGHT * rowLayerCounts[period]}px, auto)`
        )
    ].join(" ");

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

                <div className="timetable-tab-bar timetable-summary-tabs">
                    {[1, 2, 3, 4].map((tab) => (
                        <button
                            key={tab}
                            type="button"
                            className={`timetable-tab-btn${activeTimetableTab === tab ? " active" : ""}`}
                            onClick={() => onSwitchTimetableTab?.(tab)}
                        >
                            시간표 {tab}
                        </button>
                    ))}
                </div>

                <span className="timetable-hint">
                    {registrationOpen
                        ? "빈 칸: 후보 보기 · 한 교시 최대 3과목 · 과목 클릭: 수강신청"
                        : "빈 칸: 후보 보기 · 한 교시 최대 3과목 · 과목 우클릭: 제거"}
                </span>
            </div>

            <div
                className="timetable-grid"
                style={{ "--tt-grid-template-rows": gridTemplateRows }}
            >
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
                                className={`tt-bg-cell tt-bg-cell-clickable${hoveredCells.has(`${day}-${period}`) ? " card-hovered" : ""}`}
                                style={{ gridColumn: index + 2, gridRow: period + 1 }}
                                title={`${day} ${period}교시 후보 보기`}
                                onClick={() => onCellClick?.(day, period)}
                            />
                        ))}
                    </div>
                ))}

                {/* 과목 그룹 (겹치는 과목 포함) */}
                {courseGroups.map((group) => (
                    <div
                        key={group.key}
                        className="tt-course-group"
                        style={{
                            gridColumn: group.gridColumn,
                            gridRow: `${group.gridRowStart} / ${group.gridRowEnd}`
                        }}
                    >
                        {group.blocks.map((block) => {
                            const isEnrolled = includesCourseId(enrolledCourseIds, block.course.id);
                            const dotColor = courseColorMap[Number(block.course.id)] || "#2563eb";
                            const blockReason =
                                registrationOpen && !isEnrolled
                                    ? getBlockReason?.(block.course) || ""
                                    : "";
                            const isEnrollmentBlocked = Boolean(blockReason);

                            return (
                                <div
                                    key={block.key}
                                    className={`tt-course-block ${
                                        isEnrolled ? "enrolled" : "pending"
                                    } ${registrationOpen ? "registration-clickable" : ""} ${
                                        isEnrollmentBlocked ? "enrollment-blocked" : ""
                                    }`}
                                    style={{
                                        position: "absolute",
                                        top: `${block.topFrac * 100}%`,
                                        height: `${block.heightFrac * 100}%`,
                                        left: 0,
                                        width: "100%",
                                        boxSizing: "border-box",
                                        margin: 0
                                    }}
                                    title={
                                        registrationOpen
                                            ? isEnrolled
                                                ? "좌클릭하면 신청취소, 우클릭하면 시간표에서 제거됩니다."
                                                : isEnrollmentBlocked
                                                    ? `${blockReason}: 수강신청할 수 없습니다.`
                                                : "좌클릭하면 수강신청, 우클릭하면 시간표에서 제거됩니다."
                                            : "우클릭하면 시간표에서 제거됩니다."
                                    }
                                    onClick={() => {
                                        if (!registrationOpen) return;
                                        if (isEnrollmentBlocked) return;

                                        if (isEnrolled) {
                                            onCancelEnrollCourse?.(block.course.id);
                                            return;
                                        }

                                        onEnrollCourse?.(block.course.id);
                                    }}
                                    onContextMenu={(event) => {
                                        event.preventDefault();

                                        if (registrationOpen && isEnrolled) {
                                            onCancelEnrollCourse?.(block.course.id);
                                            return;
                                        }

                                        if (!registrationOpen && isEnrolled) {
                                            return;
                                        }

                                        onRemoveCourse?.(block.course.id);
                                    }}
                                >
                                    {dotColor && (
                                        <span
                                            className="course-color-dot tt-course-pin"
                                            style={{ background: dotColor }}
                                            aria-hidden="true"
                                        />
                                    )}
                                    <div className="tt-course-title-wrap">
                                        <CourseSyllabusLink
                                            course={block.course}
                                            className="tt-course-title-link"
                                        >
                                            <div
                                                className="tt-course-title"
                                                style={{ WebkitLineClamp: block.lineClamp }}
                                            >
                                                {block.course.title}
                                            </div>
                                        </CourseSyllabusLink>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ))}
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
                            const dotColor = courseColorMap[Number(course.id)];
                            const blockReason =
                                canEnrollFromTimetable
                                    ? getBlockReason?.(course) || ""
                                    : "";
                            const isEnrollmentBlocked = Boolean(blockReason);

                            return (
                                <div
                                    key={course.id}
                                    className={`untimed-item ${
                                        isEnrolled ? "enrolled" : "pending"
                                    } ${canEnrollFromTimetable ? "registration-clickable" : ""} ${
                                        isEnrollmentBlocked ? "enrollment-blocked" : ""
                                    }`}
                                    title={
                                        registrationOpen
                                            ? isEnrollmentBlocked
                                                ? `${blockReason}: 수강신청할 수 없습니다.`
                                                : "좌클릭하면 수강신청, 우클릭하면 시간표에서 제거됩니다."
                                            : "우클릭하면 시간표에서 제거됩니다."
                                    }
                                    onClick={() => {
                                        if (!registrationOpen) return;
                                        if (isEnrollmentBlocked) return;

                                        if (isEnrolled) {
                                            onCancelEnrollCourse?.(course.id);
                                            return;
                                        }

                                        onEnrollCourse?.(course.id);
                                    }}
                                    onContextMenu={(event) => {
                                        event.preventDefault();

                                        if (registrationOpen && isEnrolled) {
                                            onCancelEnrollCourse?.(course.id);
                                            return;
                                        }

                                        if (!registrationOpen && isEnrolled) {
                                            return;
                                        }

                                        onRemoveCourse?.(course.id);
                                    }}
                                >
                                    {dotColor && (
                                        <span
                                            className="course-color-dot untimed-dot"
                                            style={{ background: dotColor }}
                                        />
                                    )}
                                    <CourseSyllabusLink
                                        course={course}
                                        className="untimed-course-title-link"
                                    >
                                        <strong>{course.title}</strong>
                                    </CourseSyllabusLink>
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
