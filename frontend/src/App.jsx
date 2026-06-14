import { Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";

import Header from "./components/Header.jsx";
import Toast from "./components/Toast.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import CourseListPage from "./pages/CourseListPage.jsx";
import CartPage from "./pages/CartPage.jsx";
import MyCoursesPage from "./pages/MyCoursesPage.jsx";
import RecommendPage from "./pages/RecommendPage.jsx";

import useCourses from "./hooks/useCourses";

import { fetchMe, updateUserSettings } from "./api/userApi";
import {
    fetchLikedCourses,
    fetchTimetableCourses,
    fetchEnrollmentStatus,
    toggleLikedCourse,
    addCourseToTimetable,
    removeCourseFromTimetable,
    enrollCourse as requestEnrollCourse,
    cancelEnrollCourse as requestCancelEnrollCourse,
    resetTimetableState as requestResetTimetableState
} from "./api/timetableApi";

import {
    fetchRegistrationStatus,
    toggleRegistrationStatus
} from "./api/registrationApi";

function App() {
    const [isLoggedIn, setIsLoggedIn] = useState(
        localStorage.getItem("isLoggedIn") === "true"
    );

    const [user, setUser] = useState(null);
    const [likedCourseIds, setLikedCourseIds] = useState([]);
    const [timetableCourseIds, setTimetableCourseIds] = useState([]);
    const [enrolledCourseIds, setEnrolledCourseIds] = useState([]);
    const [quickEnroll, setQuickEnroll] = useState(false);
    const [darkMode, setDarkMode] = useState(false);
    const [registrationOpen, setRegistrationOpen] = useState(false);
    const [toast, setToast] = useState(null);

    const { courses } = useCourses();

    const getCourseTitle = (courseId) => {
        const course = courses.find((c) => Number(c.id) === Number(courseId));
        return course?.title || "강의";
    };

    const showToast = (message) => {
        setToast({ message, id: Date.now() });
    };

    useEffect(() => {
        document.body.classList.toggle("dark", darkMode);
    }, [darkMode]);

    useEffect(() => {
        if (!isLoggedIn) return;

        async function loadInitialData() {
            try {
                const [
                    me,
                    likedCourses,
                    timetableCourses,
                    enrollmentStatus,
                    registrationStatus
                ] = await Promise.all([
                    fetchMe(),
                    fetchLikedCourses(),
                    fetchTimetableCourses(),
                    fetchEnrollmentStatus(),
                    fetchRegistrationStatus()
                ]);

                setRegistrationOpen(registrationStatus.registrationOpen);

                setUser(me);
                setQuickEnroll(me.quickEnroll);
                setDarkMode(me.darkMode);

                setLikedCourseIds(likedCourses.map((course) => course.id));
                setTimetableCourseIds(timetableCourses.map((course) => course.id));
                setEnrolledCourseIds(enrollmentStatus.enrolledCourseIds);

                setRegistrationOpen(registrationStatus.registrationOpen);
            } catch (error) {
                console.error(error);
            }
        }

        loadInitialData();
    }, [isLoggedIn]);

    const handleLogin = (loginUser) => {
        setIsLoggedIn(true);
        setUser(loginUser);
        setQuickEnroll(loginUser.quickEnroll);
        setDarkMode(loginUser.darkMode);
        localStorage.setItem("isLoggedIn", "true");
    };

    const handleToggleRegistration = async () => {
        try {
            const result = await toggleRegistrationStatus();
            setRegistrationOpen(result.registrationOpen);
        } catch (error) {
            alert("수강신청 상태 변경에 실패했습니다.");
        }
    };

    const toggleLike = async (courseId) => {
        try {
            const wasLiked = likedCourseIds.map(Number).includes(Number(courseId));
            const result = await toggleLikedCourse(courseId);
            setLikedCourseIds(result.likedCourseIds);

            showToast(
                `${getCourseTitle(courseId)} 강의를 관심과목${
                    wasLiked ? "에서 제거" : "에 추가"
                }하였습니다.`
            );
        } catch (error) {
            alert(error.message || "관심과목 변경에 실패했습니다.");
        }
    };

    const toggleTimetable = async (courseId) => {
        try {
            const isAlreadyInTimetable = timetableCourseIds
                .map(Number)
                .includes(Number(courseId));

            const result = isAlreadyInTimetable
                ? await removeCourseFromTimetable(courseId)
                : await addCourseToTimetable(courseId);

            setTimetableCourseIds(result.courses.map((course) => course.id));

            showToast(
                `${getCourseTitle(courseId)} 강의를 시간표${
                    isAlreadyInTimetable ? "에서 제거" : "에 추가"
                }하였습니다.`
            );

            if (result.conflict) {
                alert("시간표에 추가했지만 교시가 중복됩니다.");
            }
        } catch (error) {
            alert(error.message || "시간표 변경에 실패했습니다.");
        }
    };

    const addUniqueId = (ids, courseId) => {
        const numericId = Number(courseId);

        if (ids.map(Number).includes(numericId)) {
            return ids.map(Number);
        }

        return [...ids.map(Number), numericId];
    };

    const removeId = (ids, courseId) => {
        const numericId = Number(courseId);
        return ids.map(Number).filter((id) => id !== numericId);
    };

    const enrollCourse = async (courseId) => {
        try {
            const numericId = Number(courseId);
            const result = await requestEnrollCourse(numericId);

            if (result.success) {
                const nextEnrolledCourseIds =
                    result.enrolledCourseIds && result.enrolledCourseIds.length > 0
                        ? result.enrolledCourseIds.map(Number)
                        : addUniqueId(enrolledCourseIds, numericId);

                setEnrolledCourseIds(nextEnrolledCourseIds);

                // 신청 성공하면 시간표에도 자동 추가
                setTimetableCourseIds((prev) => addUniqueId(prev, numericId));

                return {
                    ...result,
                    enrolledCourseIds: nextEnrolledCourseIds,
                    timetableCourseIds: addUniqueId(timetableCourseIds, numericId)
                };
            }

            return result;
        } catch (error) {
            return {
                success: false,
                message: error.message || "수강신청에 실패했습니다."
            };
        }
    };

    const handleCancelEnrollCourse = async (courseId) => {
        try {
            const numericId = Number(courseId);
            const result = await requestCancelEnrollCourse(numericId);

            if (result.success) {
                const nextEnrolledCourseIds =
                    result.enrolledCourseIds && result.enrolledCourseIds.length > 0
                        ? result.enrolledCourseIds.map(Number)
                        : removeId(enrolledCourseIds, numericId);

                setEnrolledCourseIds(nextEnrolledCourseIds);

                // 취소하면 시간표에서도 제거
                setTimetableCourseIds((prev) => removeId(prev, numericId));

                return {
                    ...result,
                    enrolledCourseIds: nextEnrolledCourseIds,
                    timetableCourseIds: removeId(timetableCourseIds, numericId)
                };
            }

            return result;
        } catch (error) {
            return {
                success: false,
                message: error.message || "수강취소에 실패했습니다."
            };
        }
    };

    const handleResetAppState = async () => {
        const confirmed = window.confirm(
            "관심과목, 시간표, 수강신청 상태를 모두 초기화하시겠습니까?"
        );

        if (!confirmed) return;

        try {
            const result = await requestResetTimetableState();

            setLikedCourseIds(result.likedCourseIds || []);
            setTimetableCourseIds(result.timetableCourseIds || []);
            setEnrolledCourseIds(result.enrolledCourseIds || []);
        } catch (error) {
            alert(error.message || "초기화에 실패했습니다.");
        }
    };

    const toggleQuickEnroll = async () => {
        const nextValue = !quickEnroll;
        setQuickEnroll(nextValue);

        try {
            await updateUserSettings({ quickEnroll: nextValue });
        } catch (error) {
            setQuickEnroll(!nextValue);
            alert("설정 저장에 실패했습니다.");
        }
    };

    const toggleDarkMode = async () => {
        const nextValue = !darkMode;
        setDarkMode(nextValue);

        try {
            await updateUserSettings({ darkMode: nextValue });
        } catch (error) {
            setDarkMode(!nextValue);
            alert("설정 저장에 실패했습니다.");
        }
    };

    return (
        <div className="app">
            {isLoggedIn && (
                <Header
                    registrationOpen={registrationOpen}
                    onToggleRegistration={handleToggleRegistration}
                    onReset={handleResetAppState}
                />
            )}

            <main className="page-container">
                <Routes>
                    <Route
                        path="/login"
                        element={<LoginPage onLogin={handleLogin} />}
                    />

                    <Route
                        path="/courses"
                        element={
                            isLoggedIn ? (
                                <CourseListPage
                                    likedCourseIds={likedCourseIds}
                                    timetableCourseIds={timetableCourseIds}
                                    enrolledCourseIds={enrolledCourseIds}
                                    registrationOpen={registrationOpen}
                                    onToggleLike={toggleLike}
                                    onToggleTimetable={toggleTimetable}
                                    onEnrollCourse={enrollCourse}
                                    onCancelEnrollCourse={handleCancelEnrollCourse}
                                />
                            ) : (
                                <Navigate to="/login" />
                            )
                        }
                    />

                    <Route
                        path="/cart"
                        element={
                            isLoggedIn ? (
                                <CartPage
                                    likedCourseIds={likedCourseIds}
                                    timetableCourseIds={timetableCourseIds}
                                    enrolledCourseIds={enrolledCourseIds}
                                    quickEnroll={quickEnroll}
                                    registrationOpen={registrationOpen}
                                    onToggleLike={toggleLike}
                                    onToggleTimetable={toggleTimetable}
                                    onEnrollCourse={enrollCourse}
                                    onCancelEnrollCourse={handleCancelEnrollCourse}
                                />
                            ) : (
                                <Navigate to="/login" />
                            )
                        }
                    />

                    <Route
                        path="/mypage"
                        element={
                            isLoggedIn ? (
                                <MyCoursesPage
                                    user={user}
                                    quickEnroll={quickEnroll}
                                    darkMode={darkMode}
                                    onToggleQuickEnroll={toggleQuickEnroll}
                                    onToggleDarkMode={toggleDarkMode}
                                />
                            ) : (
                                <Navigate to="/login" />
                            )
                        }
                    />

                    <Route
                        path="/recommend"
                        element={
                            isLoggedIn ? (
                                <RecommendPage
                                    likedCourseIds={likedCourseIds}
                                    onToggleLike={toggleLike}
                                />
                            ) : (
                                <Navigate to="/login" />
                            )
                        }
                    />

                    <Route
                        path="*"
                        element={<Navigate to={isLoggedIn ? "/courses" : "/login"} />}
                    />
                </Routes>
            </main>

            <Toast toast={toast} onDismiss={() => setToast(null)} />
        </div>
    );
}

export default App;