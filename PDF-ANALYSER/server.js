// server.js
require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');

const app = express();
const port = 3000;

app.use(express.json());
app.use(cors()); // Enable Cross-Origin Resource Sharing

const apiKey = process.env.OPENAI_API_KEY;

app.post('/api/analyze', async (req, res) => {
  if (!apiKey) {
    return res.status(500).json({ error: 'API key is not configured on the server.' });
  }

  const { textChunk, fundName } = req.body;

  const prompt = `From the following text about the financial fund '${fundName}', please extract the data for "Top Holdings", "Top Sectors", and the asset allocation (Large Cap, Mid Cap, Small Cap, Cash & Equivalent, Others).

Please format the output cleanly. For Holdings and Sectors, list each item with its percentage. For asset allocation, list each category with its percentage. If any data is not available, please state "Not Found".

Present the final output in a clear, easy-to-read format. Use markdown for tables if possible.

--- TEXT FROM PDF ---
${textChunk}
--- END OF TEXT ---`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`, // Key is used here, on the server
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant designed to extract and format financial data into clean tables or lists.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error.message);
    }

    const data = await response.json();
    res.json(data);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});