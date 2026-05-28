export class Course {
    constructor({
                    id,
                    title,
                    type,
                    code,
                    section,
                    credit,
                    professor,
                    days,
                    periods,
                    timeText,
                    room,
                    college,
                    department,
                    tags,
                    flags
                }) {
        this.id = id;
        this.title = title;
        this.type = type;
        this.code = code;
        this.section = section;
        this.credit = credit;
        this.professor = professor;
        this.days = days;
        this.periods = periods;
        this.timeText = timeText;
        this.room = room;
        this.college = college;
        this.department = department;
        this.tags = tags;
        this.flags = flags;
    }
}
