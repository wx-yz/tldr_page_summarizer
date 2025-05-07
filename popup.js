document.addEventListener('DOMContentLoaded', function() {
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

  // Constants
  const CHARACTER_LIMIT = 10000;
  const MAX_TOKENS = 4000;

  // Load saved API key
  chrome.storage.sync.get(['openaiApiKey'], function(result) {
    if (result.openaiApiKey) {
      apiKeyInput.value = result.openaiApiKey;
      apiKeyStatus.textContent = 'API key saved';
      apiKeyStatus.style.color = '#137333';
    }
  });

  // Save API key
  saveApiKeyButton.addEventListener('click', async function() {
    const buttonText = saveApiKeyButton.querySelector('.button-text');
    const spinner = saveApiKeyButton.querySelector('.loading-spinner');
    const apiKey = apiKeyInput.value.trim();

    if (!apiKey) {
      showError('Please enter a valid API key');
      return;
    }

    try {
      buttonText.textContent = 'Saving...';
      spinner.classList.remove('hidden');
      saveApiKeyButton.disabled = true;

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
      saveApiKeyButton.disabled = false;
    }
  });

  // Generate summary
  generateSummaryButton.addEventListener('click', async function() {
    const buttonText = generateSummaryButton.querySelector('.button-text');
    const spinner = generateSummaryButton.querySelector('.loading-spinner');
    const apiKey = apiKeyInput.value.trim();

    if (!apiKey) {
      showError('Please enter and save your OpenAI API key first');
      return;
    }

    try {
      buttonText.textContent = 'Generating...';
      spinner.classList.remove('hidden');
      loading.classList.remove('hidden');
      summaryResult.style.display = 'none';
      error.classList.add('hidden');
      generateSummaryButton.disabled = true;

      // Get the active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // Send message to content script to get page content
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'getPageContent' });
      
      if (!response || !response.content) {
        throw new Error('Could not extract content from the page');
      }

      // Check content length
      if (response.content.length > CHARACTER_LIMIT) {
        characterLimitWarning.classList.remove('hidden');
      } else {
        characterLimitWarning.classList.add('hidden');
      }

      // Send message to background script to generate summary
      const summary = await chrome.runtime.sendMessage({
        action: 'generateSummary',
        content: response.content,
        type: summaryTypeSelect.value,
        apiKey: apiKey
      });

      summaryContent.textContent = summary;
      summaryResult.style.display = 'block';
    } catch (error) {
      showError(error.message);
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

  // Helper function to show errors
  function showError(message) {
    error.textContent = message;
    error.classList.remove('hidden');
  }
}); 