import { Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";

import Header from "./components/Header.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import CourseListPage from "./pages/CourseListPage.jsx";
import CartPage from "./pages/CartPage.jsx";
import MyCoursesPage from "./pages/MyCoursesPage.jsx";
import RecommendPage from "./pages/RecommendPage.jsx";

import { fetchMe, updateUserSettings } from "./api/userApi";
import {
    fetchLikedCourses,
    fetchTimetableCourses,
    fetchEnrollmentStatus,
    toggleLikedCourse,
    addCourseToTimetable,
    removeCourseFromTimetable,
    enrollCourse as requestEnrollCourse
} from "./api/timetableApi";

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

    useEffect(() => {
        document.body.classList.toggle("dark", darkMode);
    }, [darkMode]);

    useEffect(() => {
        if (!isLoggedIn) return;

        async function loadInitialData() {
            try {
                const [me, likedCourses, timetableCourses, enrollmentStatus] =
                    await Promise.all([
                        fetchMe(),
                        fetchLikedCourses(),
                        fetchTimetableCourses(),
                        fetchEnrollmentStatus()
                    ]);

                setUser(me);
                setQuickEnroll(me.quickEnroll);
                setDarkMode(me.darkMode);

                setLikedCourseIds(likedCourses.map((course) => course.id));
                setTimetableCourseIds(timetableCourses.map((course) => course.id));
                setEnrolledCourseIds(enrollmentStatus.enrolledCourseIds);
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

    const toggleLike = async (courseId) => {
        try {
            const result = await toggleLikedCourse(courseId);
            setLikedCourseIds(result.likedCourseIds);
        } catch (error) {
            alert(error.message || "관심과목 변경에 실패했습니다.");
        }
    };

    const toggleTimetable = async (courseId) => {
        try {
            const isAlreadyInTimetable = timetableCourseIds.includes(courseId);

            const result = isAlreadyInTimetable
                ? await removeCourseFromTimetable(courseId)
                : await addCourseToTimetable(courseId);

            setTimetableCourseIds(result.courses.map((course) => course.id));

            if (result.conflict) {
                alert("시간표에 추가했지만 교시가 중복됩니다.");
            }
        } catch (error) {
            alert(error.message || "시간표 변경에 실패했습니다.");
        }
    };

    const enrollCourse = async (courseId) => {
        try {
            const result = await requestEnrollCourse(courseId);

            if (result.success) {
                setEnrolledCourseIds(result.enrolledCourseIds);
            }

            return result;
        } catch (error) {
            return {
                success: false,
                message: error.message || "수강신청에 실패했습니다."
            };
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
            {isLoggedIn && <Header />}

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
                                    onToggleLike={toggleLike}
                                    onToggleTimetable={toggleTimetable}
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
                                    onToggleLike={toggleLike}
                                    onToggleTimetable={toggleTimetable}
                                    onEnrollCourse={enrollCourse}
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
        </div>
    );
}

export default App;