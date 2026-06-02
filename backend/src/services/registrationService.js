let registrationOpen = false;

export function getRegistrationStatus() {
    return {
        registrationOpen
    };
}

export function toggleRegistrationStatus() {
    registrationOpen = !registrationOpen;

    return {
        registrationOpen
    };
}

export function setRegistrationStatus(nextValue) {
    registrationOpen = Boolean(nextValue);

    return {
        registrationOpen
    };
}