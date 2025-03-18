const SERVER_URL = 'http://127.0.0.1:5000'; // Замените URL вашего сервера

const sidebar = document.getElementById('sidebar');
const chatContainer = document.getElementById('chat-container');
const usernameInput = document.getElementById('username-input');
const registerButton = document.getElementById('register-button');
const userListDiv = document.getElementById('user-list');
const chatHeader = document.getElementById('chat-header');
const currentChatUserTitle = document.getElementById('current-chat-user');
const messagesDiv = document.getElementById('messages');
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');

let currentUserId = null;
let currentChatUserId = null;
let lastPrivateUpdateTime = {}; // Отслеживаем время последнего обновления для каждого чата
let onlineUsers = {};

async function register() {
    const username = usernameInput.value.trim();
    if (!username) {
        alert('Введите имя пользователя.');
        return;
    }
    try {
        const response = await fetch(`${SERVER_URL}/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username: username }),
        });
        if (!response.ok) {
            console.error('Ошибка регистрации:', response.status);
            return;
        }
        const data = await response.json();
        currentUserId = data.user_id;
        sidebar.style.display = 'none';
        chatContainer.style.display = 'flex';
        startPolling();
        console.log('Зарегистрирован как:', currentUserId);
    } catch (error) {
        console.error('Ошибка сети при регистрации:', error);
    }
}

async function fetchOnlineUsers() {
    if (!currentUserId) return;
    try {
        const response = await fetch(`${SERVER_URL}/users?user_id=${currentUserId}¤t_user_id=${currentUserId}`);
        if (!response.ok) {
            console.error('Ошибка получения списка пользователей:', response.status);
            return;
        }
        const users = await response.json();
        updateUserList(users);
    } catch (error) {
        console.error('Ошибка сети при получении списка пользователей:', error);
    }
}

function updateUserList(users) {
    userListDiv.innerHTML = '';
    onlineUsers = users;
    for (const userId in users) {
        const userItem = document.createElement('div');
        userItem.classList.add('user-list-item');
        userItem.textContent = users?.[userId];
        userItem.addEventListener('click', () => openPrivateChat(userId, users?.[userId]));
        if (userId === currentChatUserId) {
            userItem.classList.add('active');
        }
        userListDiv.appendChild(userItem);
    }
}

function openPrivateChat(userId, username) {
    currentChatUserId = userId;
    currentChatUserTitle.textContent = `Чат с ${username}`;
    messagesDiv.innerHTML = '';
    lastPrivateUpdateTime?.[userId] = null;
    fetchPrivateMessages(userId);
    // Обновляем подсветку в списке пользователей
    const userItems = document.querySelectorAll('.user-list-item');
    userItems.forEach(item => {
        item.classList.remove('active');
        if (item.textContent === username) {
            item.classList.add('active');
        }
    });
}

async function fetchPrivateMessages(otherUserId) {
    if (!currentUserId || !otherUserId) return;
    const since = lastPrivateUpdateTime?.[otherUserId];
    const url = since
        ? `${SERVER_URL}/get_private?user_id=${currentUserId}&other_user_id=${otherUserId}&since=${since}`
        : `${SERVER_URL}/get_private?user_id=${currentUserId}&other_user_id=${otherUserId}`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            console.error('Ошибка получения личных сообщений:', response.status);
            return;
        }
        const newMessages = await response.json();
        newMessages.forEach(displayPrivateMessage);
        if (newMessages.length > 0) {
            lastPrivateUpdateTime = { ...lastPrivateUpdateTime, [otherUserId]: newMessages.slice(-1)[0].timestamp };
        }
        if (currentChatUserId === otherUserId) {
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }
    } catch (error) {
        console.error('Ошибка сети при получении личных сообщений:', error);
    }
}

function displayPrivateMessage(message) {
    const messageDiv = document.createElement('div');
    const timestamp = new Date(message.timestamp).toLocaleTimeString();
    const sender = message.sender_id === currentUserId ? 'Вы' : onlineUsers?.[message.sender_id];
    messageDiv.textContent = `(${timestamp}) ${sender}: ${message.text}`;
    messagesDiv.appendChild(messageDiv);
}

async function sendPrivateMessage() {
    if (!currentUserId || !currentChatUserId) {
        alert('Выберите пользователя для начала чата.');
        return;
    }
    const text = messageInput.value.trim();
    if (!text) return;

    try {
        const response = await fetch(`${SERVER_URL}/send_private`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ sender_id: currentUserId, receiver_id: currentChatUserId, text: text }),
        });
        if (!response.ok) {
            console.error('Ошибка отправки личного сообщения:', response.status);
            return;
        }
        messageInput.value = '';
        fetchPrivateMessages(currentChatUserId); // После отправки сразу запрашиваем обновления
    } catch (error) {
        console.error('Ошибка сети при отправке личного сообщения:', error);
    }
}

function startPolling() {
    setInterval(fetchOnlineUsers, 3000); // Обновляем список пользователей
    setInterval(() => {
        if (currentChatUserId) {
            fetchPrivateMessages(currentChatUserId); // Обновляем текущий чат
        }
    }, 3000);
}

registerButton.addEventListener('click', register);
sendButton.addEventListener('click', sendPrivateMessage);
messageInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        sendPrivateMessage();
    }
});
