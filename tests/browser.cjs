const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:8818/';
const output = process.env.TEST_OUTPUT_DIR || '/private/tmp/kr2-browser-qa';
const url = (file) => new URL(file, base).href;

(async () => {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
  const page = await browser.newPage({ reducedMotion: 'reduce' });
  const errors = [];
  const checks = [];
  const ids = ['notebook', 'folder', 'pen', 'pencil', 'notepad', 'paper', 'eraser', 'highlighter', 'ruler', 'sharpener', 'sticky-notes', 'clips'];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('requestfailed', (request) => errors.push(`${request.url()}: ${request.failure()?.errorText}`));
  let formPosts = 0;
  page.on('request', (request) => { if (request.method() === 'POST') formPosts += 1; });
  async function load(file) {
    await page.goto(url(file));
    await page.evaluate(() => document.fonts.ready);
    await page.locator('img').evaluateAll((images) => Promise.all(images.map((image) => { image.loading = 'eager'; return image.decode(); })));
  }
  async function fillForm(prefix) {
    await page.locator(`#${prefix}-name`).fill('Тестовый студент');
    await page.locator(`#${prefix}-email`).fill('student@example.invalid');
    await page.locator(`#${prefix}-phone`).fill('+7 (900) 000-00-00');
    await page.locator(`#${prefix}-agreement`).check();
  }
  try {
    const links = new Set();
    const titles = new Set();
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 960 });
      for (const file of ['index.html', 'catalog.html', 'product.html', 'order.html']) {
        await load(file);
        const state = await page.evaluate(() => {
          const identifiers = [...document.querySelectorAll('[id]')].map((element) => element.id);
          return {
            overflow: document.documentElement.scrollWidth > innerWidth,
            duplicateIds: identifiers.filter((id, i) => identifiers.indexOf(id) !== i),
            main: document.querySelectorAll('main').length,
            h1: document.querySelectorAll('h1').length,
            description: document.querySelector('meta[name="description"]')?.content,
            images: [...document.images].every((img) => img.naturalWidth > 0 && img.alt),
            navFixed: getComputedStyle(document.querySelector('header')).position,
            mainTop: document.querySelector('main').getBoundingClientRect().top,
            headerBottom: document.querySelector('header').getBoundingClientRect().bottom,
            links: [...document.querySelectorAll('a[href]')].map((a) => a.href),
            bootstrap: typeof bootstrap.Modal,
          };
        });
        assert.equal(state.overflow, false, `${file} ${width}: overflow`);
        assert.deepEqual(state.duplicateIds, []);
        assert.equal(state.main, 1); assert.equal(state.h1, 1);
        assert.ok(state.description); assert.ok(state.images);
        assert.equal(state.navFixed, 'fixed'); assert.ok(state.mainTop >= state.headerBottom - 1);
        assert.equal(state.bootstrap, 'function');
        state.links.forEach((link) => links.add(link));
        titles.add(await page.title());
        await page.screenshot({ path: path.join(output, `${file.replace('.html', '')}-${width}.png`), fullPage: true });
        checks.push(`${file} ${width}px: layout, assets, metadata, fixed navbar, Bootstrap`);
      }
    }
    assert.equal(titles.size, 4);
    for (const href of links) {
      const address = new URL(href);
      if (address.origin !== new URL(base).origin) continue;
      const response = await page.request.get(href);
      assert.equal(response.status(), 200, href);
      if (address.hash) assert.ok((await response.text()).includes(`id="${address.hash.slice(1)}"`), href);
    }
    checks.push('All internal page links and fragment targets resolve');

    for (const id of ids) {
      await load(`product.html?id=${id}`);
      const data = await page.evaluate((id) => products.find((p) => p.id === id), id);
      assert.equal(await page.locator('h1').textContent(), data.name);
      assert.match(await page.title(), new RegExp(data.name));
      assert.equal(await page.locator('#product-image').getAttribute('alt'), data.alt);
      assert.equal(await page.locator('#product-price').textContent(), `${data.price} ₽ / ${data.unit}`);
      await page.locator('#product-order-link').click();
      assert.equal(await page.locator('#order-product').inputValue(), id);
      assert.equal(await page.locator('[data-order-form]').first().locator('[data-total]').textContent(), `${data.price} ₽`);
    }
    await page.goto(url('product.html?id=unknown'));
    assert.ok(await page.locator('#product-error').isVisible());
    assert.equal(await page.locator('#product-detail').isVisible(), false);
    await page.goto(url('order.html?id=unknown'));
    assert.ok(await page.locator('#order-product-error').isVisible());
    assert.equal(await page.locator('#order-product').inputValue(), 'notebook');
    checks.push('Twelve product pages → selected order item; unknown IDs handled');

    await load('catalog.html');
    const visibleCount = () => page.locator('#catalog-grid .product-tile:visible').count();
    assert.equal(await visibleCount(), 12);
    const tableRows = page.locator('#comparison tbody tr');
    assert.equal(await tableRows.count(), 12);
    assert.equal(await page.locator('#comparison thead th[scope="col"]').count(), 7);
    const names = await page.locator('#catalog-grid h3').allTextContents();
    assert.deepEqual(await page.locator('#comparison tbody th[scope="row"]').allTextContents(), names);
    const cardPrices = await page.evaluate(() => [...document.querySelectorAll('#catalog-grid .product-tile')].map((tile) => products.find((p) => p.id === tile.dataset.productId).price));
    assert.deepEqual(await tableRows.locator('td:last-child').allTextContents(), cardPrices.map(String));
    await page.getByLabel('Для письма', { exact: true }).check();
    await page.getByRole('button', { name: 'Применить', exact: true }).click();
    assert.equal(await visibleCount(), 6);
    assert.equal(await tableRows.count(), 12);
    await page.locator('#price-to').fill('35');
    await page.getByRole('button', { name: 'Применить' }).click();
    assert.equal(await visibleCount(), 1);
    await page.locator('#price-from').fill('50');
    await page.getByRole('button', { name: 'Применить' }).click();
    assert.ok(await page.locator('#filters-error').isVisible());
    assert.equal(await visibleCount(), 1);
    await page.locator('#price-from').fill('41');
    await page.locator('#price-to').fill('49');
    await page.getByRole('button', { name: 'Применить' }).click();
    assert.equal(await visibleCount(), 0);
    assert.ok(await page.locator('#catalog-empty').isVisible());
    await page.getByRole('button', { name: 'Сбросить' }).click();
    await page.waitForFunction(() => document.querySelectorAll('#catalog-grid .product-tile:not([hidden])').length === 12);
    assert.equal(await page.locator('#price-from').inputValue(), '');
    assert.equal(await page.getByLabel('Для письма', { exact: true }).isChecked(), false);
    assert.equal(await page.locator('#catalog-empty').isVisible(), false);
    await page.getByLabel('Бумага и хранение', { exact: true }).check();
    await page.getByRole('button', { name: 'Применить' }).click();
    assert.equal(await visibleCount(), 6);
    await page.getByRole('button', { name: 'Сбросить' }).click();
    await page.waitForFunction(() => document.querySelectorAll('#catalog-grid .product-tile:not([hidden])').length === 12);
    checks.push('Filters: both categories, combined prices, invalid range, empty, reset; comparison consistency');

    const firstFaq = page.locator('.accordion-button').first();
    await firstFaq.focus(); await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.querySelector('#faq-answer-1').classList.contains('show'));
    assert.equal(await firstFaq.getAttribute('aria-expanded'), 'true');
    await page.locator('.accordion-button').nth(1).click();
    await page.waitForFunction(() => document.querySelector('#faq-answer-2').classList.contains('show') && !document.querySelector('#faq-answer-1').classList.contains('show'));
    assert.equal(await page.locator('.accordion-button').count(), 6);
    await page.locator('#faq').screenshot({ path: path.join(output, 'faq-open.png') });
    checks.push('FAQ: six questions, keyboard toggle, ARIA state, one expanded answer');

    for (const width of [768, 1440]) {
      await page.setViewportSize({ width, height: 960 });
      await load('catalog.html');
      await page.evaluate(() => window.scrollTo(0, 620));
      const positions = await page.evaluate(() => ({
        filter: document.querySelector('.catalog-filter').getBoundingClientRect().top,
        header: document.querySelector('header').getBoundingClientRect().bottom,
        position: getComputedStyle(document.querySelector('.catalog-filter')).position,
      }));
      assert.equal(positions.position, 'sticky');
      assert.ok(Math.abs(positions.filter - positions.header - 16) < 2, JSON.stringify(positions));
      await page.screenshot({ path: path.join(output, `sticky-${width}.png`) });
    }
    await page.setViewportSize({ width: 1024, height: 500 });
    await load('catalog.html');
    const panel = page.locator('.catalog-filter');
    assert.ok(await panel.evaluate((el) => el.scrollHeight > el.clientHeight));
    await page.getByRole('button', { name: 'Сбросить' }).focus();
    assert.ok(await page.getByRole('button', { name: 'Сбросить' }).evaluate((el) => {
      const rect = el.getBoundingClientRect(); return rect.bottom <= innerHeight && rect.top >= document.querySelector('header').getBoundingClientRect().bottom;
    }));
    checks.push('Sticky filter stays below navbar; scrollable controls on short screen');

    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 960 });
      await load('catalog.html');
      if (width === 390) {
        assert.ok(await panel.evaluate((el) => ['static', 'relative'].includes(getComputedStyle(el).position)));
        const region = page.getByRole('region', { name: 'Таблица сравнения товаров' });
        assert.ok(await region.evaluate((el) => el.scrollWidth > el.clientWidth));
        await region.focus(); await page.keyboard.press('ArrowRight');
        await page.waitForFunction(() => document.querySelector('.comparison').scrollLeft > 0);
        await region.screenshot({ path: path.join(output, 'table-mobile.png') });
        await page.locator('.navbar-toggler').click();
        await page.waitForFunction(() => document.querySelector('#main-nav').classList.contains('show'));
        assert.equal(await page.locator('.navbar-toggler').getAttribute('aria-expanded'), 'true');
        await page.getByRole('link', { name: 'Вопросы', exact: true }).click();
        assert.ok(page.url().endsWith('#faq'));
        await page.locator('.navbar-toggler').click();
        await page.waitForFunction(() => !document.querySelector('#main-nav').classList.contains('show'));
        await load('catalog.html');
      }
      const trigger = page.locator('[data-product="eraser"]');
      await trigger.click();
      await page.waitForFunction(() => document.querySelector('#order-modal').classList.contains('show'));
      await page.waitForFunction(() => document.activeElement.id === 'quick-name');
      assert.equal(await page.locator('#quick-product').inputValue(), 'eraser');
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => getComputedStyle(document.querySelector('#order-modal')).display === 'none');
      await page.waitForFunction(() => document.activeElement?.dataset.product === 'eraser');
      assert.ok(await trigger.evaluate((el) => el === document.activeElement));
      await trigger.click();
      const quick = page.locator('#order-modal form');
      await quick.getByRole('button', { name: 'Проверить заявку' }).click();
      assert.equal(await page.locator('#quick-name').getAttribute('aria-invalid'), 'true');
      await fillForm('quick');
      await page.locator('#quick-name').fill('  ');
      await quick.getByRole('button', { name: 'Проверить заявку' }).click();
      assert.equal(await page.locator('#quick-name').getAttribute('aria-invalid'), 'true');
      await page.locator('#quick-name').fill('Тестовый студент');
      await page.locator('#quick-quantity').fill('2');
      assert.equal(await quick.locator('[data-total]').textContent(), '100 ₽');
      await page.locator('#order-modal').screenshot({ path: path.join(output, `modal-${width}.png`) });
      await quick.getByRole('button', { name: 'Проверить заявку' }).click();
      await page.waitForFunction(() => document.activeElement.id === 'order-success');
      assert.match(await page.locator('#order-success').textContent(), /Ластик, количество 2, сумма 100 ₽/);
      assert.match(await page.locator('#order-success').textContent(), /никуда не отправлялись/);
      await trigger.click();
      await page.waitForFunction(() => document.activeElement.id === 'quick-name');
      assert.equal(await page.locator('#quick-name').inputValue(), '');
      assert.equal(await page.locator('#quick-name').getAttribute('aria-invalid'), null);
      await page.locator('#quick-product').selectOption('highlighter');
      assert.equal(await page.locator('#full-order-link').getAttribute('href'), 'order.html?id=highlighter');
      await page.locator('#full-order-link').click();
      assert.equal(await page.locator('#order-product').inputValue(), 'highlighter');
      const order = page.locator('form').first();
      await fillForm('order');
      await page.locator('#order-quantity').fill('100');
      await order.getByRole('button', { name: 'Проверить заявку' }).click();
      assert.equal(await page.locator('#order-quantity').getAttribute('aria-invalid'), 'true');
      await page.locator('#order-quantity').fill('3');
      assert.equal(await order.locator('[data-total]').textContent(), '270 ₽');
      await order.getByRole('button', { name: 'Проверить заявку' }).click();
      assert.match(await page.locator('#order-success').textContent(), /Текстовыделитель, количество 3, сумма 270 ₽/);
      assert.equal(await page.locator('#order-name').inputValue(), '');
      await page.getByRole('link', { name: 'Наверх', exact: true }).click();
      await page.waitForFunction(() => scrollY <= 1);
      checks.push(`Forms ${width}px: product, validation, total, Escape/focus, repeat, modal → full form, no POST; top link`);
    }
    assert.equal(formPosts, 0);
    const noJs = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 960 } });
    const fallback = await noJs.newPage();
    await fallback.goto(url('catalog.html'));
    assert.equal(await fallback.locator('#catalog-grid .product-tile').count(), 12);
    assert.equal(await fallback.locator('#comparison tbody tr').count(), 12);
    assert.ok(await fallback.locator('#faq-answer-1').isVisible());
    assert.equal(await fallback.locator('button[type="submit"]').first().isDisabled(), true);
    assert.ok(await fallback.getByRole('link', { name: 'Каталог', exact: true }).isVisible());
    await noJs.close();
    checks.push('Without JavaScript: twelve static cards, table, FAQ text, links; submission disabled');
    assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify({ passed: true, checks, formPosts, errors }, null, 2));
    console.log(JSON.stringify({ passed: true, checks, formPosts, output }, null, 2));
  } finally {
    await browser.close();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
