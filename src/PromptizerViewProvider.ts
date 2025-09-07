// PromptizerViewProvider.ts
// Implements a Webview View Provider that shows the Promptisr sidebar UI

import * as vscode from 'vscode';
import { SettingsManager } from './settings';

export class PromptizerViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'promptisrSidebar';

  constructor(private readonly context: vscode.ExtensionContext, private readonly settings: SettingsManager) {}

  // Resolve the webview view when the sidebar is opened
  resolveWebviewView(webviewView: vscode.WebviewView): void | Thenable<void> {
    const webview = webviewView.webview;
    webview.options = {
      enableScripts: true,
      localResourceRoots: [this.context.extensionUri],
    };

    // Set HTML content
    webview.html = this.getHtml(webview);

    // Handle messages from the webview
    webview.onDidReceiveMessage(async (message) => {
      switch (message.type) {
        case 'promptize': {
          const { mode, input, useCustomPrompt, customPrompt } = message.payload as { 
            mode: 'offline' | 'online'; 
            input: string; 
            useCustomPrompt?: boolean;
            customPrompt?: string;
          };
          
          if (mode === 'offline') {
            // Enhanced offline transformation
            const result = this.offlineTransform(input);
            webview.postMessage({ type: 'output', payload: { text: result } });
            return;
          }

          // Online mode logic
          if (!this.settings.isOnlineConfigured()) {
            vscode.window.showInformationMessage(
              'Online mode requires setup. Run: Promptisr: Configure Online Settings.'
            );
            // Also inform the webview to stop loading state
            webview.postMessage({
              type: 'error',
              payload: { message: 'Online mode requires setup. Use: Promptisr: Configure Online Settings.' },
            });
            return;
          }

          try {
            const apiKey = this.settings.getApiKey()!;
            const baseUrl = this.settings.getBaseUrl()!;
            const model = this.settings.getModel()!;

            // Call completion API with higher token limit and text cleaning
            const responseText = await this.callCompletionApi({
              baseUrl,
              apiKey,
              model,
              prompt: input,
              timeoutMs: 60000,  // 60 seconds for complex prompts
              maxTokens: 4096,   // Optimized for most AI coding tools (Claude, GPT, etc.)
              temperature: 0.7,  // Standard creative temperature
              useCustomPrompt: useCustomPrompt || false,
              customPrompt: customPrompt || '',
            });
            
            // Clean the response text from unnecessary formatting
            const cleanedText = this.cleanFormattedText(responseText);
            webview.postMessage({ type: 'output', payload: { text: cleanedText } });
          } catch (err: any) {
            const msg = err?.message || String(err);
            vscode.window.showErrorMessage(`Promptisr Online Error: ${msg}`);
            // Also notify the webview so it can stop the loading indicator
            webview.postMessage({ type: 'error', payload: { message: msg } });
          }
          return;
        }
        case 'saveCustomPromptSetting': {
          const { useCustomPrompt, customPrompt } = message.payload as {
            useCustomPrompt: boolean;
            customPrompt: string;
          };
          
          try {
            await this.settings.setUseCustomPrompt(useCustomPrompt);
            await this.settings.setCustomSystemPrompt(customPrompt);
          } catch (err) {
            console.error('Failed to save custom prompt settings:', err);
          }
          return;
        }
        case 'copy': {
          const text = message.payload?.text as string;
          if (text) {
            await vscode.env.clipboard.writeText(text);
            vscode.window.showInformationMessage('Copied to clipboard');
          }
          return;
        }
        case 'configureOnline': {
          vscode.commands.executeCommand('promptisr.configureOnlineSettings');
          return;
        }
        default:
          return;
      }
    });
  }

  // Enhanced offline transformation with intelligent project analysis
  private offlineTransform(input: string): string {
    const trimmed = input.trim();
    if (!trimmed) return '';

    // Intelligent offline prompt generator
    const analysis = this.analyzeInput(trimmed);
    const template = this.selectTemplate(analysis.projectType);
    return this.fillTemplate(template, analysis, trimmed);
  }

  // Project type configurations
  private projectTypes = {
    'web_app': {
      keywords: ['website', 'web app', 'dashboard', 'frontend', 'react', 'vue', 'angular', 'html', 'css', 'javascript'],
      defaultStack: 'React + Tailwind CSS + Vite',
      defaultFeatures: ['responsive design', 'modern UI', 'smooth animations', 'dark/light mode'],
      complexity: 'Intermediate'
    },
    'mobile_app': {
      keywords: ['mobile', 'app', 'ios', 'android', 'react native', 'flutter'],
      defaultStack: 'React Native + Expo',
      defaultFeatures: ['touch interactions', 'native feel', 'cross-platform', 'smooth performance'],
      complexity: 'Advanced'
    },
    'api_backend': {
      keywords: ['api', 'backend', 'server', 'database', 'nodejs', 'python', 'express'],
      defaultStack: 'Node.js + Express + MongoDB',
      defaultFeatures: ['RESTful API', 'authentication', 'database integration', 'error handling'],
      complexity: 'Intermediate'
    },
    'chrome_extension': {
      keywords: ['extension', 'chrome', 'browser', 'addon'],
      defaultStack: 'Vanilla JS + Manifest V3',
      defaultFeatures: ['popup interface', 'content scripts', 'background tasks', 'storage'],
      complexity: 'Beginner'
    },
    'game': {
      keywords: ['game', 'gaming', 'phaser', 'canvas', 'webgl'],
      defaultStack: 'HTML5 Canvas + JavaScript',
      defaultFeatures: ['game mechanics', 'animations', 'sound effects', 'scoring system'],
      complexity: 'Advanced'
    }
  };

  private vibeStyles = {
    'modern': ['glassmorphism', 'gradients', 'shadows', 'animations'],
    'minimal': ['clean lines', 'whitespace', 'simple colors', 'typography focus'],
    'dark': ['dark theme', 'neon accents', 'contrast', 'atmospheric'],
    'retro': ['pixel art', 'vintage colors', 'retro fonts', 'nostalgic feel'],
    'corporate': ['professional', 'blue tones', 'structured layout', 'formal']
  };

  // Process input with length limits and cleaning
  private processInput(input: string): string {
    // Remove unwanted characters and normalize whitespace
    const cleaned = input
      .replace(/[^\w\s\-.,!?'"()\[\]{}@#$%&*+=|\\/:;<>]/g, '') // Remove special chars except common ones
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
    
    // Handle long prompts - truncate intelligently
    const MAX_INPUT_LENGTH = 1500; // Optimal for most AI models
    
    if (cleaned.length <= MAX_INPUT_LENGTH) {
      return cleaned;
    }
    
    // Try to truncate at sentence boundary
    const truncated = cleaned.substring(0, MAX_INPUT_LENGTH);
    const lastSentence = truncated.lastIndexOf('.');
    const lastSpace = truncated.lastIndexOf(' ');
    
    // If we can find a sentence end, use that; otherwise use word boundary
    if (lastSentence > MAX_INPUT_LENGTH - 200) {
      return truncated.substring(0, lastSentence + 1);
    } else if (lastSpace > MAX_INPUT_LENGTH - 50) {
      return truncated.substring(0, lastSpace) + '...';
    } else {
      return truncated + '...';
    }
  }

  // Analyze user input to extract key information
  private analyzeInput(input: string) {
    const processedInput = this.processInput(input);
    const lowerInput = processedInput.toLowerCase();
    
    return {
      projectType: this.detectProjectType(lowerInput),
      features: this.extractFeatures(lowerInput),
      style: this.detectStyle(lowerInput),
      technologies: this.extractTechnologies(lowerInput),
      complexity: this.estimateComplexity(lowerInput),
      processedInput: processedInput // Store the cleaned input
    };
  }

  private detectProjectType(input: string): string {
    for (const [type, config] of Object.entries(this.projectTypes)) {
      if (config.keywords.some(keyword => input.includes(keyword))) {
        return type;
      }
    }
    return 'web_app'; // default
  }

  private extractFeatures(input: string): string[] {
    const commonFeatures = {
      'authentication': ['login', 'signup', 'auth', 'user'],
      'database': ['store', 'save', 'data', 'database'],
      'real_time': ['live', 'real time', 'chat', 'notifications'],
      'responsive': ['mobile', 'responsive', 'device'],
      'animations': ['animate', 'smooth', 'transition', 'effects']
    };

    const detected: string[] = [];
    for (const [feature, keywords] of Object.entries(commonFeatures)) {
      if (keywords.some(keyword => input.includes(keyword))) {
        detected.push(feature);
      }
    }
    return detected;
  }

  private detectStyle(input: string): string {
    for (const [style, keywords] of Object.entries(this.vibeStyles)) {
      if (keywords.some(keyword => input.includes(keyword)) || input.includes(style)) {
        return style;
      }
    }
    return 'modern'; // default
  }

  private extractTechnologies(input: string): string[] {
    const techs = ['react', 'vue', 'angular', 'svelte', 'nodejs', 'python', 'tailwind', 'bootstrap'];
    return techs.filter(tech => input.includes(tech));
  }

  private estimateComplexity(input: string): string {
    const complexWords = ['advanced', 'complex', 'enterprise', 'scalable', 'ai', 'machine learning'];
    const simpleWords = ['simple', 'basic', 'minimal', 'quick', 'prototype'];
    
    if (complexWords.some(word => input.includes(word))) return 'Advanced';
    if (simpleWords.some(word => input.includes(word))) return 'Beginner';
    return 'Intermediate';
  }

  // Template generator based on project type with temperature variation
  private selectTemplate(projectType: string) {
    const config = this.projectTypes[projectType as keyof typeof this.projectTypes] || this.projectTypes.web_app;
    
    return {
      vision: `Create a modern ${projectType.replace('_', ' ')} that delivers excellent user experience with clean design principles and robust functionality.`,
      stack: config.defaultStack,
      features: config.defaultFeatures,
      complexity: config.complexity
    };
  }

  // Fill the template with analyzed data and temperature-based variations
  private fillTemplate(template: any, analysis: any, originalInput: string): string {
    const projectConfig = this.projectTypes[analysis.projectType as keyof typeof this.projectTypes];
    const styleConfig = this.vibeStyles[analysis.style as keyof typeof this.vibeStyles];
    
    // Use processed input if available, otherwise fall back to original
    const inputToUse = analysis.processedInput || originalInput;

    return `🎯 Project Vision:
${template.vision}

⚡ Core Objective:
Build a fully functional ${analysis.projectType.replace('_', ' ')} based on: "${inputToUse}"

🛠️ Technical Context:
Stack: ${analysis.technologies.length > 0 ? analysis.technologies.join(' + ') : template.stack}
Environment: Modern platforms, responsive design
Complexity: ${template.complexity}
Dependencies: Standard libraries and modern frameworks

📋 Implementation Steps:
Phase 1: Foundation
- Set up project structure and development environment
- Create basic layout and navigation
- Implement core functionality framework

Phase 2: Features
${this.generateFeatureSteps(analysis.features, projectConfig.defaultFeatures)}

Phase 3: Polish
- Add ${styleConfig.join(', ')} styling elements
- Implement smooth animations and transitions
- Add error handling and loading states
- Optimize performance and responsiveness

💡 Vibe Requirements:
• Style: ${analysis.style} design with ${styleConfig.join(', ')}
• UX: Intuitive interactions, smooth animations, modern feel
• Performance: Fast loading, responsive across all devices
• Innovation: Creative use of modern web technologies

🔧 Code Specifications:
• Structure: Clean, modular code organization
• Quality: Follow best practices, include error handling
• Documentation: Clear comments and setup instructions
• Deployment: Ready for production deployment

✨ Success Criteria:
- Fully functional ${analysis.projectType.replace('_', ' ')} that matches the requirements
- Modern, visually appealing interface with ${analysis.style} styling
- Smooth user experience across all target devices
- Clean, maintainable, and well-documented code`;
  }

  private generateFeatureSteps(detectedFeatures: string[], defaultFeatures: string[]): string {
    const allFeatures = [...new Set([...detectedFeatures, ...defaultFeatures])];
    return allFeatures.map(feature => `- Implement ${feature.replace('_', ' ')}`).join('\n');
  }

  // Clean formatted text by removing unnecessary markdown characters
  private cleanFormattedText(text: string): string {
    if (!text || typeof text !== 'string') return '';
    
    return text
      // Remove bold markdown (**text** and __text__)
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/__(.*?)__/g, '$1')
      
      // Remove italic markdown (*text* and _text_)
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/_(.*?)_/g, '$1')
      
      // Remove headers (# ## ### etc.) but keep the text
      .replace(/^#{1,6}\s*/gm, '')
      
      // Remove bold headers with emojis like **🎯 Project Vision:**
      .replace(/\*\*([🎯⚡🛠️📋💡🔧✨].*?):\*\*/g, '$1:')
      
      // Remove bullet points with special characters and normalize
      .replace(/^[•·▪▫‣⁃\*\-\+]\s*/gm, '• ')
      
      // Remove extra asterisks and formatting
      .replace(/\*+/g, '')
      .replace(/__+/g, '')
      
      // Remove code blocks and inline code
      .replace(/```[\s\S]*?```/g, '')
      .replace(/`([^`]+)`/g, '$1')
      
      // Remove links but keep text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      
      // Remove excessive whitespace and line breaks
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]+/g, ' ')
      
      // Remove unwanted special characters but keep useful punctuation
      .replace(/[^\w\s\-.,!?'"()\[\]{}@#$%&+=|\\/:;<>•\n]/g, '')
      
      // Clean up any remaining formatting artifacts
      .replace(/^\s+|\s+$/g, '')
      .trim();
  }

  // Perform the POST request to the provider's completion endpoint with custom prompt support
  private async callCompletionApi(args: {
    baseUrl: string;
    apiKey: string;
    model: string;
    prompt: string;
    timeoutMs?: number;
    maxTokens?: number;
    temperature?: number;
    useCustomPrompt?: boolean;
    customPrompt?: string;
  }): Promise<string> {
    const {
      baseUrl,
      apiKey,
      model,
      prompt,
      timeoutMs = 60000,
      maxTokens = 4096,  // Balanced limit for most AI coding tools
      temperature = 0.7,
      useCustomPrompt = false,
      customPrompt = '',
    } = args;

    // Prefer chat endpoints first (faster + more common for modern providers)
    const candidatePaths = [
      '/v1/chat/completions',
      '/chat/completions',
      '/v1/completions',
      '/completions',
      '/completion',
      '/api/completions',
    ];

    let lastError: any = new Error('No endpoint responded successfully');

    for (const p of candidatePaths) {
      const url = this.joinUrl(baseUrl, p);

      const isChatStyle = p.includes('chat');
      const completionPayload = { model, prompt, max_tokens: maxTokens } as any;
      
      // Optimized VibeCoder system prompt - concise but powerful
      const CODING_SYSTEM_PROMPT = `You are VibeCoder, an expert prompt engineer for coding projects.

Transform user ideas into comprehensive, actionable prompts that generate working code and complete projects.

ALWAYS use this format:

🎯 PROJECT: [What we're building and why it's cool]
⚡ GOAL: [Specific deliverable]  
🛠️ TECH: [Stack, platform, complexity level]
📋 PHASES: [Foundation → Features → Polish]
💡 VIBE: [Style, UX, performance, innovation]
🔧 CODE: [Structure, quality, docs, deployment]
✨ SUCCESS: [How to know it's complete]

REQUIREMENTS:
- Specify exact tech stack and versions
- Include functional AND aesthetic requirements
- Consider mobile responsiveness by default  
- Add error handling and modern practices
- Include setup/deployment instructions
- Focus on developer experience (DX)

Make it comprehensive enough that an AI can build a complete, working project.`;

      // Choose the system prompt based on user preference
      const systemPrompt = useCustomPrompt && customPrompt.trim() 
        ? customPrompt.trim() 
        : CODING_SYSTEM_PROMPT;

      const chatPayload = {
        model,
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          { 
            role: 'user', 
            content: useCustomPrompt && customPrompt.trim() 
              ? prompt 
              : `Create a comprehensive coding prompt for: ${prompt}` 
          },
        ],
        temperature,
        max_tokens: maxTokens,
        stream: false,
      } as any;

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), Math.max(1000, timeoutMs));

      try {
        let response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify(isChatStyle ? chatPayload : completionPayload),
          signal: controller.signal,
        });

        if (response.status === 404) {
          lastError = new Error(`HTTP 404: ${await response.text().catch(() => response.statusText)}`);
          continue; // try next path
        }

        // If body shape is wrong (e.g., chat endpoint expects messages), retry once with chat payload
        if (!response.ok && !isChatStyle && response.status === 400) {
          const text = await response.text().catch(() => '');
          if (/messages/i.test(text) || /chat/i.test(text)) {
            response = await fetch(url, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`,
              },
              body: JSON.stringify(chatPayload),
              signal: controller.signal,
            });
          } else {
            lastError = new Error(`HTTP ${response.status}: ${text || response.statusText}`);
          }
        }

        if (!response.ok) {
          const text = await response.text().catch(() => response.statusText);
          lastError = new Error(`HTTP ${response.status}: ${text}`);
          continue;
        }

        const data: any = await response.json().catch(() => ({} as any));

        // Enhanced response parsing for different API formats
        let candidate = '';
        
        // Try different response formats
        if (data?.choices && Array.isArray(data.choices) && data.choices.length > 0) {
          // OpenAI-style responses
          const choice = data.choices[0];
          candidate = choice?.message?.content || choice?.text || '';
          
          // Check if response was cut off due to length limit
          if (!candidate && choice?.finish_reason === 'length') {
            throw new Error('Response was cut off due to token limit. Try a shorter prompt or increase max_tokens.');
          }
        } else if (data?.completion) {
          // Direct completion field
          candidate = data.completion;
        } else if (data?.text) {
          // Direct text field
          candidate = data.text;
        } else if (data?.result) {
          // Result field
          candidate = data.result;
        } else if (data?.response) {
          // Response field
          candidate = data.response;
        } else if (data?.output) {
          // Output field
          candidate = data.output;
        } else if (typeof data === 'string') {
          // Raw string response
          candidate = data;
        }

        // Clean up the response
        if (typeof candidate === 'string' && candidate.trim()) {
          return candidate.trim();
        }
        
        // Handle empty content with specific error messages
        if (data?.choices?.[0]?.finish_reason === 'length') {
          throw new Error('Response was truncated due to token limit. Try increasing max_tokens or using a shorter prompt.');
        }
        
        if (data?.choices?.[0]?.finish_reason === 'content_filter') {
          throw new Error('Response was filtered by content policy. Try rephrasing your prompt.');
        }
        
        // If no valid text found, provide helpful error
        throw new Error(`API returned empty content. Finish reason: ${data?.choices?.[0]?.finish_reason || 'unknown'}`);
      } catch (err: any) {
        // network/timeout/other error; remember and try next
        if (err?.name === 'AbortError') {
          lastError = new Error('Request timed out');
        } else {
          lastError = err;
        }
        continue;
      } finally {
        clearTimeout(timer);
      }
    }

    throw lastError;
  }

  // Helper to build webview HTML
  private getHtml(webview: vscode.Webview): string {
    const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'media', 'styles.css'));
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'media', 'main.js'));

    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} https:; style-src ${webview.cspSource} 'unsafe-inline'; script-src ${webview.cspSource};" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link href="${styleUri}" rel="stylesheet" />
    <title>Promptisr</title>
  </head>
  <body>
    <div class="container">
      <h2>Promptisr</h2>

      <label class="label" for="rawInput">Raw Text Input</label>
      <textarea id="rawInput" rows="6" placeholder="Enter your raw text or requirements..."></textarea>

      <div class="row">
        <div class="toggle">
          <label><input type="radio" name="mode" value="offline" checked /> Offline</label>
          <label><input type="radio" name="mode" value="online" /> Online</label>
        </div>
        <button id="btnPromptize">Promptize</button>
      </div>

      <div class="custom-prompt-section">
        <div class="custom-prompt-header">
          <label class="custom-prompt-toggle">
            <input type="checkbox" id="useCustomPrompt" />
            <span>Use Custom Prompt Structure</span>
          </label>
        </div>
        <div id="customPromptArea" class="custom-prompt-area" hidden>
          <label class="label" for="customPrompt">Custom System Prompt:</label>
          <textarea id="customPrompt" class="custom-prompt-textarea" rows="8" placeholder="Enter your custom system prompt structure here..."></textarea>
          <div class="prompt-hint">💡 Leave empty to use the default VibeCoder prompt structure</div>
        </div>
      </div>

      <div class="output">
        <div class="output-header">
          <span>Optimized Prompt</span>
          <div class="actions">
            <button id="btnCopy">Copy</button>
            <button id="btnClear">Clear</button>
          </div>
        </div>
        <pre id="outputText" class="output-text"></pre>
        <div class="hint">Online mode requires setup. Use the command: <em>Promptisr: Configure Online Settings</em>.</div>
      </div>
    </div>

    <script src="${scriptUri}"></script>
  </body>
</html>`;
  }

  // Safe URL join handling trailing slashes
  private joinUrl(base: string, path: string): string {
    if (!base.endsWith('/')) base += '/';
    if (path.startsWith('/')) path = path.slice(1);
    return base + path;
  }
}