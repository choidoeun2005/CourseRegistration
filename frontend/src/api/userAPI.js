import { apiRequest } from "./client";

export async function loginUser(studentId, password) {
    return apiRequest("/users/login", {
        method: "POST",
        body: JSON.stringify({
            studentId,
            password
        })
    });
}

export async function fetchMe() {
    return apiRequest("/users/me");
}

export async function updateUserSettings(settings) {
    return apiRequest("/users/settings", {
        method: "PATCH",
        body: JSON.stringify(settings)
    });
}