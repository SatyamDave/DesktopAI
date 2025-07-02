const fetch = require('node-fetch');
require('dotenv').config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=' + GEMINI_API_KEY;

const tools = [
  {
    functionDeclarations: [
      {
        name: 'open_url',
        description: 'Open a URL or perform a web search',
        parameters: {
          type: 'object',
          properties: {
            url: { type: 'string', description: 'URL to open or search query' },
            searchEngine: { type: 'string', description: 'Search engine to use', default: 'google' }
          },
          required: ['url']
        }
      },
      {
        name: 'open_app',
        description: 'Open or launch an application on the system',
        parameters: {
          type: 'object',
          properties: {
            appName: { type: 'string', description: 'Name of the application to open' },
            fallbackToWeb: { type: 'boolean', description: 'Whether to fallback to web version', default: true }
          },
          required: ['appName']
        }
      }
    ]
  }
];

const systemPrompt = `You are Friday, an advanced AI assistant that can control the user's computer and perform various tasks.`;
const userText = 'can you open chatgpt on browser';

const body = {
  contents: [
    { role: 'model', parts: [{ text: systemPrompt }] },
    { role: 'user', parts: [{ text: userText }] }
  ],
  tools: tools,
  tool_config: { mode: 'AUTO' }
};

console.log('--- Gemini Request ---');
console.log(JSON.stringify(body, null, 2));

fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body)
})
  .then(res => res.json())
  .then(data => {
    console.log('--- Gemini Response ---');
    console.dir(data, { depth: null });
  })
  .catch(err => {
    console.error('Error:', err);
  }); 