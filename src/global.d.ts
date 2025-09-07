// Ambient types for VS Code webview's acquireVsCodeApi
// VS Code webviews inject this function; this helps TypeScript know about it in media scripts if needed.
declare function acquireVsCodeApi(): { postMessage(data: any): void; getState(): any; setState(data: any): void };