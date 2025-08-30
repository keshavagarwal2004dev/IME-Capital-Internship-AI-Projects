# PDF Fund Analyzer

A web application that allows you to upload PDF files and search for fund information using AI analysis.

## Features

- 📄 Upload PDF files automatically
- 🔍 Search for specific fund names within PDFs
- 🤖 AI-powered analysis of fund data
- 📋 Copy analysis results to clipboard
- 🐛 Debug mode to inspect PDF content
- 💬 Real-time notifications and feedback

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure API Key
Create a `.env` file in the root directory with your OpenAI API key:
```
OPENAI_API_KEY=your_actual_openai_api_key_here
```

### 3. Start the Server
```bash
npm start
```

### 4. Open the Application
Open `index.html` in your web browser or serve it using a local server.

## How to Use

1. **Upload PDF**: Click "Choose PDF File" and select your PDF document
2. **Automatic Processing**: The PDF will be automatically processed and loaded
3. **Search**: Enter a fund name in the search box and click "Search"
4. **View Results**: AI will analyze the content and display structured fund information
5. **Copy Results**: Use the copy buttons to save analysis results

## Features

- **Automatic PDF Processing**: No need to click "Setup Complete" - PDFs are processed automatically
- **Toast Notifications**: Real-time feedback for all actions
- **Error Handling**: Comprehensive error messages and suggestions
- **Debug Mode**: Inspect PDF content for troubleshooting
- **Responsive Design**: Works on desktop and mobile devices

## Technical Details

- Frontend: HTML5, CSS3, JavaScript (ES6+)
- Backend: Node.js with Express
- PDF Processing: PDF.js library
- AI Analysis: OpenAI GPT API
- Styling: Modern CSS with gradients and animations

## Troubleshooting

- Make sure your OpenAI API key is valid and has sufficient credits
- Check that the server is running on port 3000
- Use the Debug button to inspect PDF content if search fails
- Ensure PDF files contain extractable text (not just images)
