import { useState } from "react";

import Button from "./Button.jsx";
import NAVER_PLACE_IDS_BY_BUILDING from "../data/naverPlaceIds.js";

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

function getBadgeDescription(badge) {
    const descriptionMap = {
        MOOC: "기한 안에 자율적으로 수강하는 온라인 녹화 강의입니다.",
        수강포기제한: "수강포기가 제한됩니다. 신청에 유의해주세요.",
        교환학생:
            "정규 정원 외 교환학생 TO가 배정됩니다. TO는 전체정정 시 모든 학생들에게 제공됩니다.",
        유연학기: "일주일에 4차시를 수업하여, 반 학기 동안 진도를 모두 마칩니다.",
        출석자율: "출석 운영 방식이 일반 과목과 다를 수 있습니다.",
        녹강: "녹화 원격강의가 포함된 과목입니다.",
        비대면: "실시간 원격수업 방식이 포함된 과목입니다.",
        원격병행: "대면과 원격 또는 혼합 방식으로 운영될 수 있습니다."
    };

    return descriptionMap[badge] || `${badge} 표시가 있는 과목입니다.`;
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

function getMapPlaceName(roomText) {
    const firstRoom = String(roomText || "")
        .split("/")
        .map((item) => item.trim())
        .find(Boolean);

    if (!firstRoom || firstRoom === "강의실 미정") return "";

    const normalizedRoom = firstRoom
        .replace(/<br\s*\/?>/gi, " ")
        .replace(/\s+/g, " ")
        .trim();

    const buildingMatch = normalizedRoom.match(
        /^[가-힣A-Za-z0-9()·-]*(?:과학관|교양관|도서관|기념관|박물관|체육관|생활관|연구관|연구동|강의동|실험동|본관|신관|별관|센터|회관|관|원|당|홀|빌딩)/
    );

    if (buildingMatch?.[0]) return buildingMatch[0].replace(/[()]/g, "");

    return normalizedRoom.split(/\s+/)[0] || "";
}

function getMapUrl(roomText) {
    const placeName = getMapPlaceName(roomText);

    if (!placeName) return "";

    const placeId = NAVER_PLACE_IDS_BY_BUILDING[placeName];

    if (placeId) {
        return `https://map.naver.com/p/entry/place/${placeId}?c=15.00,0,0,0,dh&placePath=/home`;
    }

    return `https://map.naver.com/p/search/${encodeURIComponent(
        `고려대학교 ${placeName}`
    )}?c=15.00,0,0,0,dh`;
}

function openMapPopup(mapUrl) {
    const popupWidth = 1080;
    const popupHeight = 760;
    const screenLeft = window.screenLeft ?? window.screenX ?? 0;
    const screenTop = window.screenTop ?? window.screenY ?? 0;
    const viewportWidth = window.outerWidth || document.documentElement.clientWidth;
    const viewportHeight = window.outerHeight || document.documentElement.clientHeight;
    const left = Math.max(0, screenLeft + (viewportWidth - popupWidth) / 2);
    const top = Math.max(0, screenTop + (viewportHeight - popupHeight) / 2);

    const popup = window.open(
        mapUrl,
        "courseRoomNaverMap",
        [
            "popup=yes",
            `width=${popupWidth}`,
            `height=${popupHeight}`,
            `left=${Math.round(left)}`,
            `top=${Math.round(top)}`,
            "resizable=yes",
            "scrollbars=yes"
        ].join(",")
    );

    popup?.focus();
}

function CourseTitle({ course }) {
    if (!course.syllabusUrl) {
        return <h3 title={course.title}>{course.title}</h3>;
    }

    return (
        <h3 title={course.title}>
            <a
                className="course-title-link"
                href={course.syllabusUrl}
                target="_blank"
                rel="noreferrer"
                onClick={(event) => event.stopPropagation()}
            >
                {course.title}
            </a>
        </h3>
    );
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
                        isHovered = false,
                        colorDot = null,
                        onToggleLike,
                        onToggleTimetable,
                        onEnrollCourse,
                        onCancelEnrollCourse,
                        onMouseEnter,
                        onMouseLeave,
                        showTimetableAction = true
                    }) {
    const [activeBadge, setActiveBadge] = useState(null);
    const isEnrolled = Boolean(enrolled);
    const isInTimetable = Boolean(inTimetable);
    const isRegistrationMode = Boolean(registrationOpen);

    const badges = (course.badges || course.tags || []).filter(
        (badge) => badge !== "영강"
    );

    const hashtags = course.hashtags || [];
    const scheduleText = getScheduleText(course);
    const roomText = getRoomText(course);
    const mapUrl = getMapUrl(roomText);

    const handleBadgeClick = (event, badge) => {
        event.stopPropagation();

        const rect = event.currentTarget.getBoundingClientRect();
        const boundary = event.currentTarget.closest(
            ".timetable-candidate-list, .course-list, .result-section"
        );
        const boundaryTop = boundary?.getBoundingClientRect().top ?? 0;
        const hasRoomAbove = rect.top - boundaryTop > 96 && rect.top > 96;
        const placement = hasRoomAbove ? "top" : "bottom";

        let align = "center";
        if (rect.left < 180) align = "left";
        if (rect.right > window.innerWidth - 180) align = "right";

        setActiveBadge((current) => {
            if (current?.name === badge) return null;

            return { name: badge, placement, align };
        });
    };

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
        blockReason ? "conflict" : "",
        disabled && !isEnrolled ? "enrollment-blocked" : "",
        isHovered ? "card-highlighted" : ""
    ]
        .filter(Boolean)
        .join(" ");

    return (
        <article className={articleClassName} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
            {colorDot && (
                <span className="course-color-dot card-pin" style={{ background: colorDot }} />
            )}
            <div className="course-card-main">
                <div className="course-title-line">
                    <CourseTitle course={course} />

                    {badges.length > 0 && (
                        <div className="course-badges">
                            {badges.map((badge) => (
                                <button
                                    type="button"
                                    key={badge}
                                    className={`compact-badge ${getBadgeClassName(badge)}${
                                        activeBadge?.name === badge ? " is-selected" : ""
                                    }`}
                                    aria-expanded={activeBadge?.name === badge}
                                    onClick={(event) => handleBadgeClick(event, badge)}
                                >
                                    <span>{getBadgeLabel(badge)}</span>
                                    {activeBadge?.name === badge && (
                                        <span
                                            className={`badge-popover ${activeBadge.placement} align-${activeBadge.align}`}
                                            role="status"
                                        >
                                            {getBadgeDescription(badge)}
                                        </span>
                                    )}
                                </button>
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
                    <span title={roomText}>
                        🏫{" "}
                        {mapUrl ? (
                            <button
                                type="button"
                                className="room-map-trigger"
                                onClick={(event) => {
                                    event.stopPropagation();
                                    openMapPopup(mapUrl);
                                }}
                            >
                                {roomText}
                            </button>
                        ) : (
                            roomText
                        )}
                    </span>
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

                    {showTimetableAction && (
                        <Button
                            variant={getMainButtonVariant()}
                            disabled={disabled}
                            onClick={handleMainAction}
                        >
                            {getMainButtonText()}
                        </Button>
                    )}
                </div>
            )}

        </article>
    );
}

export default CourseCard;
