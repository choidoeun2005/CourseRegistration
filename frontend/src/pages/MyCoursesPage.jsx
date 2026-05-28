function MyCoursesPage({
                           user,
                           quickEnroll,
                           darkMode,
                           onToggleQuickEnroll,
                           onToggleDarkMode
                       }) {
    return (
        <div className="mypage">
            <h2>마이페이지</h2>

            <div className="profile-box">
                <div className="profile-row">
                    <span>이름</span>
                    <strong>{user?.name || "홍길동"}</strong>
                </div>

                <div className="profile-row">
                    <span>전공</span>
                    <strong>{user?.major || "컴퓨터학과"}</strong>
                </div>

                <div className="profile-row">
                    <span>이중</span>
                    <strong>{user?.doubleMajor || "언어학과"}</strong>
                </div>
            </div>

            <div className="setting-box">
                <label>
                    단축키로 빠른 수강신청하기
                    <input
                        type="checkbox"
                        checked={quickEnroll}
                        onChange={onToggleQuickEnroll}
                    />
                </label>

                <label>
                    다크 모드
                    <input
                        type="checkbox"
                        checked={darkMode}
                        onChange={onToggleDarkMode}
                    />
                </label>
            </div>
        </div>
    );
}

export default MyCoursesPage;