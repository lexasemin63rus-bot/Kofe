const tg = window.Telegram ? window.Telegram.WebApp : null;
if (tg) {
  tg.ready();
  tg.expand();
}

const state = {
  menu: [],
  cart: {}, // itemId -> qty
  activeGroup: null
};

const tabsEl = document.getElementById('tabs');
const menuEl = document.getElementById('menu');
const cartCountEl = document.getElementById('cart-count');
const cartItemsEl = document.getElementById('cart-items');
const cartTotalEl = document.getElementById('cart-total');
const cartOverlay = document.getElementById('cart-overlay');
const toastEl = document.getElementById('toast');
const phoneInput = document.getElementById('phone');
const commentInput = document.getElementById('comment');

function money(n) {
  return `${n} ₽`;
}

function showToast(text) {
  toastEl.textContent = text;
  toastEl.classList.remove('hidden');
  setTimeout(() => toastEl.classList.add('hidden'), 3000);
}

function cartTotal() {
  return Object.entries(state.cart).reduce((sum, [id, qty]) => {
    const item = state.menu.find((m) => m.id === id);
    return item ? sum + item.price * qty : sum;
  }, 0);
}

function cartCount() {
  return Object.values(state.cart).reduce((a, b) => a + b, 0);
}

function setQty(id, qty) {
  if (qty <= 0) {
    delete state.cart[id];
  } else {
    state.cart[id] = qty;
  }
  renderMenu();
  renderCart();
  syncMainButton();
}

const groupEmoji = {
  'Сендвичи': '🥪'
};

function renderTabs() {
  const groups = [...new Set(state.menu.map((item) => item.group))];
  tabsEl.innerHTML = '';

  groups.forEach((group) => {
    const btn = document.createElement('button');
    btn.className = 'tab-btn' + (group === state.activeGroup ? ' active' : '');
    btn.textContent = `${groupEmoji[group] || '☕️'} ${group}`;
    btn.onclick = () => {
      state.activeGroup = group;
      renderTabs();
      renderMenu();
    };
    tabsEl.appendChild(btn);
  });
}

function renderMenu() {
  const groupItems = state.menu.filter((item) => item.group === state.activeGroup);
  const categories = [...new Set(groupItems.map((item) => item.category))];
  menuEl.innerHTML = '';

  categories.forEach((category) => {
    const title = document.createElement('div');
    title.className = 'category-title';
    title.textContent = category;
    menuEl.appendChild(title);

    groupItems
      .filter((item) => item.category === category)
      .forEach((item) => {
        const qty = state.cart[item.id] || 0;
        const row = document.createElement('div');
        row.className = 'item';
        row.innerHTML = `
          <div class="item-emoji">${item.emoji}</div>
          <div class="item-info">
            <div class="item-name">${item.name}</div>
            <div class="item-desc">${item.description}</div>
            <div class="item-price">${money(item.price)}</div>
          </div>
          <div class="item-actions"></div>
        `;
        const actions = row.querySelector('.item-actions');
        if (qty > 0) {
          const controls = document.createElement('div');
          controls.className = 'qty-controls';
          controls.innerHTML = `
            <button class="qty-btn" data-action="dec">−</button>
            <span class="qty-value">${qty}</span>
            <button class="qty-btn" data-action="inc">+</button>
          `;
          controls.querySelector('[data-action="dec"]').onclick = () => setQty(item.id, qty - 1);
          controls.querySelector('[data-action="inc"]').onclick = () => setQty(item.id, qty + 1);
          actions.appendChild(controls);
        } else {
          const btn = document.createElement('button');
          btn.className = 'add-btn';
          btn.textContent = 'Добавить';
          btn.onclick = () => setQty(item.id, 1);
          actions.appendChild(btn);
        }
        menuEl.appendChild(row);
      });
  });
}

function renderCart() {
  cartCountEl.textContent = cartCount();
  cartTotalEl.textContent = money(cartTotal());

  const entries = Object.entries(state.cart);
  if (entries.length === 0) {
    cartItemsEl.innerHTML = '<div class="cart-empty">Корзина пуста</div>';
    return;
  }

  cartItemsEl.innerHTML = '';
  entries.forEach(([id, qty]) => {
    const item = state.menu.find((m) => m.id === id);
    if (!item) return;
    const row = document.createElement('div');
    row.className = 'cart-row';
    row.innerHTML = `
      <div class="cart-row-name">${item.emoji} ${item.name}</div>
      <div class="qty-controls">
        <button class="qty-btn" data-action="dec">−</button>
        <span class="qty-value">${qty}</span>
        <button class="qty-btn" data-action="inc">+</button>
      </div>
      <div class="cart-row-price">${money(item.price * qty)}</div>
    `;
    row.querySelector('[data-action="dec"]').onclick = () => setQty(id, qty - 1);
    row.querySelector('[data-action="inc"]').onclick = () => setQty(id, qty + 1);
    cartItemsEl.appendChild(row);
  });
}

function syncMainButton() {
  if (!tg) return;
  const total = cartTotal();
  if (total > 0) {
    tg.MainButton.setText(`Оформить заказ · ${money(total)}`);
    tg.MainButton.show();
  } else {
    tg.MainButton.hide();
  }
}

async function submitOrder() {
  const items = Object.entries(state.cart).map(([id, qty]) => ({ id, qty }));
  if (items.length === 0) return;

  if (tg) tg.MainButton.showProgress();

  try {
    const res = await fetch('/api/order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        initData: tg ? tg.initData : '',
        items,
        phone: phoneInput.value,
        comment: commentInput.value
      })
    });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Не удалось оформить заказ');
    }

    state.cart = {};
    phoneInput.value = '';
    commentInput.value = '';
    renderMenu();
    renderCart();
    syncMainButton();
    closeCart();
    showToast(`Заказ №${data.orderId} оформлен! Мы уже готовим ☕️`);
    if (tg && tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
  } catch (err) {
    showToast(err.message);
    if (tg && tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('error');
  } finally {
    if (tg) tg.MainButton.hideProgress();
  }
}

function openCart() {
  cartOverlay.classList.remove('hidden');
}
function closeCart() {
  cartOverlay.classList.add('hidden');
}

document.getElementById('cart-toggle').onclick = openCart;
document.getElementById('cart-close').onclick = closeCart;
cartOverlay.onclick = (e) => {
  if (e.target === cartOverlay) closeCart();
};

if (tg) {
  tg.MainButton.onClick(submitOrder);
}

async function init() {
  const res = await fetch('/api/menu');
  state.menu = await res.json();
  state.activeGroup = state.menu[0] ? state.menu[0].group : null;
  renderTabs();
  renderMenu();
  renderCart();
  syncMainButton();
}

init();
