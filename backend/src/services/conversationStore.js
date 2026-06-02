import crypto from "crypto";

const conversations = new Map();

export function createConversation() {
    const conversationId = crypto.randomUUID();

    conversations.set(conversationId, {
        id: conversationId,
        messages: []
    });

    return conversationId;
}

export function getConversation(conversationId) {
    return conversations.get(conversationId);
}

export function saveConversation(conversationId, conversation) {
    conversations.set(conversationId, conversation);
}