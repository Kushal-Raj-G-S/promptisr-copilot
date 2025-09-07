"use strict";
// settings.ts
// Utility for managing API key, Base URL, and Model using globalState
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettingsManager = void 0;
const GLOBAL_KEYS = {
    apiKey: 'promptizer.apiKey',
    baseUrl: 'promptizer.baseUrl',
    model: 'promptizer.model',
    useCustomPrompt: 'promptizer.useCustomPrompt',
    customSystemPrompt: 'promptizer.customSystemPrompt',
};
class SettingsManager {
    constructor(context) {
        this.context = context;
    }
    // Getters
    getApiKey() {
        return this.context.globalState.get(GLOBAL_KEYS.apiKey);
    }
    getBaseUrl() {
        return this.context.globalState.get(GLOBAL_KEYS.baseUrl);
    }
    getModel() {
        return this.context.globalState.get(GLOBAL_KEYS.model);
    }
    getUseCustomPrompt() {
        return this.context.globalState.get(GLOBAL_KEYS.useCustomPrompt) || false;
    }
    getCustomSystemPrompt() {
        return this.context.globalState.get(GLOBAL_KEYS.customSystemPrompt);
    }
    getAll() {
        return {
            apiKey: this.getApiKey(),
            baseUrl: this.getBaseUrl(),
            model: this.getModel(),
            useCustomPrompt: this.getUseCustomPrompt(),
            customSystemPrompt: this.getCustomSystemPrompt(),
        };
    }
    // Setters
    async setApiKey(apiKey) {
        await this.context.globalState.update(GLOBAL_KEYS.apiKey, apiKey);
    }
    async setBaseUrl(baseUrl) {
        await this.context.globalState.update(GLOBAL_KEYS.baseUrl, baseUrl);
    }
    async setModel(model) {
        await this.context.globalState.update(GLOBAL_KEYS.model, model);
    }
    async setUseCustomPrompt(useCustomPrompt) {
        await this.context.globalState.update(GLOBAL_KEYS.useCustomPrompt, useCustomPrompt);
    }
    async setCustomSystemPrompt(customSystemPrompt) {
        await this.context.globalState.update(GLOBAL_KEYS.customSystemPrompt, customSystemPrompt);
    }
    async resetAll() {
        await this.context.globalState.update(GLOBAL_KEYS.apiKey, undefined);
        await this.context.globalState.update(GLOBAL_KEYS.baseUrl, undefined);
        await this.context.globalState.update(GLOBAL_KEYS.model, undefined);
        await this.context.globalState.update(GLOBAL_KEYS.useCustomPrompt, undefined);
        await this.context.globalState.update(GLOBAL_KEYS.customSystemPrompt, undefined);
    }
    // Validation helper for Online mode readiness
    isOnlineConfigured() {
        const { apiKey, baseUrl, model } = this.getAll();
        return Boolean(apiKey && baseUrl && model);
    }
}
exports.SettingsManager = SettingsManager;
//# sourceMappingURL=settings.js.map