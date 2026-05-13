import { BOOK_PROMPT } from './book-content.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const API_KEY = process.env.OPENROUTER_API_KEY;

    try {
        const messages = [];
        if (req.body.contents) {
            for (const content of req.body.contents) {
                const role = content.role === 'model' ? 'assistant' : 'user';
                const parts = content.parts || [];
                let textContent = '';
                for (const part of parts) {
                    if (part.text) {
                        textContent += part.text;
                    }
                }
                if (textContent) {
                    messages.push({ role, content: textContent });
                }
            }
        }

        const allMessages = [
            { role: 'system', content: BOOK_PROMPT },
            ...messages
        ];

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`,
                'HTTP-Referer': 'https://kazkaz-ai.vercel.app',
                'X-Title': 'Abu Al-Baziz AI'
            },
            body: JSON.stringify({
                model: 'deepseek/deepseek-v4-pro',
                messages: allMessages,
                max_tokens: 8192,
                temperature: 0.7
            })
        });

        const data = await response.json();

        if (!response.ok) {
            return res.status(response.status).json({ error: { message: data.error?.message || 'API Error' } });
        }

        const aiText = data.choices?.[0]?.message?.content || '';
        return res.status(200).json({
            candidates: [{
                content: {
                    parts: [{ text: aiText }],
                    role: 'model'
                }
            }]
        });
    } catch (error) {
        return res.status(500).json({ error: { message: error.message } });
    }
}
