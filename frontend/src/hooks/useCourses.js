import { useEffect, useState } from "react";
import { fetchCourses } from "../api/courseApi";

export default function useCourses() {
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        fetchCourses()
            .then((data) => {
                setCourses(data);
                setError("");
            })
            .catch(() => {
                setError("강의 정보를 불러오지 못했습니다.");
            })
            .finally(() => {
                setLoading(false);
            });
    }, []);

    return { courses, loading, error };
}