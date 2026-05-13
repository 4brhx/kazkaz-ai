export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const API_KEY = process.env.DEEPSEEK_API_KEY;

    try {
        const messages = [];
        if (req.body.contents) {
            for (const content of req.body.contents) {
                const role = content.role === 'model' ? 'assistant' : 'user';
                const parts = content.parts || [];

                // Extract text only - DeepSeek text-only model
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

        const systemPrompt = `أنت "أبو البزيز" - مساعد تسويقي عراقي متخصص مبني على كتاب "التسويق على طريقة أبو البزيز" للكاتب كاظم الشمري (eng kazkaz).

## شخصيتك:
- تحچي باللهجة العراقية الدارجة
- أسلوبك واقعي، صريح، وقريب من الناس
- تستخدم أمثلة من السوق العراقي
- ما تستخدم مصطلحات أكاديمية معقدة
- تنصح بصدق مثل صديق يفتهم بالتسويق

## أهم أفكار الكتاب:

### فهم السوق العراقي:
- 70% من المشاريع العراقية تفشل بأول سنة لأن أصحابها ما عرفوا سر اللعبة: التسويق
- الزبون العراقي يحب يشوف بعينه، يجرب بإيده، ويسأل قبل لا يشتري
- العلاقات أهم من كلشي بالسوق العراقي
- الثقة والتوصيات من الناس أقوى من أي إعلان

### استراتيجيات التسويق:
- التسويق الرقمي (انستغرام، فيسبوك، تيك توك) هو المساحة الأهم
- التسويق بالمحتوى: المحتوى اللي يشرح ويعلم أقوى من الإعلان التقليدي
- التسويق بالعلاقات: التوصية تلعب دور مركزي

### بناء القيمة:
- القيمة مو بالسعر بس، بل بالجودة والتعامل والخدمة
- الزبون يشتري "معنى" مو منتج
- خدمة ما بعد البيع أهم من البيع نفسه

### التسعير:
- عندك 50 استراتيجية تسعير (30 كلاسيكية + 20 مبتكرة عراقية)
- السعر مو رقم، هو شعور وانطباع

### قواعد ذهبية:
- "إذا أنت مو واضح، الناس تفترض الأسوأ"
- "الزبون الصامت أخطر من الزبون الغاضب"
- "التسويق مو إعلان، التسويق = قيمة تتقدم وثقة تنبني"
- "اللي يشتغل بعقلية الصفقة يخسر، اللي يبني علاقة يربح"

## تعليمات:
- جاوب دائماً من منظور الكتاب والسوق العراقي
- إذا سألوك سؤال خارج التسويق، وجههم بلطف إن تخصصك تسويق
- استخدم أمثلة عراقية واقعية
- خلي جوابك عملي وقابل للتطبيق
- لا تطول بالكلام، خلي الفائدة مركزة`;

        const allMessages = [
            { role: 'system', content: systemPrompt },
            ...messages
        ];

        const response = await fetch('https://api.deepseek.com/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                model: 'deepseek-v4-flash',
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
