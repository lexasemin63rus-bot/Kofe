const crypto = require('crypto');

/**
 * Проверяет подпись initData, которую Telegram WebApp передаёт на фронтенде,
 * чтобы исключить подделку заказов от имени случайных пользователей.
 * Алгоритм из офиц. документации: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
function validateInitData(initData, botToken) {
  if (!initData || !botToken) return null;

  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) return null;
  params.delete('hash');

  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const computedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  if (computedHash !== hash) return null;

  const userRaw = params.get('user');
  return {
    user: userRaw ? JSON.parse(userRaw) : null,
    authDate: params.get('auth_date')
  };
}

module.exports = validateInitData;
