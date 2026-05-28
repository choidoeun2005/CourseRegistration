import { DAYS, PERIODS } from "../utils/timeUtils";

function Timetable({ courses }) {
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
                        const course = courses.find(
                            (item) => item.days.includes(day) && item.periods.includes(period)
                        );

                        return (
                            <div key={`${day}-${period}`} className="table-cell">
                                {course && (
                                    <div className="table-course">
                                        <strong>{course.title}</strong>
                                        <span>{course.professor}</span>
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
