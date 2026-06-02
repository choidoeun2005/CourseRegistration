import { apiRequest } from "./client";

export async function sendRecommendationChat({ message, conversationId }) {
    return apiRequest("/recommend/chat", {
        method: "POST",
        body: JSON.stringify({
            message,
            conversationId
        })
    });
}