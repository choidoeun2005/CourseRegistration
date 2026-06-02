import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import courseRoutes from "./routes/courseRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import timetableRoutes from "./routes/timetableRoutes.js";
import registrationRoutes from "./routes/registrationRoutes.js";
import syllabusRoutes from "./routes/syllabusRoutes.js";
import recommendRoutes from "./routes/recommendRoutes.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.json({
        message: "Course Registration Backend API"
    });
});

app.use("/api/courses", courseRoutes);
app.use("/api/users", userRoutes);
app.use("/api/timetable", timetableRoutes);
app.use("/api/registration", registrationRoutes);
app.use("/api/syllabi", syllabusRoutes);

// 추천 마법사 전용 API
app.use("/api/recommend", recommendRoutes);

export default app;