function EnrollmentQueueOverlay({ queue }) {
    if (!queue?.open) return null;

    const isCancel = queue.mode === "cancel";
    const isWaiting = queue.stage === "waiting";
    const isProcessing = queue.stage === "processing";
    const isSuccess = queue.stage === "success";
    const isError = queue.stage === "error";

    const actionLabel = isCancel ? "수강취소" : "수강신청";

    return (
        <div className="enrollment-queue-overlay" role="alert" aria-live="assertive">
            <div className="enrollment-queue-card">
                <div className="queue-card-label">{actionLabel} 대기열</div>

                <h2>{queue.courseTitle}</h2>

                {isWaiting && (
                    <>
                        <p className="queue-main-message">
                            현재 앞에{" "}
                            <strong>{queue.remainingWaiters.toLocaleString()}명</strong>이
                            대기 중입니다.
                        </p>

                        <p className="queue-sub-message">
                            예상 대기 시간 약 {queue.remainingSeconds}초
                        </p>
                    </>
                )}

                {isProcessing && (
                    <p className="queue-main-message">
                        대기열 통과 완료. {actionLabel} 요청을 처리하고 있습니다.
                    </p>
                )}

                {isSuccess && (
                    <p className="queue-main-message success">
                        {queue.resultMessage ||
                            (isCancel
                                ? "수강신청이 취소되었습니다."
                                : "수강신청이 완료되었습니다.")}
                    </p>
                )}

                {isError && (
                    <p className="queue-main-message error">
                        {queue.resultMessage ||
                            (isCancel
                                ? "수강취소에 실패했습니다."
                                : "수강신청에 실패했습니다.")}
                    </p>
                )}

                <div className="queue-progress-track">
                    <div
                        className={`queue-progress-fill ${
                            isError ? "error" : isSuccess ? "success" : ""
                        }`}
                        style={{ width: `${queue.progress}%` }}
                    />
                </div>

                <div className="queue-progress-meta">
                    <span>{queue.progress}%</span>
                    <span>다른 조작은 잠시 제한됩니다.</span>
                </div>

                <div className="queue-tip-box">
                    <strong>TIP</strong>
                    <span>{queue.tip || "잠시만 기다려 주세요."}</span>
                </div>
            </div>
        </div>
    );
}

export default EnrollmentQueueOverlay;