import { useState } from "react";
import { DAYS, PERIODS } from "../utils/timeUtils";

function Timetable({ courses, hoveredCourse = null, selectedSlots = new Set(), onToggleSlot = () => {} }) {
    const [hoveredSlot, setHoveredSlot] = useState(null);

    function getCoursesAt(day, period) {
        return courses.filter(
            (c) => c.days.includes(day) && c.periods.includes(period)
        );
    }

    return (
        <div className="timetable">
            <div className="time-cell empty"></div>

            {DAYS.map((day) => (
                <div key={day} className="day-head">
                    {day}
                </div>
            ))}

            {PERIODS.map((period) => (
                <div className="row-fragment" key={period}>
                    <div className="time-cell">{period}교시</div>

                    {DAYS.map((day) => {
                        const slotKey = `${day}-${period}`;
                        const cellCourses = getCoursesAt(day, period);
                        const isSelected = selectedSlots.has(slotKey);
                        const isHoveredCell =
                            hoveredSlot?.day === day &&
                            hoveredSlot?.period === period;

                        // 카드 호버 → 해당 칸 틴트
                        const tintedByCard =
                            hoveredCourse &&
                            hoveredCourse.days.includes(day) &&
                            hoveredCourse.periods.includes(period);

                        // 셀 호버 → 같은 수업의 다른 칸 틴트
                        let tintedByCell = false;
                        if (hoveredSlot && !isHoveredCell) {
                            const hoveredCellCourses = getCoursesAt(
                                hoveredSlot.day,
                                hoveredSlot.period
                            );
                            tintedByCell = hoveredCellCourses.some(
                                (c) =>
                                    c.days.includes(day) &&
                                    c.periods.includes(period)
                            );
                        }

                        const classNames = [
                            "table-cell",
                            isSelected ? "slot-selected" : "",
                            isHoveredCell ? "slot-hover" : "",
                            tintedByCard ? "slot-card-tint" : "",
                            tintedByCell ? "slot-cell-tint" : "",
                        ]
                            .filter(Boolean)
                            .join(" ");

                        return (
                            <div
                                key={slotKey}
                                className={classNames}
                                onClick={() => onToggleSlot(slotKey)}
                                onMouseEnter={() =>
                                    setHoveredSlot({ day, period })
                                }
                                onMouseLeave={() => setHoveredSlot(null)}
                            >
                                {cellCourses.length === 0 ? null : cellCourses.length === 1 ? (
                                    <div className="table-course">
                                        <strong>{cellCourses[0].title}</strong>
                                        <span>{cellCourses[0].professor}</span>
                                    </div>
                                ) : (
                                    <div
                                        className="table-course overlap"
                                        data-titles={cellCourses
                                            .map((c) => c.title)
                                            .join("\n")}
                                    >
                                        <strong>
                                            {cellCourses.length}개 겹침
                                        </strong>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            ))}
        </div>
    );
}

export default Timetable;
