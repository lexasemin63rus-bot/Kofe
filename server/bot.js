const { Telegraf, Markup } = require('telegraf');

function createBot({ botToken, miniAppUrl }) {
  const bot = new Telegraf(botToken);

  bot.start((ctx) => {
    if (miniAppUrl) {
      return ctx.reply(
        'Добро пожаловать в нашу кофейню ☕️\nВыберите напитки и оформите заказ прямо в приложении:',
        Markup.keyboard([Markup.button.webApp('☕️ Открыть меню', miniAppUrl)]).resize()
      );
    }
    return ctx.reply('Бот запущен, но MINI_APP_URL ещё не настроен — добавьте его в .env.');
  });

  bot.help((ctx) => ctx.reply('Нажмите «Открыть меню», выберите напитки, добавьте в корзину и оформите заказ.'));

  return bot;
}

module.exports = createBot;
