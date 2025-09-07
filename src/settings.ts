// settings.ts
// Utility for managing API key, Base URL, and Model using globalState

import * as vscode from 'vscode';

export interface OnlineSettings {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  useCustomPrompt?: boolean;
  customSystemPrompt?: string;
}

const GLOBAL_KEYS = {
  apiKey: 'promptizer.apiKey',
  baseUrl: 'promptizer.baseUrl',
  model: 'promptizer.model',
  useCustomPrompt: 'promptizer.useCustomPrompt',
  customSystemPrompt: 'promptizer.customSystemPrompt',
};

export class SettingsManager {
  constructor(private context: vscode.ExtensionContext) {}

  // Getters
  getApiKey(): string | undefined {
    return this.context.globalState.get<string>(GLOBAL_KEYS.apiKey);
  }

  getBaseUrl(): string | undefined {
    return this.context.globalState.get<string>(GLOBAL_KEYS.baseUrl);
  }

  getModel(): string | undefined {
    return this.context.globalState.get<string>(GLOBAL_KEYS.model);
  }

  getUseCustomPrompt(): boolean {
    return this.context.globalState.get<boolean>(GLOBAL_KEYS.useCustomPrompt) || false;
  }

  getCustomSystemPrompt(): string | undefined {
    return this.context.globalState.get<string>(GLOBAL_KEYS.customSystemPrompt);
  }

  getAll(): OnlineSettings {
    return {
      apiKey: this.getApiKey(),
      baseUrl: this.getBaseUrl(),
      model: this.getModel(),
      useCustomPrompt: this.getUseCustomPrompt(),
      customSystemPrompt: this.getCustomSystemPrompt(),
    };
  }

  // Setters
  async setApiKey(apiKey: string): Promise<void> {
    await this.context.globalState.update(GLOBAL_KEYS.apiKey, apiKey);
  }

  async setBaseUrl(baseUrl: string): Promise<void> {
    await this.context.globalState.update(GLOBAL_KEYS.baseUrl, baseUrl);
  }

  async setModel(model: string): Promise<void> {
    await this.context.globalState.update(GLOBAL_KEYS.model, model);
  }

  async setUseCustomPrompt(useCustomPrompt: boolean): Promise<void> {
    await this.context.globalState.update(GLOBAL_KEYS.useCustomPrompt, useCustomPrompt);
  }

  async setCustomSystemPrompt(customSystemPrompt: string): Promise<void> {
    await this.context.globalState.update(GLOBAL_KEYS.customSystemPrompt, customSystemPrompt);
  }

  async resetAll(): Promise<void> {
    await this.context.globalState.update(GLOBAL_KEYS.apiKey, undefined);
    await this.context.globalState.update(GLOBAL_KEYS.baseUrl, undefined);
    await this.context.globalState.update(GLOBAL_KEYS.model, undefined);
    await this.context.globalState.update(GLOBAL_KEYS.useCustomPrompt, undefined);
    await this.context.globalState.update(GLOBAL_KEYS.customSystemPrompt, undefined);
  }

  // Validation helper for Online mode readiness
  isOnlineConfigured(): boolean {
    const { apiKey, baseUrl, model } = this.getAll();
    return Boolean(apiKey && baseUrl && model);
  }
}