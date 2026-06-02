import express from "express";
import multer from "multer";
import { uploadSyllabus } from "../controllers/syllabusController.js";

const router = express.Router();

const upload = multer({
    dest: "uploads/syllabi/"
});

router.post("/upload", upload.single("syllabus"), uploadSyllabus);

export default router;