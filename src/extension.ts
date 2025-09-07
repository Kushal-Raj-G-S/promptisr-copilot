// extension.ts
// Entry point: activation, register sidebar view, and register commands

import * as vscode from 'vscode';
import { PromptizerViewProvider } from './PromptizerViewProvider';
import { SettingsManager } from './settings';

export function activate(context: vscode.ExtensionContext) {
  const settings = new SettingsManager(context);

  // Register the webview view provider for the sidebar
  const provider = new PromptizerViewProvider(context, settings);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(PromptizerViewProvider.viewType, provider)
  );

  // Command: Configure API Key
  context.subscriptions.push(
    vscode.commands.registerCommand('promptisr.configureApiKey', async () => {
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
    })
  );

  // Command: Configure Base URL
  context.subscriptions.push(
    vscode.commands.registerCommand('promptisr.configureBaseUrl', async () => {
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
    })
  );

  // Command: Select Model (fetch from {baseUrl}/models)
  context.subscriptions.push(
    vscode.commands.registerCommand('promptisr.selectModel', async () => {
      const baseUrl = settings.getBaseUrl();
      const apiKey = settings.getApiKey();
      if (!baseUrl || !apiKey) {
        vscode.window.showInformationMessage(
          'Please configure API Key and Base URL first. Run: Promptisr: Configure Online Settings.'
        );
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
        const data: any = await resp.json();
        const models: string[] = Array.isArray(data)
          ? data
          : Array.isArray(data?.data)
            ? data.data.map((m: any) => m?.id).filter((x: any) => typeof x === 'string')
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
      } catch (err: any) {
        vscode.window.showErrorMessage(`Failed to fetch models: ${err?.message || String(err)}`);
      }
    })
  );

  // Command: Reset Online Settings
  context.subscriptions.push(
    vscode.commands.registerCommand('promptisr.resetOnlineSettings', async () => {
      await settings.resetAll();
      vscode.window.showInformationMessage('Promptisr: Online settings reset.');
    })
  );

  // Helper command: Configure Online Settings (guide user through all)
  context.subscriptions.push(
    vscode.commands.registerCommand('promptisr.configureOnlineSettings', async () => {
      await vscode.commands.executeCommand('promptisr.configureApiKey');
      await vscode.commands.executeCommand('promptisr.configureBaseUrl');
      await vscode.commands.executeCommand('promptisr.selectModel');
    })
  );
}

export function deactivate() {
  // Nothing to clean up
}

// Local helper to join URLs
function joinUrl(base: string, path: string): string {
  if (!base.endsWith('/')) base += '/';
  if (path.startsWith('/')) path = path.slice(1);
  return base + path;
}