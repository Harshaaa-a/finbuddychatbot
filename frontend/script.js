// FinBuddy Frontend JavaScript
// Configuration
const CONFIG = {
    API_BASE: 'https://ejtsnpnkrlqkcbfufzpg.supabase.co/functions/v1',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqdHNucG5rcmxxa2NiZnVmenBnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzAwMzE0NzQsImV4cCI6MjA0NTYwNzQ3NH0.YmVhZGVkZGVhZGJlZWZkZWFkYmVlZmRlYWRiZWVmZGVhZGJlZWZkZWFkYmVlZg' // Replace with your actual anon key
};

// Global state
let isLoading = false;
let messageCount = 0;

// DOM Elements
const welcomeSection = document.getElementById('welcome');
const chatContainer = document.getElementById('chatContainer');
const messagesContainer = document.getElementById('messages');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const loadingOverlay = document.getElementById('loadingOverlay');
const characterCount = document.getElementById('characterCount');

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    updateCharacterCount();
});

// Event Listeners
function setupEventListeners() {
    // Message input events
    messageInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    messageInput.addEventListener('input', updateCharacterCount);
    
    // Send button
    sendButton.addEventListener('click', sendMessage);
}// Qui
ck question function
function askQuestion(question) {
    messageInput.value = question;
    sendMessage();
}

// Send message function
async function sendMessage() {
    const message = messageInput.value.trim();
    
    if (!message || isLoading) return;
    
    // Show chat container if first message
    if (messageCount === 0) {
        welcomeSection.style.display = 'none';
        chatContainer.style.display = 'flex';
    }
    
    // Add user message
    addMessage(message, 'user');
    messageInput.value = '';
    updateCharacterCount();
    
    // Show loading
    setLoading(true);
    
    try {
        const response = await fetch(`${CONFIG.API_BASE}/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${CONFIG.SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify({ message })
        });
        
        const data = await response.json();
        
        if (data.success) {
            addMessage(data.message, 'bot');
        } else {
            addMessage(data.error || 'Sorry, I encountered an error. Please try again.', 'bot', true);
        }
        
    } catch (error) {
        console.error('Chat error:', error);
        addMessage('Sorry, I\'m having trouble connecting. Please check your internet connection and try again.', 'bot', true);
    } finally {
        setLoading(false);
    }
}

// Add message to chat
function addMessage(text, sender, isError = false) {
    messageCount++;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;
    
    const avatar = sender === 'user' ? '👤' : '🤖';
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    messageDiv.innerHTML = `
        <div class="message-avatar">${avatar}</div>
        <div class="message-content">
            <div class="message-text ${isError ? 'error-message' : ''}">${text}</div>
            <div class="message-time">${time}</div>
        </div>
    `;
    
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Loading state management
function setLoading(loading) {
    isLoading = loading;
    sendButton.disabled = loading;
    messageInput.disabled = loading;
    
    if (loading) {
        loadingOverlay.style.display = 'flex';
    } else {
        loadingOverlay.style.display = 'none';
    }
}

// Update character count
function updateCharacterCount() {
    const count = messageInput.value.length;
    characterCount.textContent = `${count}/500`;
    
    if (count > 450) {
        characterCount.style.color = '#e53e3e';
    } else if (count > 400) {
        characterCount.style.color = '#dd6b20';
    } else {
        characterCount.style.color = '#718096';
    }
}

// Modal functions
function showDisclaimer() {
    document.getElementById('disclaimerModal').style.display = 'flex';
}

function showAbout() {
    alert('FinBuddy is an AI-powered financial advisor that helps you make informed investment decisions. Built with modern web technologies and powered by advanced AI models.');
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// Close modal when clicking outside
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal')) {
        e.target.style.display = 'none';
    }
});

// Add some sample interactions for demo
function addSampleMessages() {
    setTimeout(() => {
        addMessage("What are mutual funds?", 'user');
    }, 1000);
    
    setTimeout(() => {
        addMessage("Mutual funds are investment vehicles that pool money from multiple investors to purchase a diversified portfolio of stocks, bonds, or other securities. They offer professional management and diversification, making them suitable for investors who want exposure to various assets without picking individual securities.", 'bot');
    }, 2000);
}

// Uncomment the line below to show sample messages on load
// addSampleMessages();