# ☕️ Кофейня — Telegram Mini App

Мини-приложение для маленькой кофейни: меню, корзина, оформление заказа. При оформлении заказа:
- в Telegram владельцу/бариста (`ADMIN_CHAT_ID`) приходит уведомление со списком позиций и суммой;
- клиенту в чат с ботом приходит подтверждение заказа.

## Стек

- **Backend:** Node.js, Express, [Telegraf](https://telegraf.js.org/)
- **Frontend:** ванильный HTML/CSS/JS + [Telegram WebApp JS SDK](https://core.telegram.org/bots/webapps)
- Данные (меню, заказы) — в памяти процесса, без базы данных. Для продакшена меню и заказы можно вынести в БД (см. «Дальнейшие шаги»).

## Структура проекта

```
server/
  index.js            # точка входа: express + запуск бота
  bot.js               # логика Telegram-бота (команда /start открывает Mini App)
  menu.js              # меню кофейни (позиции, цены)
  orders.js            # хранилище заказов в памяти
  validateInitData.js  # проверка подписи Telegram WebApp initData
  routes/order.js      # POST /api/order — приём и обработка заказа
public/
  index.html, style.css, app.js   # интерфейс Mini App (меню + корзина)
```

## 1. Создание бота

1. Откройте [@BotFather](https://t.me/BotFather) в Telegram, отправьте `/newbot` и следуйте инструкциям.
2. Скопируйте выданный токен — это `BOT_TOKEN`.
3. Узнайте свой `chat_id` (куда будут приходить уведомления о заказах): напишите [@userinfobot](https://t.me/userinfobot), он пришлёт ваш ID. Это `ADMIN_CHAT_ID`. Можно указать и ID группы/канала.

## 2. Установка и запуск локально

```bash
npm install
cp .env.example .env
```

Заполните `.env`:

```
BOT_TOKEN=<токен от BotFather>
ADMIN_CHAT_ID=<ваш chat_id>
MINI_APP_URL=<см. шаг 3>
PORT=3000
```

Запуск:

```bash
npm start
```

Сервер поднимется на `http://localhost:3000`, бот запустится в режиме long polling.

## 3. Публичный HTTPS-адрес для Mini App

Telegram требует, чтобы кнопка WebApp вела на **HTTPS**-адрес. Для локальной разработки удобно использовать туннель, например [ngrok](https://ngrok.com/):

```bash
ngrok http 3000
```

Скопируйте выданный `https://xxxx.ngrok-free.app` в `MINI_APP_URL` в `.env` и перезапустите сервер.

Для продакшена задеплойте проект на любой хостинг с постоянным HTTPS-адресом (Render, Railway, VPS + Nginx/Caddy и т.п.) и укажите этот адрес в `MINI_APP_URL`.

## 4. Настройка кнопки меню в BotFather (опционально, но рекомендуется)

В @BotFather: `/mybots` → выберите бота → `Bot Settings` → `Menu Button` → `Configure Menu Button` → вставьте `MINI_APP_URL`. Тогда кнопка «Открыть меню» будет всегда доступна рядом с полем ввода, а не только по команде `/start`.

## 5. Как это работает

1. Пользователь пишет боту `/start` → получает кнопку «☕️ Открыть меню» (Telegram WebApp).
2. Открывается `public/index.html` — список напитков и десертов из `server/menu.js` (`GET /api/menu`).
3. Пользователь добавляет позиции в корзину, при необходимости указывает телефон/комментарий.
4. Кнопка `MainButton` внизу экрана Telegram показывает сумму и по нажатию отправляет `POST /api/order`.
5. Сервер:
   - проверяет подпись `initData` (`server/validateInitData.js`) — гарантирует, что заказ пришёл из реального Telegram-клиента, а не подделан;
   - пересчитывает цены по серверному меню (клиенту не доверяем);
   - отправляет уведомление в `ADMIN_CHAT_ID` и подтверждение клиенту через `bot.telegram.sendMessage`.

## Изменение меню

Отредактируйте массив в `server/menu.js` — добавьте/уберите позиции, поменяйте цены и описания. Frontend подхватит изменения автоматически при следующей загрузке.

## Дальнейшие шаги (по желанию)

- Вынести меню и заказы в базу данных (SQLite/PostgreSQL) вместо памяти процесса.
- Добавить админ-панель для управления меню и статусами заказов.
- Подключить приём оплаты через [Telegram Payments](https://core.telegram.org/bots/payments).
- Задеплоить через webhook вместо long polling для продакшен-нагрузки.
