import { DAYS } from "../utils/timeUtils";

function FilterPanel({ dayState, onToggleDay }) {
    const getLabel = (state) => {
        if (state === "include") return "o";
        if (state === "exclude") return "x";
        return "";
    };

    return (
        <section className="filter-panel">
            <label>
                대학
                <select defaultValue="정보대학">
                    <option>정보대학</option>
                    <option>문과대학</option>
                    <option>공과대학</option>
                </select>
            </label>

            <label>
                학과
                <select defaultValue="컴퓨터학과">
                    <option>컴퓨터학과</option>
                    <option>데이터과학과</option>
                    <option>인공지능학과</option>
                </select>
            </label>

            <div className="day-filter">
                <span>요일</span>
                {DAYS.map((day) => (
                    <button
                        key={day}
                        className={`day-btn ${dayState[day]}`}
                        onClick={() => onToggleDay(day)}
                    >
                        {day}
                        {getLabel(dayState[day])}
                    </button>
                ))}
            </div>

            <button className="detail-btn">+ 상세</button>
        </section>
    );
}

export default FilterPanel;
