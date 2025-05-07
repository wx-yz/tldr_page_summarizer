document.addEventListener('DOMContentLoaded', function() {
  // First, make sure the thinking animation is hidden when the popup loads
  const thinking = document.getElementById('thinking');
  if (thinking) {
    thinking.classList.add('hidden'); // Ensure it's hidden on initial load
  }

  const apiKeyInput = document.getElementById('apiKey');
  const saveApiKeyButton = document.getElementById('saveApiKey');
  const generateSummaryButton = document.getElementById('generateSummary');
  const summaryTypeSelect = document.getElementById('summaryType');
  const summaryResult = document.getElementById('summaryResult');
  const summaryContent = document.getElementById('summaryContent');
  const loading = document.getElementById('loading');
  const error = document.getElementById('error');
  const apiKeyStatus = document.getElementById('apiKeyStatus');
  const characterLimitWarning = document.querySelector('.character-limit-warning');
  const copySummaryButton = document.getElementById('copySummary');
  const toggleApiKeyVisibilityButton = document.getElementById('toggleApiKeyVisibility'); // Get the icon's span
  const eyeIcon = document.getElementById('eyeIcon'); // Get the eye SVG
  const eyeSlashIcon = document.getElementById('eyeSlashIcon'); // Get the eye-slash SVG

  // Constants
  const CHARACTER_LIMIT = 10000;
  const MAX_TOKENS = 4000;

  // Helper function to update Save API Key button state
  function updateSaveApiKeyButtonState() {
    const apiKey = apiKeyInput.value.trim();
    if (apiKey) {
      saveApiKeyButton.disabled = false;
    } else {
      saveApiKeyButton.disabled = true;
    }
  }

  // Load saved API key
  chrome.storage.sync.get(['openaiApiKey'], function(result) {
    if (result.openaiApiKey) {
      apiKeyInput.value = result.openaiApiKey;
      apiKeyStatus.textContent = 'API key saved';
      apiKeyStatus.style.color = '#137333';
    }
    updateSaveApiKeyButtonState(); // Set initial button state
  });

  // Add event listener for API key input changes
  apiKeyInput.addEventListener('input', updateSaveApiKeyButtonState);

  // Save API key
  saveApiKeyButton.addEventListener('click', async function() {
    const buttonText = saveApiKeyButton.querySelector('.button-text');
    const spinner = saveApiKeyButton.querySelector('.loading-spinner');
    const apiKey = apiKeyInput.value.trim();

    // No need for 'if (!apiKey)' check here anymore, as button will be disabled if key is empty.

    try {
      buttonText.textContent = 'Saving...';
      spinner.classList.remove('hidden');
      saveApiKeyButton.disabled = true; // Disable during operation

      // Test the API key
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });

      if (!response.ok) {
        throw new Error('Invalid API key');
      }

      await chrome.storage.sync.set({ openaiApiKey: apiKey });
      apiKeyStatus.textContent = 'API key saved successfully';
      apiKeyStatus.style.color = '#137333';
    } catch (error) {
      showError(error.message);
      apiKeyStatus.textContent = 'Failed to save API key';
      apiKeyStatus.style.color = '#d93025';
    } finally {
      buttonText.textContent = 'Save API Key';
      spinner.classList.add('hidden');
      updateSaveApiKeyButtonState(); // Re-evaluate button state based on input
    }
  });

  // Generate summary
  generateSummaryButton.addEventListener('click', async function() {
    const buttonText = generateSummaryButton.querySelector('.button-text');
    const spinner = generateSummaryButton.querySelector('.loading-spinner');
    const apiKey = apiKeyInput.value.trim();

    // Ensure thinking is always hidden at the start of the process
    thinking.classList.add('hidden');

    if (!apiKey) {
      showError('Please enter and save your OpenAI API key first');
      return;
    }

    try {
      // Reset UI
      buttonText.textContent = 'Generating...';
      spinner.classList.remove('hidden');
      loading.classList.remove('hidden'); // Show the initial loading spinner
      summaryResult.style.display = 'none';
      error.classList.add('hidden');
      generateSummaryButton.disabled = true;

      // Get the active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      let pageContent;
      
      try {
        // First attempt to get page content - show loading spinner during this phase
        const response = await chrome.tabs.sendMessage(tab.id, { action: 'getPageContent' });
        
        if (!response || !response.content) {
          throw new Error('Could not extract content from the page');
        }
        
        pageContent = response.content;
      } catch (error) {
        // If communication fails, inject the content script and try again
        console.log('Injecting content script and retrying...');
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js']
        });
        
        // Wait a moment for the script to initialize
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Try sending the message again
        const response = await chrome.tabs.sendMessage(tab.id, { action: 'getPageContent' });
        
        if (!response || !response.content) {
          throw new Error('Could not extract content from the page. Make sure this is not a restricted page.');
        }
        
        pageContent = response.content;
      }

      // Content successfully extracted, now process it
      // Check content length
      if (pageContent.length > CHARACTER_LIMIT) {
        characterLimitWarning.classList.remove('hidden');
      } else {
        characterLimitWarning.classList.add('hidden');
      }

      // Hide loading spinner and show thinking animation for API processing
      loading.classList.add('hidden');
      thinking.classList.remove('hidden'); // Show thinking animation ONLY when sending to API

      try {
        // Send message to background script to generate summary
        const summary = await chrome.runtime.sendMessage({
          action: 'generateSummary',
          content: pageContent,
          type: summaryTypeSelect.value,
          apiKey: apiKeyInput.value.trim()
        });

        // Only when we have a summary, hide thinking and show the result
        thinking.classList.add('hidden');
        summaryContent.textContent = summary;
        summaryResult.style.display = 'block';
      } catch (apiError) {
        showError(apiError.message || 'Failed to generate summary');
        thinking.classList.add('hidden'); // Ensure thinking is hidden on API error
        throw apiError; // Rethrow to be caught by outer catch
      }
      
    } catch (error) {
      showError(error.message);
      thinking.classList.add('hidden'); // Ensure thinking animation is hidden on any error
    } finally {
      buttonText.textContent = 'Generate Summary';
      spinner.classList.add('hidden');
      loading.classList.add('hidden');
      generateSummaryButton.disabled = false;
    }
  });

  // Copy summary to clipboard
  copySummaryButton.addEventListener('click', async function() {
    try {
      await navigator.clipboard.writeText(summaryContent.textContent);
      const originalTitle = copySummaryButton.getAttribute('title');
      copySummaryButton.setAttribute('title', 'Copied!');
      setTimeout(() => {
        copySummaryButton.setAttribute('title', originalTitle);
      }, 2000);
    } catch (error) {
      showError('Failed to copy to clipboard');
    }
  });

  // Toggle API Key Visibility
  if (toggleApiKeyVisibilityButton && apiKeyInput && eyeIcon && eyeSlashIcon) {
    toggleApiKeyVisibilityButton.addEventListener('click', function() {
      const isPassword = apiKeyInput.type === 'password';
      if (isPassword) {
        apiKeyInput.type = 'text';
        eyeIcon.classList.add('hidden');
        eyeSlashIcon.classList.remove('hidden');
        toggleApiKeyVisibilityButton.setAttribute('title', 'Hide API Key');
      } else {
        apiKeyInput.type = 'password';
        eyeIcon.classList.remove('hidden');
        eyeSlashIcon.classList.add('hidden');
        toggleApiKeyVisibilityButton.setAttribute('title', 'Show API Key');
      }
    });
  }

  // Helper function to show errors
  function showError(message) {
    error.textContent = message;
    error.classList.remove('hidden');
  }
});