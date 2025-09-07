"use strict";
// extension.ts
// Entry point: activation, register sidebar view, and register commands
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const PromptizerViewProvider_1 = require("./PromptizerViewProvider");
const settings_1 = require("./settings");
function activate(context) {
    const settings = new settings_1.SettingsManager(context);
    // Register the webview view provider for the sidebar
    const provider = new PromptizerViewProvider_1.PromptizerViewProvider(context, settings);
    context.subscriptions.push(vscode.window.registerWebviewViewProvider(PromptizerViewProvider_1.PromptizerViewProvider.viewType, provider));
    // Command: Configure API Key
    context.subscriptions.push(vscode.commands.registerCommand('promptisr.configureApiKey', async () => {
        const apiKey = await vscode.window.showInputBox({
            title: 'Promptisr: Configure API Key',
            prompt: 'Enter your API Key',
            ignoreFocusOut: true,
            password: true,
        });
        if (apiKey) {
            await settings.setApiKey(apiKey);
            vscode.window.showInformationMessage('Promptisr: API Key saved.');
        }
    }));
    // Command: Configure Base URL
    context.subscriptions.push(vscode.commands.registerCommand('promptisr.configureBaseUrl', async () => {
        const baseUrl = await vscode.window.showInputBox({
            title: 'Promptisr: Configure Base URL',
            prompt: 'Enter the Base URL (e.g., https://api.example.com)',
            ignoreFocusOut: true,
            value: settings.getBaseUrl() || '',
        });
        if (baseUrl) {
            await settings.setBaseUrl(baseUrl);
            vscode.window.showInformationMessage('Promptisr: Base URL saved.');
        }
    }));
    // Command: Select Model (fetch from {baseUrl}/models)
    context.subscriptions.push(vscode.commands.registerCommand('promptisr.selectModel', async () => {
        const baseUrl = settings.getBaseUrl();
        const apiKey = settings.getApiKey();
        if (!baseUrl || !apiKey) {
            vscode.window.showInformationMessage('Please configure API Key and Base URL first. Run: Promptisr: Configure Online Settings.');
            return;
        }
        try {
            const url = joinUrl(baseUrl, '/models');
            const resp = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                },
            });
            if (!resp.ok) {
                throw new Error(`HTTP ${resp.status} ${resp.statusText}`);
            }
            // Expect either { data: [{ id }]} or array of strings
            const data = await resp.json();
            const models = Array.isArray(data)
                ? data
                : Array.isArray(data?.data)
                    ? data.data.map((m) => m?.id).filter((x) => typeof x === 'string')
                    : [];
            if (models.length === 0) {
                vscode.window.showWarningMessage('No models found at the provided endpoint.');
                return;
            }
            const picked = await vscode.window.showQuickPick(models, { title: 'Select a Model' });
            if (picked) {
                await settings.setModel(picked);
                vscode.window.showInformationMessage(`Promptisr: Model set to "${picked}"`);
            }
        }
        catch (err) {
            vscode.window.showErrorMessage(`Failed to fetch models: ${err?.message || String(err)}`);
        }
    }));
    // Command: Reset Online Settings
    context.subscriptions.push(vscode.commands.registerCommand('promptisr.resetOnlineSettings', async () => {
        await settings.resetAll();
        vscode.window.showInformationMessage('Promptisr: Online settings reset.');
    }));
    // Helper command: Configure Online Settings (guide user through all)
    context.subscriptions.push(vscode.commands.registerCommand('promptisr.configureOnlineSettings', async () => {
        await vscode.commands.executeCommand('promptisr.configureApiKey');
        await vscode.commands.executeCommand('promptisr.configureBaseUrl');
        await vscode.commands.executeCommand('promptisr.selectModel');
    }));
}
function deactivate() {
    // Nothing to clean up
}
// Local helper to join URLs
function joinUrl(base, path) {
    if (!base.endsWith('/'))
        base += '/';
    if (path.startsWith('/'))
        path = path.slice(1);
    return base + path;
}
//# sourceMappingURL=extension.js.map