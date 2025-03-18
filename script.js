const messagesDiv = document.getElementById('messages');
const userInput = document.getElementById('user-input');
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');

const SERVER_URL = 'http://127.0.0.1:5000'; // Замените на URL вашего развернутого сервера (если развернете)
let lastUpdateTime = null;

function displayMessage(message) {
    const messageDiv = document.createElement('div');
    const timestamp = new Date(message.timestamp).toLocaleTimeString();
    messageDiv.textContent = `(${timestamp}) ${message.user}: ${message.text}`;
    messagesDiv.appendChild(messageDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight; // Прокрутка вниз
}

async function getNewMessages() {
    const url = lastUpdateTime
        ? `${SERVER_URL}/get?since=${lastUpdateTime}`
        : `${SERVER_URL}/get`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            console.error('Ошибка при получении сообщений:', response.status);
            return;
        }
        const newMessages = await response.json();
        newMessages.forEach(displayMessage);
        if (newMessages.length > 0) {
            lastUpdateTime = newMessages.slice(-1)[0].timestamp;
        }
    } catch (error) {
        console.error('Ошибка сети при получении сообщений:', error);
    }
}

async function sendMessage() {
    const user = userInput.value.trim();
    const text = messageInput.value.trim();

    if (!user || !text) {
        alert('Пожалуйста, введите имя и сообщение.');
        return;
    }

    try {
        const response = await fetch(`${SERVER_URL}/send`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ user: user, text: text }),
        });

        if (!response.ok) {
            console.error('Ошибка при отправке сообщения:', response.status);
            return;
        }

        userInput.value = '';
        messageInput.value = '';
        getNewMessages(); // После отправки сразу запрашиваем обновления
    } catch (error) {
        console.error('Ошибка сети при отправке сообщения:', error);
    }
}

sendButton.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        sendMessage();
    }
});

// Регулярно опрашиваем сервер на предмет новых сообщений
setInterval(getNewMessages, 3000); // Запрашивать новые сообщения каждые 3 секунды

// Получаем начальные сообщения при загрузке страницы
getNewMessages();
