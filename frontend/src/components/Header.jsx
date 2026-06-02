import { NavLink } from "react-router-dom";

function Header({ registrationOpen, onToggleRegistration }) {
    return (
        <header className="header">
            <div className="header-left">
                <div className="logo">📋 수강신청 시스템</div>
                <div className="semester">2026-1학기 · 서울캠퍼스</div>
            </div>

            <nav className="nav">
                <NavLink to="/courses">과목 검색</NavLink>
                <NavLink to="/cart">관심과목 보기</NavLink>
                <NavLink to="/mypage">마이페이지</NavLink>
                <NavLink to="/recommend">🪄 과목 추천 마법사</NavLink>
            </nav>

            <button
                className={`registration-toggle ${registrationOpen ? "open" : "closed"}`}
                onClick={onToggleRegistration}
            >
                {registrationOpen ? "수강신청 OPEN" : "수강신청 CLOSED"}
            </button>
        </header>
    );
}

export default Header;