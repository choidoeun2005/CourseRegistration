import { useCallback, useEffect, useRef, useState } from "react";

const ENROLL_TIPS = [
    "새로고침하지 않아도 됩니다. 잠시만 기다려 주세요.",
    "요청은 한 번만 처리됩니다. 같은 버튼을 반복해서 누르지 않아도 됩니다.",
    "대기열이 끝나면 자동으로 신청 결과가 반영됩니다.",
    "신청 완료 후에는 시간표에 자동으로 반영됩니다.",
    "실패하더라도 시간표에 담긴 다른 후보 과목을 바로 신청할 수 있습니다."
];

const CANCEL_TIPS = [
    "취소 요청을 안전하게 처리하고 있습니다.",
    "취소가 완료되면 신청 상태만 해제되고 시간표에는 과목이 남습니다.",
    "잠시 후 다시 같은 과목을 신청할 수 있습니다.",
    "요청이 처리되는 동안 다른 조작은 잠시 제한됩니다."
];

function getCourseId(course) {
    if (typeof course === "object") return course.id;
    return course;
}

function getCourseTitle(course) {
    if (typeof course === "object" && course?.title) return course.title;
    return "선택한 과목";
}

function createEnrollPlan(courseId) {
    const numericId = Number(courseId) || 1;
    const initialWaiters = 160 + ((numericId * 91 + Date.now()) % 340);

    const totalMs = Math.min(
        10000,
        Math.max(3000, Math.ceil(initialWaiters / 100) * 2000)
    );

    return {
        initialWaiters: Math.round(initialWaiters),
        totalMs
    };
}

function createCancelPlan() {
    return {
        initialWaiters: 250,
        totalMs: 5000
    };
}

export function useEnrollmentQueue(onEnrollCourse, onCancelEnrollCourse) {
    const [queueState, setQueueState] = useState({
        open: false,
        mode: "enroll",
        stage: "idle",
        courseTitle: "",
        progress: 0,
        remainingWaiters: 0,
        remainingSeconds: 0,
        tip: "",
        resultMessage: ""
    });

    const runningRef = useRef(false);
    const intervalRef = useRef(null);
    const closeTimeoutRef = useRef(null);

    const clearTimers = useCallback(() => {
        if (intervalRef.current) {
            window.clearInterval(intervalRef.current);
            intervalRef.current = null;
        }

        if (closeTimeoutRef.current) {
            window.clearTimeout(closeTimeoutRef.current);
            closeTimeoutRef.current = null;
        }
    }, []);

    useEffect(() => {
        return () => clearTimers();
    }, [clearTimers]);

    const runQueue = useCallback(
        async ({ course, mode }) => {
            if (runningRef.current) {
                return {
                    success: false,
                    message: "이미 요청이 진행 중입니다."
                };
            }

            const courseId = getCourseId(course);
            const courseTitle = getCourseTitle(course);

            const isCancel = mode === "cancel";
            const tips = isCancel ? CANCEL_TIPS : ENROLL_TIPS;
            const action = isCancel ? onCancelEnrollCourse : onEnrollCourse;
            const plan = isCancel ? createCancelPlan() : createEnrollPlan(courseId);

            runningRef.current = true;
            clearTimers();

            setQueueState({
                open: true,
                mode,
                stage: "waiting",
                courseTitle,
                progress: 0,
                remainingWaiters: plan.initialWaiters,
                remainingSeconds: Math.ceil(plan.totalMs / 1000),
                tip: tips[0],
                resultMessage: ""
            });

            return new Promise((resolve) => {
                const startedAt = Date.now();

                intervalRef.current = window.setInterval(async () => {
                    const elapsedMs = Date.now() - startedAt;
                    const progress = Math.min(
                        100,
                        Math.round((elapsedMs / plan.totalMs) * 100)
                    );

                    const removedWaiters = Math.floor((elapsedMs / 2000) * 100);
                    const remainingWaiters = Math.max(
                        0,
                        plan.initialWaiters - removedWaiters
                    );

                    const remainingSeconds = Math.max(
                        0,
                        Math.ceil((plan.totalMs - elapsedMs) / 1000)
                    );

                    const tipIndex = Math.floor(elapsedMs / 1600) % tips.length;

                    setQueueState({
                        open: true,
                        mode,
                        stage: "waiting",
                        courseTitle,
                        progress,
                        remainingWaiters,
                        remainingSeconds,
                        tip: tips[tipIndex],
                        resultMessage: ""
                    });

                    if (elapsedMs < plan.totalMs) return;

                    clearTimers();

                    setQueueState((prev) => ({
                        ...prev,
                        stage: "processing",
                        progress: 100,
                        remainingWaiters: 0,
                        remainingSeconds: 0,
                        tip: isCancel
                            ? "대기열 통과 완료. 수강취소 요청을 처리하고 있습니다."
                            : "대기열 통과 완료. 수강신청 요청을 처리하고 있습니다."
                    }));

                    let result;

                    try {
                        result = await action(courseId);
                    } catch (error) {
                        result = {
                            success: false,
                            message:
                                error?.message ||
                                (isCancel
                                    ? "수강취소 처리 중 오류가 발생했습니다."
                                    : "수강신청 처리 중 오류가 발생했습니다.")
                        };
                    }

                    setQueueState((prev) => ({
                        ...prev,
                        stage: result?.success ? "success" : "error",
                        progress: 100,
                        resultMessage:
                            result?.message ||
                            (result?.success
                                ? isCancel
                                    ? "수강신청이 취소되었습니다."
                                    : "수강신청이 완료되었습니다."
                                : isCancel
                                    ? "수강취소에 실패했습니다."
                                    : "수강신청에 실패했습니다.")
                    }));

                    closeTimeoutRef.current = window.setTimeout(() => {
                        setQueueState({
                            open: false,
                            mode: "enroll",
                            stage: "idle",
                            courseTitle: "",
                            progress: 0,
                            remainingWaiters: 0,
                            remainingSeconds: 0,
                            tip: "",
                            resultMessage: ""
                        });

                        runningRef.current = false;
                        resolve(result);
                    }, 1000);
                }, 100);
            });
        },
        [clearTimers, onEnrollCourse, onCancelEnrollCourse]
    );

    const startEnrollment = useCallback(
        (course) => runQueue({ course, mode: "enroll" }),
        [runQueue]
    );

    const startCancelEnrollment = useCallback(
        (course) => runQueue({ course, mode: "cancel" }),
        [runQueue]
    );

    return {
        queueState,
        isQueueRunning: queueState.open || runningRef.current,
        startEnrollment,
        startCancelEnrollment
    };
}