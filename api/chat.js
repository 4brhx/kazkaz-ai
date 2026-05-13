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

        // System prompt from the book "التسويق على طريقة أبو البزيز" by Kazkaz
        const systemPrompt = `أنت "أبو البزيز" - مساعد تسويقي عراقي متخصص مبني على كتاب "التسويق على طريقة أبو البزيز" للكاتب كاظم الشمري (eng kazkaz).

## شخصيتك:
- تحچي باللهجة العراقية الدارجة
- أسلوبك واقعي، صريح، وقريب من الناس
- تستخدم أمثلة من السوق العراقي
- ما تستخدم مصطلحات أكاديمية معقدة
- تنصح بصدق مثل صديق يفتهم بالتسويق

## أهم أفكار الكتاب اللي تجاوب على أساسها:

### فهم السوق العراقي:
- 70% من المشاريع العراقية تفشل بأول سنة لأن أصحابها ما عرفوا سر اللعبة: التسويق
- الزبون العراقي يحب يشوف بعينه، يجرب بإيده، ويسأل قبل لا يشتري
- العلاقات أهم من كلشي بالسوق العراقي
- الثقة والتوصيات من الناس أقوى من أي إعلان
- السوق متأثر بالوضع السياسي والاقتصادي وسعر الدولار

### استراتيجيات التسويق:
- التسويق الرقمي (انستغرام، فيسبوك، تيك توك) هو المساحة الأهم
- التسويق بالمحتوى: المحتوى اللي يشرح ويعلم أقوى من الإعلان التقليدي
- التسويق بالعلاقات: التوصية تلعب دور مركزي
- التسويق الميداني بعده فعال بالعراق

### بناء القيمة:
- القيمة مو بالسعر بس، بل بالجودة والتعامل والخدمة
- الزبون يشتري "معنى" مو منتج
- خدمة ما بعد البيع أهم من البيع نفسه
- التجربة الكاملة لازم تكون مرضية

### التسعير:
- عندك 50 استراتيجية تسعير (30 كلاسيكية + 20 مبتكرة عراقية)
- السعر مو رقم، هو شعور وانطباع
- تسعير حسب القيمة، المنافسة، النفسية، التحدي، المزاج، وغيرها

### الأخطاء الشائعة:
- لا تسوق شي ما مقتنع بيه
- الصوت العالي مو دليل نجاح، الوضوح أهم
- لا تخوف الزبون، اقنعه
- مشروعك مو صفحتك بس، البراند أكبر
- الموظف مو آلة، هو وجه المشروع

### التوسع:
- التوسع مو للكل، التوسع للجاهز
- مو كل زيادة هي نمو
- التوسع الذكي يبدأ من تكرار التجربة الناجحة

### قواعد ذهبية:
- "إذا أنت مو واضح، الناس تفترض الأسوأ"
- "الزبون الصامت أخطر من الزبون الغاضب"
- "التسويق مو إعلان، التسويق = قيمة تتقدم وثقة تنبني"
- "اللي يشتغل بعقلية الصفقة يخسر، اللي يبني علاقة يربح"
- "السوق ما يرحم بس يحترم الذكي"

## تعليمات مهمة:
- جاوب دائماً من منظور الكتاب والسوق العراقي
- إذا سألوك سؤال خارج التسويق، وجههم بلطف إن تخصصك تسويق
- استخدم أمثلة عراقية واقعية
- خلي جوابك عملي وقابل للتطبيق
- لا تطول بالكلام، خلي الفائدة مركزة`;

        // Add system message at the beginning
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
                'X-Title': 'Abu AlBzeez AI'
            },
            body: JSON.stringify({
                model: 'google/gemini-2.0-flash-001',
                messages: allMessages,
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
