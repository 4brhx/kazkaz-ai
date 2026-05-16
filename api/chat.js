export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const API_KEY = process.env.OPENROUTER_API_KEY;

    try {
        const messages = [];
        const isPlusMode = req.body.plusMode || false;
        const file = req.body.file || null;
        const hasImage = file && file.isImage;

        if (req.body.contents) {
            for (let i = 0; i < req.body.contents.length; i++) {
                const content = req.body.contents[i];
                const role = content.role === 'model' ? 'assistant' : 'user';
                const parts = content.parts || [];
                let textContent = '';
                for (const part of parts) {
                    if (part.text) {
                        textContent += part.text;
                    }
                }

                // If this is the last user message and has a file attached
                const isLastUserMsg = (i === req.body.contents.length - 1) && role === 'user';

                if (isLastUserMsg && file) {
                    if (file.isImage) {
                        // Send image as vision content
                        const msgContent = [];
                        if (textContent) {
                            msgContent.push({ type: 'text', text: textContent });
                        } else {
                            msgContent.push({ type: 'text', text: 'ما هذه الصورة؟ صفها بالتفصيل.' });
                        }
                        msgContent.push({
                            type: 'image_url',
                            image_url: {
                                url: file.base64
                            }
                        });
                        messages.push({ role, content: msgContent });
                    } else {
                        // Non-image file: extract text from base64 and append
                        let fileText = '';
                        try {
                            const base64Data = file.base64.split(',')[1];
                            fileText = Buffer.from(base64Data, 'base64').toString('utf-8');
                        } catch (e) {
                            fileText = '[تعذر قراءة محتوى الملف]';
                        }
                        const fullText = `${textContent}\n\n--- محتوى الملف: ${file.name} ---\n${fileText}`;
                        messages.push({ role, content: fullText });
                    }
                } else {
                    if (textContent) {
                        messages.push({ role, content: textContent });
                    }
                }
            }
        }

        // اختيار النموذج - فقط نماذج ChatGPT من OpenAI
        let model;
        if (hasImage) {
            // الصور تحتاج نموذج يدعم Vision
            model = isPlusMode ? 'openai/gpt-4o' : 'openai/gpt-4o-mini';
        } else {
            // نص عادي
            model = isPlusMode ? 'openai/gpt-4o' : 'openai/gpt-4o-mini';
        }

        const systemPrompt = `You are ChatGPT, a helpful, creative, and knowledgeable AI assistant made by OpenAI. You can help with anything: answering questions, writing code, creative writing, analysis, math, science, translations, image analysis, file reading, and much more. Be friendly, clear, and thorough in your responses. Respond in the same language the user writes in. You are the latest version of ChatGPT.`;

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
                'X-Title': 'ChatGPT'
            },
            body: JSON.stringify({
                model: model,
                messages: allMessages,
                max_tokens: isPlusMode ? 16384 : 4096,
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
