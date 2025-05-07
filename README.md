# TL;DR Page Summarizer Chrome Extension

A Chrome extension that generates TL;DR summaries of web pages and PDF documents using OpenAI's GPT-3.5 API.

## Features

- Generate summaries of any web page or PDF document
- Three summary types:
  1. Short summary (2-3 sentences)
  2. Explain like to a smart 12-year-old
  3. Most important points or ideas
- Secure API key storage
- Clean and modern user interface

## Installation

1. Clone or download this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" and select the extension directory

## Usage

1. Click the extension icon in your Chrome toolbar
2. Enter your OpenAI API key and click "Save API Key"
3. Select your preferred summary type
4. Click "Generate Summary" to create a TL;DR of the current page

## Requirements

- Chrome browser
- OpenAI API key (get one at https://platform.openai.com/)

## Security

- Your API key is stored securely in Chrome's storage
- The extension only makes API calls to OpenAI's official endpoints
- No data is stored or transmitted to any other servers

## Development

The extension consists of the following files:
- `manifest.json`: Extension configuration
- `popup.html`: User interface
- `popup.js`: UI interaction logic
- `content.js`: Page content extraction
- `background.js`: OpenAI API integration
- `styles.css`: UI styling

## License

MIT License 