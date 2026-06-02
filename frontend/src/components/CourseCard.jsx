import Button from "./Button.jsx";

function getBadgeLabel(badge) {
    const labelMap = {
        수강포기제한: "포기제한",
        유연학기: "유연",
        교환학생: "교환",
        원격병행: "병행",
        출석자율: "출석자율",
        비대면: "실시간",
        녹강: "녹강",
        MOOC: "MOOC"
    };

    return labelMap[badge] || badge;
}

function getBadgeClassName(badge) {
    if (badge === "수강포기제한") return "red";
    if (badge === "유연학기") return "purple";
    if (badge === "MOOC") return "blue";
    if (badge === "교환학생") return "green";
    if (badge === "녹강") return "blue";
    if (badge === "비대면") return "blue";
    if (badge === "원격병행") return "blue";
    if (badge === "출석자율") return "gray";
    return "gray";
}

function formatPeriods(periods = []) {
    if (!periods.length) return "";

    const sorted = [...periods].sort((a, b) => a - b);

    if (sorted.length === 1) return String(sorted[0]);

    const isConsecutive = sorted.every((period, index) => {
        if (index === 0) return true;
        return period === sorted[index - 1] + 1;
    });

    return isConsecutive
        ? `${sorted[0]}-${sorted[sorted.length - 1]}`
        : sorted.join(",");
}

function getScheduleText(course) {
    const sessions = course.schedule?.sessions || [];

    if (sessions.length > 0) {
        return sessions
            .map((session) => {
                const periodText =
                    session.periodText || formatPeriods(session.periods || []);
                return `${session.day}(${periodText})`;
            })
            .join(" / ");
    }

    return "시간 미정";
}

function getRoomText(course) {
    if (course.schedule?.roomText) return course.schedule.roomText;

    const rooms = course.schedule?.rooms || [];
    if (rooms.length > 0) return rooms.join(" / ");

    if (course.room) {
        return String(course.room).replace(/<br\s*\/?>/gi, " / ");
    }

    return "강의실 미정";
}

function CourseCard({
                        course,
                        liked,
                        inTimetable,
                        blockReason = "",
                        enrolled,
                        registrationOpen = false,
                        quickIndex,
                        compact = false,
                        onToggleLike,
                        onToggleTimetable,
                        onEnrollCourse,
                        onCancelEnrollCourse
                    }) {
    const isEnrolled = Boolean(enrolled);
    const isInTimetable = Boolean(inTimetable);
    const isRegistrationMode = Boolean(registrationOpen);

    const badges = (course.badges || course.tags || []).filter(
        (badge) => badge !== "영강"
    );

    const hashtags = course.hashtags || [];
    const scheduleText = getScheduleText(course);
    const roomText = getRoomText(course);

    /*
      상태 우선순위

      수강신청 ON:
      - 신청 완료: 수강 취소
      - 미신청 + 중복 없음: 신청
      - 미신청 + 중복 있음: blockReason

      수강신청 OFF:
      - 신청 완료: 신청완료 잠금
      - 시간표에 있음: 빼기
      - 시간표에 없음: 시간표에 추가
    */
    const isLockedAfterRegistration = !isRegistrationMode && isEnrolled;
    const disabled =
        isLockedAfterRegistration || (Boolean(blockReason) && !isEnrolled);

    const handleMainAction = () => {
        if (disabled) return;

        if (isRegistrationMode) {
            if (isEnrolled) {
                onCancelEnrollCourse?.(course.id);
                return;
            }

            if (!blockReason) {
                onEnrollCourse?.(course.id);
            }

            return;
        }

        if (!isEnrolled) {
            onToggleTimetable?.(course.id);
        }
    };

    const getMainButtonText = () => {
        if (isRegistrationMode) {
            if (isEnrolled) return "수강 취소";
            if (blockReason) return blockReason;
            return "신청";
        }

        if (isEnrolled) return "신청완료";
        if (isInTimetable) return "빼기";
        if (blockReason) return blockReason;

        return compact ? "추가" : "시간표에 추가";
    };

    const getMainButtonVariant = () => {
        if (isLockedAfterRegistration) return "disabled";
        if (blockReason && !isEnrolled) return "disabled";

        if (isRegistrationMode) {
            if (isEnrolled) return "secondary";
            return "blue";
        }

        if (isInTimetable) return "secondary";
        return "blue";
    };

    const articleClassName = [
        "course-card",
        compact ? "compact" : "",
        isRegistrationMode ? "registration-mode" : "",
        isEnrolled ? "enrolled-card" : "",
        blockReason ? "conflict" : ""
    ]
        .filter(Boolean)
        .join(" ");

    return (
        <article className={articleClassName}>
            <div className="course-card-main">
                <div className="course-title-line">
                    <h3 title={course.title}>{course.title}</h3>

                    {badges.length > 0 && (
                        <div className="course-badges">
                            {badges.map((badge) => (
                                <span
                                    key={badge}
                                    className={`compact-badge ${getBadgeClassName(badge)}`}
                                    title={badge}
                                >
                  {getBadgeLabel(badge)}
                </span>
                            ))}
                        </div>
                    )}
                </div>

                <p className="course-meta">
                    {course.courseType || course.type} | {course.code} - {course.section} |{" "}
                    {course.credit}학점
                </p>

                <div className="course-info">
          <span title={course.professor || "미정"}>
            👤 {course.professor || "미정"}
          </span>
                    <span title={scheduleText}>🕘 {scheduleText}</span>
                    <span title={roomText}>🏫 {roomText}</span>
                </div>

                {hashtags.length > 0 && (
                    <div className="course-hashtags">
                        {hashtags.slice(0, compact ? 4 : hashtags.length).map((tag) => (
                            <span key={tag} className="hashtag">
                {tag}
              </span>
                        ))}

                        {compact && hashtags.length > 4 && (
                            <span className="hashtag more">+{hashtags.length - 4}</span>
                        )}
                    </div>
                )}
            </div>

            {isRegistrationMode ? (
                <button
                    className={`enroll-hit-area ${disabled ? "disabled" : ""} ${
                        isEnrolled ? "cancel-mode" : "enroll-mode"
                    }`}
                    disabled={disabled}
                    onClick={handleMainAction}
                >
                    <span className="enroll-main-text">{getMainButtonText()}</span>

                    {!isEnrolled && !blockReason && quickIndex && (
                        <span className="enroll-shortcut">Alt/⌥ + {quickIndex}</span>
                    )}
                </button>
            ) : (
                <div className="course-actions">
                    <button
                        className={`heart-btn ${liked ? "liked" : ""}`}
                        onClick={() => onToggleLike?.(course.id)}
                    >
                        {compact ? (liked ? "♥" : "♡") : `관심 ${liked ? "♥" : "♡"}`}
                    </button>

                    <Button
                        variant={getMainButtonVariant()}
                        disabled={disabled}
                        onClick={handleMainAction}
                    >
                        {getMainButtonText()}
                    </Button>
                </div>
            )}
        </article>
    );
}

export default CourseCard;