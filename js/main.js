'use strict';

document.documentElement.classList.remove('no-js');

const header = document.querySelector('.navbar');
const layoutRule = [...document.querySelector('#theme-style').sheet.cssRules].find((rule) => rule.selectorText === ':root');
function syncHeaderHeight() {
  // Keep anchor offsets and the sticky filter below the wrapping mobile navbar.
  layoutRule.style.setProperty('--measured-header-height', `${Math.ceil(header.getBoundingClientRect().height)}px`);
}
syncHeaderHeight();
new ResizeObserver(syncHeaderHeight).observe(header);

const productById = new Map(products.map((product) => [product.id, product]));
const selectedId = new URLSearchParams(location.search).get('id');
const selectedProduct = productById.get(selectedId || 'notebook');
const categoryName = (product) => product.category === 'paper' ? 'Бумага и хранение' : 'Для письма';

if (document.querySelector('#product-detail')) {
  if (!selectedProduct) {
    document.querySelector('#product-detail').hidden = true;
    document.querySelector('#product-error').hidden = false;
    document.title = 'Товар не найден — Канцтовары';
  } else {
    const product = selectedProduct;
    document.title = `${product.name} — Канцтовары`;
    const image = document.querySelector('#product-image');
    image.src = `images/${product.image}`;
    image.alt = product.alt;
    for (const field of ['title', 'description', 'purpose', 'spec', 'material', 'unit']) {
      document.querySelector(`#product-${field}`).textContent = field === 'title' ? product.name : product[field];
    }
    document.querySelector('#product-category').textContent = categoryName(product);
    document.querySelector('#product-price').textContent = `${product.price} ₽ / ${product.unit}`;
    document.querySelector('#product-order-link').href = `order.html?id=${product.id}`;
    document.querySelector('#product-quick-order').dataset.product = product.id;
  }
}

const filtersForm = document.querySelector('#filters-form');
if (filtersForm) {
  const tiles = [...document.querySelectorAll('#catalog-grid .product-tile')];
  const priceFrom = filtersForm.elements.namedItem('price-from');
  const priceTo = filtersForm.elements.namedItem('price-to');
  const error = document.querySelector('#filters-error');
  filtersForm.querySelector('[type="submit"]').disabled = false;

  function applyFilters() {
    const categories = [...filtersForm.querySelectorAll('[name="category"]:checked')].map((input) => input.value);
    const min = priceFrom.value === '' ? 0 : Number(priceFrom.value);
    const max = priceTo.value === '' ? Infinity : Number(priceTo.value);
    let count = 0;
    tiles.forEach((tile) => {
      const product = productById.get(tile.dataset.productId);
      const visible = (!categories.length || categories.includes(product.category)) && product.price >= min && product.price <= max;
      tile.hidden = !visible;
      if (visible) count += 1;
    });
    document.querySelector('#results-count').textContent = `Найдено товаров: ${count}`;
    document.querySelector('#catalog-empty').hidden = count !== 0;
  }
  filtersForm.addEventListener('input', () => {
    priceTo.setCustomValidity('');
    error.hidden = true;
  });
  filtersForm.addEventListener('submit', (event) => {
    event.preventDefault();
    priceTo.setCustomValidity('');
    if (priceFrom.value !== '' && priceTo.value !== '' && Number(priceFrom.value) > Number(priceTo.value)) {
      priceTo.setCustomValidity('Цена «До» должна быть не меньше цены «От».');
      error.textContent = priceTo.validationMessage;
      error.hidden = false;
    }
    if (filtersForm.reportValidity()) applyFilters();
  });
  filtersForm.addEventListener('reset', () => {
    priceTo.setCustomValidity('');
    error.hidden = true;
    // The browser restores field defaults after dispatching the reset event.
    setTimeout(applyFilters, 0);
  });
}

const success = document.querySelector('#order-success');
const orderModal = document.querySelector('#order-modal');
let focusSuccessAfterClose = false;

function updateTotal(form) {
  const product = productById.get(form.elements.namedItem('product').value);
  const quantity = form.elements.namedItem('quantity');
  form.querySelector('[data-total]').textContent = product && quantity.validity.valid ? `${product.price * Number(quantity.value)} ₽` : '—';
}

function resetOrderForm(form, productId) {
  form.reset();
  form.classList.remove('was-validated');
  form.querySelectorAll('[aria-invalid]').forEach((field) => field.removeAttribute('aria-invalid'));
  form.elements.namedItem('name').setCustomValidity('');
  form.querySelector('[data-form-error]').hidden = true;
  form.elements.namedItem('product').value = productId;
  updateTotal(form);
}

document.querySelectorAll('[data-order-form]').forEach((form) => {
  form.querySelector('[type="submit"]').disabled = false;
  updateTotal(form);
  form.addEventListener('input', (event) => {
    const field = event.target;
    if (field.name === 'name') field.setCustomValidity('');
    if (form.classList.contains('was-validated') && field.willValidate) field.setAttribute('aria-invalid', String(!field.validity.valid));
    updateTotal(form);
  });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const name = form.elements.namedItem('name');
    name.setCustomValidity(name.value.trim().length < 2 ? 'Введите минимум два символа без крайних пробелов.' : '');
    const fields = [...form.elements].filter((field) => field.willValidate);
    fields.forEach((field) => field.setAttribute('aria-invalid', String(!field.validity.valid)));
    form.classList.add('was-validated');
    const valid = form.checkValidity();
    form.querySelector('[data-form-error]').hidden = valid;
    if (!valid) {
      fields.find((field) => !field.validity.valid).focus();
      return;
    }
    const product = productById.get(form.elements.namedItem('product').value);
    const quantity = Number(form.elements.namedItem('quantity').value);
    success.textContent = `Проверка пройдена: ${product.name}, количество ${quantity}, сумма ${product.price * quantity} ₽. Это учебная демонстрация: данные никуда не отправлялись и не сохранялись, заказ не создавался.`;
    success.hidden = false;
    resetOrderForm(form, product.id);
    if (orderModal.contains(form)) {
      focusSuccessAfterClose = true;
      bootstrap.Modal.getInstance(orderModal).hide();
    } else {
      success.focus();
    }
  });
});

if (document.querySelector('#order-product')) {
  if (selectedId && !selectedProduct) document.querySelector('#order-product-error').hidden = false;
  resetOrderForm(document.querySelector('#order-product').form, selectedProduct?.id || 'notebook');
}

orderModal.addEventListener('show.bs.modal', (event) => {
  const product = productById.get(event.relatedTarget?.dataset.product) || products[0];
  resetOrderForm(orderModal.querySelector('form'), product.id);
  document.querySelector('#full-order-link').href = `order.html?id=${product.id}`;
  success.hidden = true;
  focusSuccessAfterClose = false;
});
orderModal.addEventListener('shown.bs.modal', () => document.querySelector('#quick-name').focus());
orderModal.addEventListener('hidden.bs.modal', () => {
  // Bootstrap first restores the trigger; move to the result after that handler.
  if (focusSuccessAfterClose) requestAnimationFrame(() => success.focus());
  focusSuccessAfterClose = false;
});
orderModal.querySelector('[name="product"]').addEventListener('change', (event) => {
  document.querySelector('#full-order-link').href = `order.html?id=${event.target.value}`;
});
