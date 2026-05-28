import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../components/Button.jsx";
import { loginUser } from "../api/userApi";

function LoginPage({ onLogin }) {
    const navigate = useNavigate();
    const [studentId, setStudentId] = useState("");
    const [password, setPassword] = useState("");
    const [errorMessage, setErrorMessage] = useState("");

    const handleLogin = async () => {
        try {
            const result = await loginUser(studentId, password);

            onLogin(result.user);
            navigate("/courses");
        } catch (error) {
            setErrorMessage(error.message || "로그인에 실패했습니다.");
        }
    };

    return (
        <div className="login-page">
            <div className="login-card">
                <h1>📋 수강신청 시스템</h1>
                <p>2026-1학기 · 서울캠퍼스</p>

                <input
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    placeholder="아이디"
                />

                <input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    type="password"
                    placeholder="비밀번호"
                />

                {errorMessage && <p className="error-message">{errorMessage}</p>}

                <Button variant="primary" onClick={handleLogin}>
                    로그인
                </Button>
            </div>
        </div>
    );
}

export default LoginPage;