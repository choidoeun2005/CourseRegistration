const mockUser = {
    id: 1,
    name: "홍길동",
    studentId: "2026000000",
    major: "컴퓨터학과",
    doubleMajor: "언어학과",
    quickEnroll: false,
    darkMode: false
};

export function login(req, res) {
    const { studentId, password } = req.body;

    if (!studentId || !password) {
        return res.status(400).json({
            success: false,
            message: "아이디와 비밀번호를 입력해주세요."
        });
    }

    res.json({
        success: true,
        message: "로그인되었습니다.",
        user: mockUser
    });
}

export function getMe(req, res) {
    res.json(mockUser);
}

export function updateSettings(req, res) {
    const { quickEnroll, darkMode } = req.body;

    if (typeof quickEnroll === "boolean") {
        mockUser.quickEnroll = quickEnroll;
    }

    if (typeof darkMode === "boolean") {
        mockUser.darkMode = darkMode;
    }

    res.json({
        success: true,
        user: mockUser
    });
}
