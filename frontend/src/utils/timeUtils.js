export const DAYS = ["월", "화", "수", "목", "금", "토"];
export const PERIODS = [1, 2, 3, 4, 5, 6];

export function hasTimeConflict(course, selectedCourses) {
    return selectedCourses.some((selected) => {
        const sameDay = course.days.some((day) => selected.days.includes(day));
        const samePeriod = course.periods.some((period) =>
            selected.periods.includes(period)
        );

        return sameDay && samePeriod && course.id !== selected.id;
    });
}

export function filterCoursesByDayState(courses, dayState) {
    return courses.filter((course) => {
        return Object.entries(dayState).every(([day, state]) => {
            if (state === "include") return course.days.includes(day);
            if (state === "exclude") return !course.days.includes(day);
            return true;
        });
    });
}