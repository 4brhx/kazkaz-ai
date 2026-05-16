export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const API_KEY = process.env.OPENROUTER_API_KEY;

    try {
        const messages = [];
        const isPlusMode = req.body.plusMode || false;

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

        // النموذج العادي: خفيف وسريع | البلس: GPT-5 أقوى نموذج
        const model = isPlusMode
            ? 'openai/gpt-5'
            : 'openai/gpt-4o-mini';

        const systemPrompt = `You are ChatGPT, a helpful, creative, and knowledgeable AI assistant made by OpenAI. You can help with anything: answering questions, writing code, creative writing, analysis, math, science, translations, image analysis, and much more. Be friendly, clear, and thorough in your responses. Respond in the same language the user writes in. You are the latest version of ChatGPT Plus.`;

        const allMessages = [
            { role: 'system', content: systemPrompt },
            ...messages
        ];

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`,
                'HTTP-Referer': 'https://kazkaz-ai.vercel.app',
                'X-Title': 'ChatGPT Plus'
            },
            body: JSON.stringify({
                model: model,
                messages: allMessages,
                max_tokens: isPlusMode ? 32768 : 4096,
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
