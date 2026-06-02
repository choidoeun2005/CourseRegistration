import Button from "./Button.jsx";

function CourseCard({
    course,
    liked,
    inTimetable,
    conflict,
    enrolled,
    quickIndex,
    showEnrollButton = false,
    isHovered,
    onToggleLike,
    onToggleTimetable,
    onEnrollCourse,
    onMouseEnter,
    onMouseLeave,
}) {
    return (
        <article
            className={`course-card ${conflict ? "conflict" : ""} ${isHovered ? "card-hovered" : ""}`}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
        >
            <div className="course-main">
                <div className="course-title-row">
                    <h3>{course.title}</h3>
                    <div className="flag-group">
                        {course.flags.map((flag) => (
                            <span key={flag} className="mini-flag">
                                {flag}
                            </span>
                        ))}
                    </div>
                </div>

                <p className="course-meta">
                    {course.type} | {course.code} - {course.section} |{" "}
                    {course.credit}학점
                </p>

                <div className="course-info">
                    <span>👤 {course.professor}</span>
                    <span>🕘 {course.timeText}</span>
                    <span>🏫 {course.room}</span>
                </div>
            </div>

            <div className="course-tags">
                {course.tags.map((tag) => (
                    <span
                        key={tag}
                        className={`tag ${tag === "수강포기제한" ? "red" : "purple"}`}
                    >
                        {tag}
                    </span>
                ))}
            </div>

            <div className="course-actions">
                <button
                    className="heart-btn"
                    onClick={() => onToggleLike(course.id)}
                >
                    관심 {liked ? "♥" : "♡"}
                </button>

                {showEnrollButton ? (
                    <Button
                        variant={
                            enrolled ? "disabled" : conflict ? "disabled" : "primary"
                        }
                        disabled={enrolled || conflict}
                        onClick={() => onEnrollCourse(course.id)}
                    >
                        {enrolled
                            ? "신청중"
                            : conflict
                            ? "교시 중복"
                            : `신청${quickIndex ? `\n(Ctrl + ${quickIndex})` : ""}`}
                    </Button>
                ) : (
                    <Button
                        variant={inTimetable ? "secondary" : "blue"}
                        onClick={() => onToggleTimetable(course.id)}
                    >
                        {inTimetable ? "시간표에서 빼기" : "시간표에 추가"}
                    </Button>
                )}
            </div>
        </article>
    );
}

export default CourseCard;
