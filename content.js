// Function to extract text content from the page
function extractPageContent() {
  // Check if the page is a PDF
  if (window.location.href.toLowerCase().endsWith('.pdf')) {
    return extractPdfContent();
  }

  // For regular web pages
  return extractWebPageContent();
}

// Function to extract content from PDF
function extractPdfContent() {
  // Try different PDF viewer selectors
  const selectors = [
    '.textLayer', // Chrome's built-in PDF viewer
    '#viewer', // PDF.js viewer
    '.pdfViewer', // Another common PDF viewer class
    'embed[type="application/pdf"]', // Embedded PDF
    'object[type="application/pdf"]' // Object PDF
  ];

  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) {
      if (element.tagName === 'EMBED' || element.tagName === 'OBJECT') {
        // For embedded PDFs, we can't extract content directly
        return 'This PDF is embedded and cannot be summarized directly. Please open it in a new tab.';
      }
      return element.innerText;
    }
  }

  return 'Could not extract content from this PDF. Please try opening it in a new tab.';
}

// Function to extract content from web pages
function extractWebPageContent() {
  // Try to find the main content
  const selectors = [
    'article',
    'main',
    '[role="main"]',
    '.main-content',
    '.content',
    '#content',
    '.post',
    '.article'
  ];

  let mainContent = null;
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) {
      mainContent = element;
      break;
    }
  }

  // If no main content found, use body
  if (!mainContent) {
    mainContent = document.body;
  }

  // Create a clone to avoid modifying the original DOM
  const contentClone = mainContent.cloneNode(true);
  
  // Remove unwanted elements
  const unwantedElements = contentClone.querySelectorAll(
    'script, style, nav, footer, header, aside, .ad, .advertisement, .banner, .menu, .navigation, ' +
    '.comments, .comment, .social-share, .share, .related, .sidebar, .widget, ' +
    'iframe, .cookie-notice, .newsletter, .popup, .modal'
  );
  
  unwantedElements.forEach(element => element.remove());

  // Get all text content
  let content = contentClone.innerText;

  // Clean up the content
  content = content
    .replace(/\s+/g, ' ')  // Replace multiple spaces with single space
    .replace(/\n+/g, '\n') // Replace multiple newlines with single newline
    .replace(/\t+/g, ' ')  // Replace tabs with space
    .replace(/[^\S\n]+/g, ' ') // Replace multiple spaces (except newlines) with single space
    .trim();

  // Remove empty lines
  content = content.split('\n')
    .filter(line => line.trim().length > 0)
    .join('\n');

  return content;
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getPageContent') {
    const content = extractPageContent();
    sendResponse({ content: content });
  }
  return true;
}); 