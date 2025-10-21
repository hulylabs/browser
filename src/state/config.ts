export interface AppConfig {
    shouldRestore: boolean;
    shouldSave: boolean;
    shouldFetch: boolean;
    downloadAllowed: boolean;
    uploadAllowed: boolean;
    externalLinksAllowed: boolean;
}

export const browserConfig: AppConfig = {
    shouldRestore: true,
    shouldSave: true,
    shouldFetch: false,
    downloadAllowed: true,
    uploadAllowed: true,
    externalLinksAllowed: true,
};

export const observerConfig: AppConfig = {
    shouldRestore: false,
    shouldSave: false,
    shouldFetch: true,
    downloadAllowed: false,
    uploadAllowed: false,
    externalLinksAllowed: false,
};