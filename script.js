// ============ Configuration ============
const API_URL = '/api/chat';

// ============ DOM Elements ============
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendBtn');
const uploadBtn = document.getElementById('uploadBtn');
const fileInput = document.getElementById('fileInput');
const filePreview = document.getElementById('filePreview');
const filePreviewImage = document.getElementById('filePreviewImage');
const filePreviewName = document.getElementById('filePreviewName');
const fileRemoveBtn = document.getElementById('fileRemoveBtn');
const clearChat = document.getElementById('clearChat');
const exportChat = document.getElementById('exportChat');
const themeToggle = document.getElementById('themeToggle');

// ============ State ============
let conversationHistory = [];
let selectedFile = null;
let selectedFileData = null;
let isGenerating = false;

// ============ Theme Toggle ============
function initTheme() {
    const savedTheme = localStorage.getItem('kazkaz-theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const newTheme = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('kazkaz-theme', newTheme);
    updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
    const icon = themeToggle.querySelector('i');
    icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
}

themeToggle.addEventListener('click', toggleTheme);
initTheme();

// ============ Auto-resize Textarea ============
chatInput.addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 120) + 'px';
});

// ============ Send Message ============
chatInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

sendBtn.addEventListener('click', sendMessage);

async function sendMessage() {
    const text = chatInput.value.trim();
    if ((!text && !selectedFile) || isGenerating) return;

    // Display user message
    const userMsgContent = text || 'تم إرسال ملف';
    addMessage('user', userMsgContent, selectedFile ? selectedFile.name : null);

    // Add to history
    const userEntry = { role: 'user', parts: [] };
    if (text) userEntry.parts.push({ text });

    // Handle file
    let fileDataForAPI = null;
    if (selectedFileData) {
        fileDataForAPI = {
            inlineData: {
                mimeType: selectedFile.type,
                data: selectedFileData
            }
        };
        userEntry.parts.push(fileDataForAPI);
    }

    conversationHistory.push(userEntry);

    // Clear input
    chatInput.value = '';
    chatInput.style.height = 'auto';
    removeFile();

    // Show typing indicator
    const typingEl = showTypingIndicator();
    isGenerating = true;
    sendBtn.disabled = true;

    try {
        const response = await callGeminiAPI();
        removeTypingIndicator(typingEl);

        const aiText = response;
        addMessage('ai', aiText);
        conversationHistory.push({ role: 'model', parts: [{ text: aiText }] });
    } catch (error) {
        removeTypingIndicator(typingEl);
        addMessage('ai', 'عذراً، حدث خطأ. يرجى المحاولة مرة أخرى. (' + error.message + ')');
    }

    isGenerating = false;
    sendBtn.disabled = false;
}

// ============ Gemini API Call ============
async function callGeminiAPI() {
    const requestBody = {
        contents: conversationHistory,
        generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 8192
        },
        safetySettings: [
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
        ]
    };

    const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'API Error');
    }

    const data = await response.json();

    if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
        return data.candidates[0].content.parts[0].text;
    }

    throw new Error('لم يتم الحصول على رد');
}

// ============ File Upload ============
uploadBtn.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', function (e) {
    const file = e.target.files[0];
    if (!file) return;

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
        alert('حجم الملف كبير جداً. الحد الأقصى 10 ميجابايت.');
        return;
    }

    selectedFile = file;

    // Read file as base64
    const reader = new FileReader();
    reader.onload = function (event) {
        const base64 = event.target.result.split(',')[1];
        selectedFileData = base64;

        // Show preview
        filePreview.style.display = 'block';
        filePreviewName.textContent = file.name;

        if (file.type.startsWith('image/')) {
            filePreviewImage.src = event.target.result;
            filePreviewImage.style.display = 'block';
        } else {
            filePreviewImage.style.display = 'none';
        }
    };
    reader.readAsDataURL(file);
});

fileRemoveBtn.addEventListener('click', removeFile);

function removeFile() {
    selectedFile = null;
    selectedFileData = null;
    filePreview.style.display = 'none';
    fileInput.value = '';
}

// ============ Message Display ============
function addMessage(type, content, fileName = null) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}-message`;

    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.innerHTML = type === 'ai' ? '<i class="fas fa-robot"></i>' : '<i class="fas fa-user"></i>';

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';

    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    bubble.innerHTML = formatMessage(content);

    if (fileName) {
        const fileTag = document.createElement('div');
        fileTag.style.cssText = 'margin-top:8px; font-size:0.8rem; opacity:0.7;';
        fileTag.innerHTML = `<i class="fas fa-file"></i> ${fileName}`;
        bubble.appendChild(fileTag);
    }

    const time = document.createElement('span');
    time.className = 'message-time';
    time.textContent = getCurrentTime();

    contentDiv.appendChild(bubble);
    contentDiv.appendChild(time);
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(contentDiv);

    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function formatMessage(text) {
    // Code blocks
    text = text.replace(/```(\w*)\n?([\s\S]*?)```/g, '<pre><code>$2</code></pre>');
    // Inline code
    text = text.replace(/`([^`]+)`/g, '<code style="background:rgba(108,99,255,0.2);padding:2px 6px;border-radius:4px;">$1</code>');
    // Bold
    text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // Italic
    text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
    // Line breaks
    text = text.replace(/\n/g, '<br>');
    // Lists
    text = text.replace(/^- (.+)/gm, '<li>$1</li>');
    text = text.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');

    return text;
}

function getCurrentTime() {
    return new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
}

// ============ Typing Indicator ============
function showTypingIndicator() {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message ai-message';
    messageDiv.id = 'typingIndicator';

    messageDiv.innerHTML = `
        <div class="message-avatar">
            <i class="fas fa-robot"></i>
        </div>
        <div class="message-content">
            <div class="message-bubble">
                <div class="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
        </div>
    `;

    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return messageDiv;
}

function removeTypingIndicator(el) {
    if (el && el.parentNode) {
        el.parentNode.removeChild(el);
    }
}

// ============ Clear Chat ============
clearChat.addEventListener('click', function () {
    if (confirm('هل تريد مسح المحادثة بالكامل؟')) {
        chatMessages.innerHTML = '';
        conversationHistory = [];
        addMessage('ai', 'تم مسح المحادثة. كيف يمكنني مساعدتك؟');
    }
});

// ============ Export Chat ============
exportChat.addEventListener('click', function () {
    let text = '=== محادثة KazKaz AI ===\n\n';

    conversationHistory.forEach(msg => {
        const role = msg.role === 'user' ? 'أنت' : 'KazKaz AI';
        const content = msg.parts.map(p => p.text || '[ملف]').join(' ');
        text += `${role}: ${content}\n\n`;
    });

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kazkaz-chat-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
});

// ============ Smooth Scroll for Navigation ============
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({ behavior: 'smooth' });
        }
    });
});

// ============ Scroll Animations ============
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver(function (entries) {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

document.querySelectorAll('.feature-card, .stat-item').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = 'all 0.6s ease-out';
    observer.observe(el);
});
