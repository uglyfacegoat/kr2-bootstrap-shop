# Канцтовары — контрольная работа №2

Тема: «CSS-фреймворки: разработка интерфейса на Bootstrap или альтернативном CSS-фреймворке».

## Описание

Отдельная реализация учебного магазина канцтоваров на Bootstrap 5.3.8. Сохранена предметная область первой контрольной, но страницы построены на сетке и компонентах фреймворка. Белый фон, тёмный текст и голубые кнопки.

[Репозиторий](https://github.com/uglyfacegoat/kr2-bootstrap-shop) · [GitHub Pages](https://uglyfacegoat.github.io/kr2-bootstrap-shop/)

Цены, характеристики и ассортимент демонстрационные. Форма проверяет поля и рассчитывает сумму в браузере. Данные не отправляются и не сохраняются, заказ не создаётся; оплаты и доставки нет.

## Страницы

| Страница | Содержание |
| --- | --- |
| `index.html` | Общая навигация, вводный блок, четыре товара и ссылки на полный каталог, сравнение и вопросы |
| `catalog.html` | Двенадцать товаров, фильтры по категории и цене, таблица сравнения, FAQ |
| `product.html?id=notebook` | Отдельная карточка выбранного товара, фотография, характеристики, цена, badge и переход к заявке |
| `order.html?id=notebook` | Форма с выбором товара и количества, расчётом суммы и проверкой контактных данных |

У каждого товара есть свой идентификатор: `notebook`, `folder`, `pen`, `pencil`, `notepad`, `paper`, `eraser`, `highlighter`, `ruler`, `sharpener`, `sticky-notes`, `clips`. Он передаётся в ссылках `product.html?id=…` и `order.html?id=…`. Если идентификатора нет, открывается тетрадь; неизвестный идентификатор вызывает сообщение об ошибке.

## Выбранные самостоятельные доработки

1. **Расширенный каталог товаров.** Двенадцать позиций: тетрадь, папка, ручка, карандаш, блокнот A4, бумага A4, ластик, текстовыделитель, линейка, точилка с контейнером, стикеры и скрепки. У каждого товара своя фотография, описание, цена, подробная карточка и кнопка заявки. Категория и диапазон цены применяются вместе; предусмотрены пустой результат, ошибка диапазона и сброс.
2. **Блок часто задаваемых вопросов.** Шесть вопросов о фильтрах, сравнении и заявке. Используется Bootstrap `accordion`: ответы раскрываются кнопками, доступными с клавиатуры. [Раздел FAQ](https://uglyfacegoat.github.io/kr2-bootstrap-shop/catalog.html#faq).
3. **Расширенная таблица характеристик или сравнения.** Двенадцать строк и семь столбцов: товар, категория, назначение, характеристики, материал, единица продажи и цена. В таблице есть `caption`, заголовки `th` со `scope`, ссылки на карточки и горизонтальная прокрутка на узком экране. Фильтры не скрывают строки сравнения. [Таблица](https://uglyfacegoat.github.io/kr2-bootstrap-shop/catalog.html#comparison).
4. **Sticky-фильтр каталога.** При ширине от 768 px фильтр закрепляется ниже фиксированной шапки через `position: sticky`. Высота шапки учитывается при переносах и открытии меню. Если экран невысокий, содержимое фильтра прокручивается; на телефоне фильтр находится в обычном потоке перед товарами.

## Компоненты Bootstrap

| Требование | Реализация |
| --- | --- |
| Сетка | `container`, `row`, `col-*`, `row-cols-*`, `g-*` |
| Навигация | `navbar`, `navbar-expand-md`, `navbar-toggler`, `collapse`, `nav-link`, `breadcrumb` |
| Карточки | `card`, `card-body`, `card-title`, `card-img-top` |
| Кнопки и состояния | `btn`, `btn-primary`, `btn-outline-primary`, `btn-outline-secondary`, hover, focus, disabled |
| Формы | `form-control`, `form-select`, `input-group`, `form-check`, `invalid-feedback`, `was-validated` |
| Модальное окно | `modal`, `modal-dialog-scrollable`, `modal-content`, `modal-header`, `modal-body`, `modal-footer` |
| Сообщения | `alert`, `alert-danger`, `alert-success`, `alert-warning` |
| Значки | `badge` с категорией на странице товара |
| Дополнительный компонент | `accordion` в FAQ |
| Таблица | `table`, `table-striped`, `table-responsive` |

Общая шапка закреплена сверху. Ссылка «Наверх» есть на всех страницах; для якорей предусмотрен отступ под шапкой. Модальное окно открывается из карточки выбранного товара, закрывается по Escape и возвращает фокус на кнопку. После успешной проверки формы показано явное сообщение об учебной демонстрации.

Bootstrap подключён локально из `vendor/bootstrap/`, поэтому для просмотра не нужен CDN. Исходные минифицированные файлы версии 5.3.8 взяты из официального npm-дистрибутива; лицензия MIT сохранена рядом. Оформление проекта находится в `css/custom.css`, сценарии — в `js/main.js`, данные двенадцати товаров — в `js/products.js`. Собственные классы `product-card__image`, `product-detail__image`, `comparison__table` дополняют компоненты Bootstrap.

## Структура

```text
kr2-bootstrap-shop/
├── index.html
├── catalog.html
├── product.html
├── order.html
├── css/custom.css
├── js/
│   ├── products.js
│   └── main.js
├── images/
├── vendor/bootstrap/
│   ├── bootstrap.min.css
│   ├── bootstrap.bundle.min.js
│   └── LICENSE
├── tests/browser.cjs
├── package.json
├── package-lock.json
├── .gitignore
├── .nojekyll
└── README.md
```

## Запуск и проверка

Сборка не требуется. Из папки проекта:

```sh
python3 -m http.server 8818 --bind 127.0.0.1
```

Открыть [локальный магазин](http://127.0.0.1:8818/). Для фильтров, выбора товара по ссылке и проверки формы нужен JavaScript. Карточки каталога, таблица и обычные ссылки доступны без него.

Для автоматической проверки в другом терминале:

```sh
npm ci
npx playwright install chromium
npm test
```

Тесты проверяют страницы на узком, среднем и широком экранах, изображения и ссылки, двенадцать вариантов карточки товара, фильтры и сброс, прокрутку таблицы, FAQ с клавиатуры, закрепление фильтра и шапки, модальное окно и форму заявки. Вводятся только тестовые данные; сетевой отправки формы нет. Адрес сервера можно изменить через `TEST_BASE_URL`, папку скриншотов — через `TEST_OUTPUT_DIR`, браузер — через `CHROME_PATH`.

## Источники фотографий

Изображения хранятся локально; права на фотографии принадлежат их владельцам. Использованы в учебном демонстрационном проекте.

- [Тетрадь — Exercise Books Direct](https://exercisebooksdirect.co.uk/products/manila_school_exercise_book-9x7-squared-standard_5mm_squared)
- [Папка — BusinessSuppliers](https://businesssuppliers.shop/products/folder-manila-8-5x11-sueltos)
- [Ручка — Printus](https://www.printus.de/schreibwaren/schreibgeraete/kugelschreiber)
- [Карандаш — Booghe](https://www.booghe.co.uk/products/staedtler-noris-2hb-pencil)
- [Блокнот A4 — Booghe](https://www.booghe.co.uk/products/a4-hardback-notebook-asst-1)
- [Бумага A4 — Booghe](https://www.booghe.co.uk/products/a4-210x297mm-80gm2-5x500sh)
- [Ластик — Booghe](https://www.booghe.co.uk/products/staedtler-mars-plastic-eraser)
- [Текстовыделитель — Booghe](https://www.booghe.co.uk/products/stabilo-boss-original-pink-highlighter)

- [Линейка — Booghe](https://www.booghe.co.uk/products/helix-recycled-plast-ruler-12in-hanging)
- [Точилка — Booghe](https://www.booghe.co.uk/products/staedtler-noris-tub-sharpener)
- [Стикеры — Booghe](https://www.booghe.co.uk/products/pukka-stickys-pastel-cube-76-x-76mm-box-48-fsc-mix)
- [Скрепки — Booghe](https://www.booghe.co.uk/products/just-stationery-100-jumbo-paperclips)

## Автор

Завгороднев Ярослав Александрович

Группа: ЭФБО-02-25
