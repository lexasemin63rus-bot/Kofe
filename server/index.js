require('dotenv').config();
const path = require('path');
const express = require('express');
const createBot = require('./bot');
const buildOrderRouter = require('./routes/order');
const menu = require('./menu');

const { BOT_TOKEN, ADMIN_CHAT_ID, MINI_APP_URL, PORT = 3000 } = process.env;

if (!BOT_TOKEN) {
  console.error('BOT_TOKEN не задан. Создайте .env на основе .env.example и укажите токен от @BotFather.');
  process.exit(1);
}

const bot = createBot({ botToken: BOT_TOKEN, miniAppUrl: MINI_APP_URL });

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/api/menu', (req, res) => res.json(menu));
app.use('/api', buildOrderRouter({ bot, botToken: BOT_TOKEN, adminChatId: ADMIN_CHAT_ID }));

app.listen(PORT, () => {
  console.log(`Сервер запущен: http://localhost:${PORT}`);
});

bot
  .launch()
  .then(() => console.log('Telegram-бот запущен (long polling)'))
  .catch((err) => console.error('Не удалось запустить бота:', err.message));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
