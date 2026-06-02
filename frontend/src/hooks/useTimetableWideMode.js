import { useEffect } from "react";

export function useTimetableWideMode(enabled) {
    useEffect(() => {
        if (enabled) {
            document.body.classList.add("timetable-wide");
        } else {
            document.body.classList.remove("timetable-wide");
        }

        return () => {
            document.body.classList.remove("timetable-wide");
        };
    }, [enabled]);
}