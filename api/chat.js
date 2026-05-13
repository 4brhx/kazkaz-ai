export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const API_KEY = process.env.GEMINI_API_KEY;

    if (!API_KEY) {
        return res.status(500).json({ error: { message: 'API Key not configured' } });
    }

    try {
        // Convert Gemini format to OpenRouter format
        const messages = [];
        if (req.body.contents) {
            for (const content of req.body.contents) {
                const role = content.role === 'model' ? 'assistant' : 'user';
                const parts = content.parts || [];
                const textParts = parts.filter(p => p.text).map(p => p.text).join('\n');
                
                // Handle image/file parts
                const messageParts = [];
                for (const part of parts) {
                    if (part.text) {
                        messageParts.push({ type: 'text', text: part.text });
                    } else if (part.inlineData) {
                        messageParts.push({
                            type: 'image_url',
                            image_url: { url: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}` }
                        });
                    }
                }

                if (messageParts.length === 1 && messageParts[0].type === 'text') {
                    messages.push({ role, content: messageParts[0].text });
                } else if (messageParts.length > 0) {
                    messages.push({ role, content: messageParts });
                }
            }
        }

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`,
                'HTTP-Referer': 'https://kazkaz-ai.vercel.app',
                'X-Title': 'KazKaz AI'
            },
            body: JSON.stringify({
                model: 'google/gemini-2.0-flash-001',
                messages: messages,
                max_tokens: 8192,
                temperature: 0.7
            })
        });

        const data = await response.json();

        if (!response.ok) {
            return res.status(response.status).json({ error: { message: data.error?.message || 'API Error' } });
        }

        // Convert OpenRouter response to Gemini format (so frontend works without changes)
        const aiText = data.choices?.[0]?.message?.content || '';
        const geminiFormat = {
            candidates: [{
                content: {
                    parts: [{ text: aiText }],
                    role: 'model'
                }
            }]
        };

        return res.status(200).json(geminiFormat);
    } catch (error) {
        return res.status(500).json({ error: { message: error.message } });
    }
}
