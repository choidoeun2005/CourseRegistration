import { handleRecommendChat } from "../services/recommendService.js";

export async function chatRecommend(req, res) {
    try {
        const { message, conversationId } = req.body;

        if (!message || !message.trim()) {
            return res.status(400).json({
                message: "추천 요청 메시지가 필요합니다."
            });
        }

        const result = await handleRecommendChat({
            message,
            conversationId
        });

        res.json(result);
    } catch (error) {
        console.error("추천 채팅 API 에러:", error);

        res.status(500).json({
            message: error.message || "추천 채팅 처리에 실패했습니다."
        });
    }
}