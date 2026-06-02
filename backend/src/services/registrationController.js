import {
    getRegistrationStatus,
    toggleRegistrationStatus,
    setRegistrationStatus
} from "registrationService.js";

export function getStatus(req, res) {
    res.json(getRegistrationStatus());
}

export function toggleStatus(req, res) {
    res.json(toggleRegistrationStatus());
}

export function updateStatus(req, res) {
    const { registrationOpen } = req.body;
    res.json(setRegistrationStatus(registrationOpen));
}