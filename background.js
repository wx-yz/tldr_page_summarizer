// Rate limiting configuration
const RATE_LIMIT = {
  maxRequests: 3,
  timeWindow: 60000, // 1 minute
  requests: []
};

// Function to check rate limit
function checkRateLimit() {
  const now = Date.now();
  RATE_LIMIT.requests = RATE_LIMIT.requests.filter(time => now - time < RATE_LIMIT.timeWindow);
  
  if (RATE_LIMIT.requests.length >= RATE_LIMIT.maxRequests) {
    throw new Error('Rate limit exceeded. Please wait a minute before trying again.');
  }
  
  RATE_LIMIT.requests.push(now);
}

// Function to generate the prompt based on summary type
function getPrompt(type, content) {
  const prompts = {
    short: `Please provide a brief TL;DR summary of the following content in 2-3 sentences:\n\n${content}`,
    explain: `Please explain the following content in simple terms, as if explaining to a smart 12-year-old:\n\n${content}`,
    important: `Please list the most important points or ideas from the following content:\n\n${content}`
  };
  return prompts[type] || prompts.short;
}

// Function to handle API errors
function handleApiError(error) {
  if (error.status === 429) {
    throw new Error('Rate limit exceeded. Please wait a minute before trying again.');
  } else if (error.status === 401) {
    throw new Error('Invalid API key. Please check your API key and try again.');
  } else if (error.status === 413) {
    throw new Error('Content too long. Please try a shorter page or document.');
  } else {
    throw new Error(error.message || 'An error occurred while generating the summary.');
  }
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'generateSummary') {
    generateSummary(request.content, request.type, request.apiKey)
      .then(summary => sendResponse(summary))
      .catch(error => sendResponse(`Error: ${error.message}`));
    return true;
  }
});

// Function to generate summary using OpenAI API
async function generateSummary(content, type, apiKey) {
  try {
    // Check rate limit
    checkRateLimit();

    // Truncate content if it's too long (approximately 4000 tokens)
    const maxLength = 16000; // Rough estimate for 4000 tokens
    if (content.length > maxLength) {
      content = content.substring(0, maxLength) + '...';
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that creates clear and concise summaries.'
          },
          {
            role: 'user',
            content: getPrompt(type, content)
          }
        ],
        max_tokens: 500,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const error = await response.json();
      handleApiError({ status: response.status, message: error.error?.message });
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
  } catch (error) {
    console.error('Error generating summary:', error);
    throw error;
  }
} 