const express = require('express');
const menu = require('../menu');
const { createOrder } = require('../orders');
const validateInitData = require('../validateInitData');

const menuById = new Map(menu.map((item) => [item.id, item]));

function formatPrice(value) {
  return `${value} ₽`;
}

function buildOrderRouter({ bot, botToken, adminChatId }) {
  const router = express.Router();

  router.post('/order', async (req, res) => {
    const { initData, items, comment, phone } = req.body || {};

    const auth = validateInitData(initData, botToken);
    if (!auth) {
      return res.status(401).json({ error: 'Не удалось подтвердить пользователя Telegram. Откройте приложение через бота.' });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Корзина пуста.' });
    }

    // Цены и наличие позиций пересчитываем на сервере — клиенту не доверяем.
    const orderItems = [];
    let total = 0;
    for (const { id, qty } of items) {
      const menuItem = menuById.get(id);
      const quantity = Number(qty);
      if (!menuItem || !Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
        return res.status(400).json({ error: `Некорректная позиция в заказе: ${id}` });
      }
      const lineTotal = menuItem.price * quantity;
      total += lineTotal;
      orderItems.push({ ...menuItem, qty: quantity, lineTotal });
    }

    const customer = auth.user || {};
    const order = createOrder({
      items: orderItems,
      total,
      comment: typeof comment === 'string' ? comment.slice(0, 500) : '',
      phone: typeof phone === 'string' ? phone.slice(0, 32) : '',
      customer: {
        id: customer.id,
        firstName: customer.first_name,
        lastName: customer.last_name,
        username: customer.username
      }
    });

    const itemsList = order.items
      .map((item) => `• ${item.emoji} ${item.name} × ${item.qty} — ${formatPrice(item.lineTotal)}`)
      .join('\n');

    const customerName = [customer.first_name, customer.last_name].filter(Boolean).join(' ') || 'Гость';
    const usernameLine = customer.username ? `@${customer.username}` : 'без username';

    const adminText = [
      `☕️ Новый заказ №${order.id}`,
      '',
      itemsList,
      '',
      `Итого: ${formatPrice(order.total)}`,
      '',
      `Клиент: ${customerName} (${usernameLine})`,
      order.phone ? `Телефон: ${order.phone}` : null,
      order.comment ? `Комментарий: ${order.comment}` : null
    ]
      .filter(Boolean)
      .join('\n');

    try {
      if (adminChatId) {
        await bot.telegram.sendMessage(adminChatId, adminText);
      }
      if (customer.id) {
        const customerText = [
          `Спасибо за заказ, ${customerName}! ✅`,
          '',
          itemsList,
          '',
          `Итого: ${formatPrice(order.total)}`,
          '',
          `Номер заказа: №${order.id}`,
          'Мы свяжемся с вами, если потребуется уточнить детали. Ждём вас в кофейне!'
        ].join('\n');
        await bot.telegram.sendMessage(customer.id, customerText);
      }
    } catch (err) {
      console.error('Не удалось отправить уведомление в Telegram:', err.message);
      return res.status(502).json({ error: 'Заказ сохранён, но не удалось отправить уведомление в Telegram.' });
    }

    res.json({ ok: true, orderId: order.id, total: order.total });
  });

  return router;
}

module.exports = buildOrderRouter;
