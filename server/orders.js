// Простое хранилище заказов в памяти процесса — для маленькой кофейни этого достаточно,
// счётчик используется как человекочитаемый номер заказа.
let counter = 0;
const orders = [];

function createOrder(data) {
  counter += 1;
  const order = { id: counter, createdAt: new Date().toISOString(), ...data };
  orders.push(order);
  return order;
}

module.exports = { createOrder };
