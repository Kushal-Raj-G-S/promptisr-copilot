// main.js - Enhanced webview script for Promptizer sidebar
(function () {
  const vscode = acquireVsCodeApi();

  const rawInput = document.getElementById('rawInput');
  const btnPromptize = document.getElementById('btnPromptize');
  const btnCopy = document.getElementById('btnCopy');
  const btnClear = document.getElementById('btnClear');
  const outputText = document.getElementById('outputText');
  const useCustomPrompt = document.getElementById('useCustomPrompt');
  const customPromptArea = document.getElementById('customPromptArea');
  const customPrompt = document.getElementById('customPrompt');

  let pendingTimer = null;
  let isProcessing = false;

  // Custom prompt toggle handling
  useCustomPrompt.addEventListener('change', (e) => {
    if (e.target.checked) {
      customPromptArea.removeAttribute('hidden');
    } else {
      customPromptArea.setAttribute('hidden', '');
    }
    
    // Save the setting
    vscode.postMessage({
      type: 'saveCustomPromptSetting',
      payload: { 
        useCustomPrompt: e.target.checked,
        customPrompt: customPrompt.value.trim()
      }
    });
  });

  // Custom prompt text change handling
  customPrompt.addEventListener('input', (e) => {
    // Save the custom prompt text
    vscode.postMessage({
      type: 'saveCustomPromptSetting',
      payload: { 
        useCustomPrompt: useCustomPrompt.checked,
        customPrompt: e.target.value.trim()
      }
    });
  });

  // Get custom prompt settings
  function getCustomPromptSettings() {
    return {
      useCustomPrompt: useCustomPrompt.checked,
      customPrompt: customPrompt.value.trim()
    };
  }

  // Simple loading state management without animations
  function setLoading(isLoading) {
    isProcessing = isLoading;
    
    if (isLoading) {
      btnPromptize.disabled = true;
      btnPromptize.textContent = 'Processing...';
      
      // Watchdog timer (60s for complex prompts)
      if (pendingTimer) clearTimeout(pendingTimer);
      pendingTimer = setTimeout(() => {
        setLoading(false);
        showError('Request timed out after 60 seconds. The server might be slow or overloaded.');
      }, 60000);
    } else {
      btnPromptize.disabled = false;
      btnPromptize.textContent = 'Promptize';
      
      if (pendingTimer) {
        clearTimeout(pendingTimer);
        pendingTimer = null;
      }
    }
  }

  // Enhanced error display
  function showError(message) {
    outputText.textContent = `❌ Error: ${message}`;
    outputText.style.color = 'var(--error)';
    
    // Reset color after a delay
    setTimeout(() => {
      outputText.style.color = '';
    }, 5000);
  }

  // Simple success display without animations
  function showSuccess(text) {
    if (!text || text.trim() === '') {
      showError('Server responded but returned empty content. Check your API configuration.');
      return;
    }
    
    outputText.textContent = text;
    outputText.style.color = '';
  }

  function getMode() {
    const checked = document.querySelector('input[name="mode"]:checked');
    return (checked && checked.value) === 'online' ? 'online' : 'offline';
  }

  // Enhanced input validation
  function validateInput() {
    const input = (rawInput.value || '').trim();
    
    if (!input) {
      showError('Please enter some text to promptize.');
      return false;
    }
    
    if (input.length < 3) {
      showError('Input too short. Please provide more detailed requirements.');
      return false;
    }
    
    if (input.length > 5000) {
      showError('Input too long. Please keep it under 5000 characters.');
      return false;
    }
    
    return true;
  }

  // Enhanced promptize handler with temperature and custom prompt
  btnPromptize.addEventListener('click', () => {
    if (isProcessing) return;
    
    if (!validateInput()) return;
    
    const input = rawInput.value.trim();
    const mode = getMode();
    const customPromptSettings = getCustomPromptSettings();
    
    outputText.textContent = '';
    setLoading(true);
    
    vscode.postMessage({ 
      type: 'promptize', 
      payload: { 
        mode, 
        input,
        ...customPromptSettings
      }
    });
  });

  // Simple copy functionality
  btnCopy.addEventListener('click', () => {
    const text = outputText.textContent || '';
    
    if (!text || text.startsWith('❌ Error:')) {
      showError('Nothing to copy or content contains errors.');
      return;
    }
    
    vscode.postMessage({ 
      type: 'copy', 
      payload: { text }
    });
  });

  // Simple clear functionality
  btnClear.addEventListener('click', () => {
    outputText.textContent = '';
    outputText.style.color = '';
  });

  // Keyboard shortcuts
  rawInput.addEventListener('keydown', (e) => {
    // Ctrl+Enter to promptize
    if (e.ctrlKey && e.key === 'Enter') {
      e.preventDefault();
      btnPromptize.click();
    }
    
    // Escape to clear
    if (e.key === 'Escape') {
      btnClear.click();
    }
  });

  // Auto-resize textarea
  rawInput.addEventListener('input', () => {
    rawInput.style.height = 'auto';
    rawInput.style.height = Math.min(rawInput.scrollHeight, 300) + 'px';
  });

  // Enhanced message handling
  window.addEventListener('message', (event) => {
    const message = event.data;
    if (!message) return;
    
    switch (message.type) {
      case 'output':
        const text = message.payload?.text || '';
        if (text) {
          showSuccess(text);
        } else {
          showError('Empty response received.');
        }
        setLoading(false);
        break;
        
      case 'error':
        const errorMsg = message.payload?.message || 'Unknown error occurred.';
        showError(errorMsg);
        setLoading(false);
        break;
        
      default:
        break;
    }
  });

  // Initialize
  console.log('Promptizer webview loaded successfully');
})();