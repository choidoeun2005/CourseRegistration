import { apiRequest } from "./client";

export async function fetchRegistrationStatus() {
    return apiRequest("/registration/status");
}

export async function toggleRegistrationStatus() {
    return apiRequest("/registration/toggle", {
        method: "POST"
    });
}

export async function updateRegistrationStatus(registrationOpen) {
    return apiRequest("/registration/status", {
        method: "PATCH",
        body: JSON.stringify({ registrationOpen })
    });
}