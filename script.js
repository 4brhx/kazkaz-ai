// ===== Constants =====
const API_URL = '/api/chat';
const STORAGE_KEY = 'kazkaz_conversations';
const THEME_KEY = 'kazkaz_theme';

// ===== DOM Elements =====
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const hamburgerBtn = document.getElementById('hamburgerBtn');
const newChatBtn = document.getElementById('newChatBtn');
const conversationsList = document.getElementById('conversationsList');
const messagesContainer = document.getElementById('messagesContainer');
const welcomeScreen = document.getElementById('welcomeScreen');
const messagesList = document.getElementById('messagesList');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const fileInput = document.getElementById('fileInput');
const filePreview = document.getElementById('filePreview');
const fileName = document.getElementById('fileName');
const removeFileBtn = document.getElementById('removeFileBtn');
const themeToggle = document.getElementById('themeToggle');
const chatTitle = document.getElementById('chatTitle');

// ===== State =====
let conversations = [];
let currentConversationId = null;
let isGenerating = false;
let selectedFile = null;

// ===== Initialize =====
function init() {
    loadConversations();
    loadTheme();
    renderConversationsList();
    setupEventListeners();
}

// ===== Event Listeners =====
function setupEventListeners() {
    // Sidebar toggle
    hamburgerBtn.addEventListener('click', toggleSidebar);
    sidebarOverlay.addEventListener('click', closeSidebar);

    // New chat
    newChatBtn.addEventListener('click', () => {
        startNewChat();
        closeSidebar();
    });

    // Message input
    messageInput.addEventListener('input', handleInputChange);
    messageInput.addEventListener('keydown', handleKeyDown);

    // Send button
    sendBtn.addEventListener('click', sendMessage);

    // File upload
    fileInput.addEventListener('change', handleFileSelect);
    removeFileBtn.addEventListener('click', removeFile);

    // Theme toggle
    themeToggle.addEventListener('click', toggleTheme);

    // Suggestion buttons
    document.querySelectorAll('.suggestion-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const text = btn.getAttribute('data-text');
            messageInput.value = text;
            handleInputChange();
            sendMessage();
        });
    });
}

// ===== Sidebar =====
function toggleSidebar() {
    sidebar.classList.toggle('open');
    sidebarOverlay.classList.toggle('show');
}

function closeSidebar() {
    sidebar.classList.remove('open');
    sidebarOverlay.classList.remove('show');
}

// ===== Conversations Management =====
function loadConversations() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        conversations = stored ? JSON.parse(stored) : [];
    } catch (e) {
        conversations = [];
    }
}

function saveConversations() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
    } catch (e) {
        console.error('Failed to save conversations:', e);
    }
}

function startNewChat() {
    currentConversationId = null;
    messagesList.innerHTML = '';
    welcomeScreen.style.display = 'flex';
    chatTitle.textContent = 'أبو البزيز';
    renderConversationsList();
}

function createConversation(firstMessage) {
    const conv = {
        id: Date.now().toString(),
        title: firstMessage.substring(0, 40) + (firstMessage.length > 40 ? '...' : ''),
        messages: [],
        createdAt: new Date().toISOString()
    };
    conversations.unshift(conv);
    currentConversationId = conv.id;
    saveConversations();
    renderConversationsList();
    chatTitle.textContent = conv.title;
    return conv;
}

function getCurrentConversation() {
    return conversations.find(c => c.id === currentConversationId);
}

function deleteConversation(id, event) {
    event.stopPropagation();
    conversations = conversations.filter(c => c.id !== id);
    saveConversations();
    if (currentConversationId === id) {
        startNewChat();
    }
    renderConversationsList();
}

function loadConversation(id) {
    currentConversationId = id;
    const conv = getCurrentConversation();
    if (!conv) return;

    welcomeScreen.style.display = 'none';
    messagesList.innerHTML = '';
    chatTitle.textContent = conv.title;

    conv.messages.forEach(msg => {
        appendMessageToDOM(msg.role, msg.content);
    });

    renderConversationsList();
    scrollToBottom();
    closeSidebar();
}

function renderConversationsList() {
    conversationsList.innerHTML = '';
    conversations.forEach(conv => {
        const item = document.createElement('div');
        item.className = `conversation-item${conv.id === currentConversationId ? ' active' : ''}`;
        item.innerHTML = `
            <i class="fas fa-comment conv-icon"></i>
            <span class="conv-title">${escapeHTML(conv.title)}</span>
            <button class="conv-delete" title="حذف المحادثة">
                <i class="fas fa-trash"></i>
            </button>
        `;
        item.addEventListener('click', () => loadConversation(conv.id));
        item.querySelector('.conv-delete').addEventListener('click', (e) => deleteConversation(conv.id, e));
        conversationsList.appendChild(item);
    });
}

// ===== Input Handling =====
function handleInputChange() {
    // Auto-resize textarea
    messageInput.style.height = 'auto';
    messageInput.style.height = Math.min(messageInput.scrollHeight, 150) + 'px';
    
    // Enable/disable send button
    const hasContent = messageInput.value.trim().length > 0 || selectedFile;
    sendBtn.disabled = !hasContent || isGenerating;
}

function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (!sendBtn.disabled) {
            sendMessage();
        }
    }
}

// ===== File Handling =====
function handleFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    selectedFile = file;
    fileName.textContent = file.name;
    filePreview.style.display = 'block';
    handleInputChange();
}

