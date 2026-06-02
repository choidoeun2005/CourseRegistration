import { uploadSyllabusToVectorStore } from "../services/syllabusService.js";

export async function uploadSyllabus(req, res) {
    try {
        if (!req.file) {
            return res.status(400).json({
                message: "PDF 파일이 필요합니다."
            });
        }

        const result = await uploadSyllabusToVectorStore(req.file.path);

        res.json({
            success: true,
            message: "강의계획서가 업로드되었습니다.",
            ...result
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "강의계획서 업로드에 실패했습니다."
        });
    }
}