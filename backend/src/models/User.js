export class User {
    constructor({
                    id,
                    name,
                    studentId,
                    major,
                    doubleMajor,
                    quickEnroll = false,
                    darkMode = false
                }) {
        this.id = id;
        this.name = name;
        this.studentId = studentId;
        this.major = major;
        this.doubleMajor = doubleMajor;
        this.quickEnroll = quickEnroll;
        this.darkMode = darkMode;
    }
}