function removeFile() {
    selectedFile = null;
    fileInput.value = '';
    filePreview.style.display = 'none';
    handleInputChange();
}

// ===== Message Sending =====
async function sendMessage() {
    const text = messageInput.value.trim();
    if (!text && !selectedFile) return;
    if (isGenerating) return;

    // Hide welcome screen
    welcomeScreen.style.display = 'none';

    // Create conversation if needed
    if (!currentConversationId) {
        createConversation(text || 'صورة');
    }

    const conv = getCurrentConversation();

    // Build message parts
    const userParts = [];
    let fileData = null;

    if (selectedFile) {
        fileData = await readFileAsBase64(selectedFile);
        if (fileData) {
            userParts.push({
                inlineData: {
                    mimeType: selectedFile.type,
                    data: fileData
                }
            });
        }
    }

    if (text) {
        userParts.push({ text: text });
    }

    // Add user message to conversation
    conv.messages.push({ role: 'user', content: text || '📎 ملف مرفق', parts: userParts });
    saveConversations();

    // Display user message
    appendMessageToDOM('user', text || '📎 ملف مرفق');
    scrollToBottom();

    // Clear input
    messageInput.value = '';
    messageInput.style.height = 'auto';
    removeFile();
    handleInputChange();

    // Show typing indicator
    const typingEl = showTypingIndicator();
    isGenerating = true;
    sendBtn.disabled = true;

    try {
        // Build API request body
        const contents = conv.messages.map(msg => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: msg.parts || [{ text: msg.content }]
        }));

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error?.message || 'حدث خطأ في الاتصال');
        }

        // Extract AI response
        const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'عذراً، لم أتمكن من الرد.';

        // Add AI message to conversation
        conv.messages.push({ role: 'model', content: aiText, parts: [{ text: aiText }] });
        saveConversations();

        // Remove typing indicator and show response
        removeTypingIndicator(typingEl);
        appendMessageToDOM('model', aiText);
        scrollToBottom();

    } catch (error) {
        removeTypingIndicator(typingEl);
        appendMessageToDOM('model', `⚠️ خطأ: ${error.message}`);
        scrollToBottom();
    } finally {
        isGenerating = false;
        handleInputChange();
    }
}

// ===== File Reading =====
function readFileAsBase64(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
            const base64 = reader.result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(file);
    });
}

// ===== DOM Manipulation =====
function appendMessageToDOM(role, content) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role === 'user' ? 'user-message' : 'ai-message'}`;

    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.innerHTML = role === 'user' ? '<i class="fas fa-user"></i>' : '<i class="fas fa-robot"></i>';

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.innerHTML = role === 'user' ? escapeHTML(content) : formatMarkdown(content);

    messageDiv.appendChild(avatar);
    messageDiv.appendChild(contentDiv);
    messagesList.appendChild(messageDiv);
}

function showTypingIndicator() {
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message ai-message';
    typingDiv.id = 'typingIndicator';
    typingDiv.innerHTML = `
        <div class="message-avatar"><i class="fas fa-robot"></i></div>
        <div class="message-content">
            <div class="typing-indicator">
                <span></span><span></span><span></span>
            </div>
        </div>
    `;
    messagesList.appendChild(typingDiv);
    scrollToBottom();
    return typingDiv;
}

function removeTypingIndicator(el) {
    if (el && el.parentNode) {
        el.parentNode.removeChild(el);
    }
}

function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// ===== Formatting =====
function escapeHTML(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatMarkdown(text) {
    if (!text) return '';
    
    let formatted = escapeHTML(text);

    // Code blocks
    formatted = formatted.replace(/```(\w*)\n?([\s\S]*?)```/g, (match, lang, code) => {
        return `<pre><code class="language-${lang}">${code.trim()}</code></pre>`;
    });

    // Inline code
    formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Bold
    formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

    // Italic
    formatted = formatted.replace(/\*(.+?)\*/g, '<em>$1</em>');

    // Unordered lists
    formatted = formatted.replace(/^[\-\*] (.+)$/gm, '<li>$1</li>');
    formatted = formatted.replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul>$1</ul>');

    // Ordered lists
    formatted = formatted.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

    // Line breaks
    formatted = formatted.replace(/\n/g, '<br>');

    // Clean up
    formatted = formatted.replace(/<br><ul>/g, '<ul>');
    formatted = formatted.replace(/<\/ul><br>/g, '</ul>');
    formatted = formatted.replace(/<br><pre>/g, '<pre>');
    formatted = formatted.replace(/<\/pre><br>/g, '</pre>');

    return formatted;
}

// ===== Theme =====
function loadTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
        updateThemeButton(true);
    }
}

function toggleTheme() {
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    if (isLight) {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem(THEME_KEY, 'dark');
    } else {
        document.documentElement.setAttribute('data-theme', 'light');
        localStorage.setItem(THEME_KEY, 'light');
    }
    updateThemeButton(!isLight);
}

function updateThemeButton(isLight) {
    const icon = themeToggle.querySelector('i');
    const text = themeToggle.querySelector('span');
    if (isLight) {
        icon.className = 'fas fa-sun';
        text.textContent = 'الوضع الفاتح';
    } else {
        icon.className = 'fas fa-moon';
        text.textContent = 'الوضع الداكن';
    }
}

// ===== Start =====
document.addEventListener('DOMContentLoaded', init);
