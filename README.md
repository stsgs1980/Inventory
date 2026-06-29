# Inventory DXF Web Application

Web-приложение для полевых архитектурных обмеров зданий с генерацией DXF-файлов, совместимых с CADSoftTools Inventory.


[![Next.js](https://img.shields.io/badge/Next.js-black?style=flat-square)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-61DAFB?style=flat-square)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square)](https://www.typescriptlang.org)
[![Python](https://img.shields.io/badge/Python-3776AB?style=flat-square)](https://python.org)
[![Tailwind_CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=flat-square)](https://tailwindcss.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)


## Table of Contents

- [Назначение](#назначение)
- [Архитектура](#архитектура)
- [DXF-формат (ФАЗА 2)](#dxf-формат-фаза-2)
- [Инструменты Canvas-редактора (ФАЗА 1)](#инструменты-canvas-редактора-фаза-1)
- [Рабочий процесс](#рабочий-процесс)
- [Технологии](#технологии)
- [Ссылки и источники](#ссылки-и-источники)
- [Требования к разработке](#требования-к-разработке)
- [Запуск](#запуск)
- [Установка зависимостей](#установка-зависимостей)
- [Миграция базы данных](#миграция-базы-данных)
- [Development](#development)
- [Production build](#production-build)
- [Python bot (отдельно)](#python-bot-отдельно)
- [Статус проекта](#статус-проекта)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [License](#license)

## Назначение

Система предназначена для работы архитектора/инженера непосредственно на объекте (с планшета) -- выполнение обмеров, создание поэтажного плана с нуля (рисование стен, проемов, комнат), автоматический расчет площадей и экспорт в DXF-формат для загрузки в CADSoftTools Inventory на рабочем месте.

Проект НЕ дублирует CADSoftTools Inventory -- он дополняет его, предоставляя полевой инструмент для обмеров, которого у CST нет (нет web-версии, нет планшетной версии).

## Архитектура

### Frontend (Next.js 16 + TypeScript + Tailwind CSS)

```bash
src/
  app/                         # Next.js App Router
    api/                       # REST API маршруты
      buildings/               # CRUD зданий + экспорт DXF
      rooms/                   # CRUD комнат
      walls/                   # CRUD стен (координатные)
      openings/                # CRUD проемов
  components/
    canvas/                    # Canvas CAD-редактор (ФАЗА 1)
      canvas-editor.tsx        # Главный редактор (клавиатурные сокращения)
      canvas-toolbar.tsx       # Панель инструментов
      canvas-status-bar.tsx    # Статусная строка (координаты, привязка)
    inventory/                 # Компоненты ввода данных
      building-form.tsx        # Форма здания
      room-form.tsx            # Форма комнаты
      wall-form.tsx            # Форма стены
      opening-form.tsx         # Форма проема
      export-panel.tsx         # Панель экспорта DXF
      floor-plan.tsx           # SVG-просмотр плана (legacy)
      room-card.tsx            # Карточка комнаты с расчетом площади
  hooks/
    use-canvas-editor.ts       # Состояние редактора, инструменты, привязка
    use-canvas-render.ts       # Рендер-цикл Canvas (requestAnimationFrame)
    use-building-data.ts       # Общие данные здания (устраняет дублирование)
    use-floor-plan.ts          # Состояние плана (legacy SVG)
    use-wall-mutations.ts      # Мутации стен (перемещение, удаление)
  lib/
    canvas/                    # Движок Canvas CAD (ФАЗА 1)
      geometry.ts              # Геометрические вычисления (расстояния, углы, пересечения)
      snap.ts                  # Привязка (сетка, конечная точка, середина, перпендикуляр)
      renderer.ts              # Рендеринг сетки, стен, система координат
      renderer-rooms.ts        # Рендеринг комнат (полигоны), дверей, окон
      tools.ts                 # Обработка инструментов (стена, проем, выбор)
      api.ts                   # API-вызовы из Canvas
    dxf/                       # Генератор DXF (ФАЗА 2)
      writer.ts                # DXF-писатель + XDATA (CSTINVENTORY)
      dxf-tables.ts            # TABLES-секция DXF (слои, APPID)
      entities.ts              # ENTITIES-секция (стены, проемы, размеры)
      generator.ts             # Оркестратор генерации DXF
      utils.ts                 # Построение полигонов комнат
    constants.ts               # Константы приложения
    opening-presets.ts         # Стандартные размеры дверей/окон
    plan-utils.ts              # Утилиты координат (legacy SVG)
  types/
    inventory.ts               # Общие типы (BuildingData, WallData, OpeningData, EditorTool)
  store/
    inventory-store.ts         # Глобальное состояние приложения
```

### Backend (Python/FastAPI -- Telegram Bot)

```bash
inventory-bot/
  services/dxf/
    generator.py               # Генерация DXF через ezdxf
    walls.py                   # Рисование стен
    annotations.py             # Размерные annotations
    utils.py                   # Утилиты DXF
  handlers/                    # Telegram bot handlers
  models/data_models.py        # Pydantic модели данных
  config.py                    # Конфигурация
  storage.py                   # Хранение данных
```

### База данных (Prisma + SQLite)

- **Building** -- здание (буква, разрешение, тип этажа, высоты)
- **Room** -- комната (номер, назначение, привязка к зданию)
- **Wall** -- стена (абсолютные координаты startX/Y, endX/Y в метрах, толщина, тип: portant/despartitor)
- **Opening** -- проем (тип door/window, смещение вдоль стены, ширина, высота)

## DXF-формат (ФАЗА 2)

Формат: AutoCAD 2007 (AC1021). Полная совместимость с CADSoftTools Inventory.

### Слои

| Слой | Цвет | Назначение |
|------|------|------------|
| Portant | Красный | Несущие стены |
| Despartitor | Зеленый | Перегородки |
| Incaperi | Голубой | Контуры комнат |
| IncIzolate | Синий | Изолированные комнаты |
| Nivel | Фиолетовый | Отметки уровня |
| Gol | Пурпурный | Проемы (двери/окна) |
| Dimensiuni | Голубой | Размерные линии |
| Text | Белый | Текстовые надписи |

### XDATA (CSTINVENTORY)

Все сущности стен, контуров комнат и проемов содержат расширенные данные в формате CSTINVENTORY для распознавания в CADSoftTools Inventory. APPID CSTINVENTORY регистрируется в TABLES-секции DXF.

## Инструменты Canvas-редактора (ФАЗА 1)

| Инструмент | Сочетание | Описание |
|------------|-----------|----------|
| Select | 1 | Выбор стены/комнаты/проема |
| Wall | 2 | Рисование стены (клик начала + клик конца) |
| Opening | 3 | Добавление проема на стену (клик по стене) |
| Cancel | Escape | Отмена текущего действия |
| Delete | Delete | Удаление выбранного элемента |

### Привязка (Snap)

- Сетка (10 см шаг)
- Конечные точки стен
- Середины стен
- Пересечения стен
- Перпендикуляр от точки к стене

### Навигация

- Колесо мыши: масштабирование к курсору
- Shift + перетаскивание: панорамирование
- Клавиатурные сокращения: 1/2/3 для переключения инструментов

## Рабочий процесс

1. **Cladire** (Здание) -- ввод данных здания, адрес, разрешение, высоты
2. **Incaperi** (Комнаты) -- добавление комнат, назначение, нумерация
3. **Pereti** (Стены) -- рисование стен в Canvas-редакторе, указание проемов
4. **Plan** (План) -- просмотр поэтажного плана, проверка корректности
5. **Export** (Экспорт) -- генерация DXF-файла для CADSoftTools Inventory

## Технологии

- Next.js 16.1.3 (App Router, Turbopack)
- TypeScript 5
- Tailwind CSS 4
- shadcn/ui (Radix UI)
- Prisma ORM + SQLite
- Canvas 2D API (CAD-редактор)
- ezdxf (Python, Telegram Bot)
- FastAPI (Python, Telegram Bot)

## Ссылки и источники

### CADSoftTools

- CADSoftTools Inventory (Windows): https://www.cadsofttools.com/products/inventory/ -- основная программа, под формат которой генерируются DXF-файлы
- CADSoftTools Products: https://www.cadsofttools.com/products/ -- каталог продуктов CST
- CADSoftTools SDK: https://www.cadsofttools.com/products/sdk/ -- SDK для разработчиков
- CADSoftTools Plugins: https://www.cadsofttools.com/products/plugins/ -- плагины для AutoCAD
- CADSoftTools Web Apps: https://www.cadsofttools.com/products/web-apps/ -- веб-приложения (без Inventory)
- CADSoftTools ShareCAD: https://www.cadsofttools.com/products/sharecad/ -- онлайн-просмотрщик CAD
- CADSoftTools WebCAD SDK: https://www.cadsofttools.com/products/webcad-sdk/ -- SDK для веб-визуализации CAD
- CADSoftTools Help: https://www.cadsofttools.com/help/ -- документация

### Исходные данные (сохранены в проекте)

Эти файлы содержат scraped-данные с сайта CADSoftTools, полученные в ходе исследования:

| Файл | Содержание |
|------|------------|
| `cst-inventory.json` | Главная страница Inventory |
| `cst-inventory-download.json` | Страница загрузки Inventory |
| `cst-inventory-help.json` | Документация Inventory |
| `cst-inventory-screens.json` | Скриншоты Inventory |
| `cst-inventory-landing.json` | Landing page Inventory |
| `cst-inventory14.json` | Inventory 2014 (старая версия) |
| `cst-all-plugins.json` | Все плагины CST |
| `cst-plugins.json` | Плагины AutoCAD |
| `cst-sdk.json` | SDK |
| `cst-webcad-sdk.json` | WebCAD SDK |
| `cst-sharecad.json` | ShareCAD |
| `cst-webapps.json` | Web-приложения |
| `cst-products.json` | Все продукты |
| `cst-mobile-webapps.json` | Мобильные web-приложения |
| `cst-mobile-search.json` | Результаты поиска мобильных приложений |
| `cst-web-search.json` | Общий web-поиск по CST |

### DXF Format

- AutoCAD DXF Reference: https://help.autodesk.com/view/OEXP/XPLU/2024/ENU/?guid=GUID-A85B8C37-3DF7-4C53-B326-50E4FF8B5DC5
- AC1021 (AutoCAD 2007) DXF specification

### Библиотеки

- ezdxf (Python): https://ezdxf.mozman.at/ -- библиотека для создания/модификации DXF
- Next.js: https://nextjs.org/ -- React фреймворк
- Prisma: https://www.prisma.io/ -- ORM для Node.js/TypeScript
- shadcn/ui: https://ui.shadcn.com/ -- компоненты UI

## Требования к разработке

- **Anti-monolith**: максимум 200 строк на файл, максимум 3 useState на компонент
- **Barrel exports**: index.ts в каждой директории компонентов/hooks/types
- **Без Unicode эмодзи**: нигде в коде, UI, документации
- **Язык UI**: румынский (для полевых инженеров в Молдове/Румынии)
- **Touch-friendly**: минимальный target 44px для планшета

## Запуск

```bash
## Установка зависимостей
bun install

## Миграция базы данных
npx prisma db push

## Development
bun run dev

## Production build
bun run build
node .next/standalone/server.js

## Python bot (отдельно)
cd inventory-bot
pip install -r requirements.txt
python main.py
```

## Статус проекта

| Фаза | Статус | Описание |
|------|--------|----------|
| ФАЗА 1: Canvas-редактор | Реализовано | CAD-рисование стен, проемов, комнат с привязкой |
| ФАЗА 2: DXF-структура | Реализовано | Генерация DXF с CSTINVENTORY XDATA, все слои |
| ФАЗА 3: Шаблоны ввода | Планируется | Структурированные шаблоны для полевых обмеров |
| ФАЗА 4: Шаблоны экспорта | Планируется | Стандартные шаблоны экспорта для Inventory |
| ФАЗА 5: Шаблоны печати | Планируется | Печать документации в полевых условиях |


## Features

- Feature 1 - description
- Feature 2 - description


## Tech Stack

- **Framework** - Next.js, FastAPI
- **Language** - TypeScript, Python
- **Styling** - Tailwind CSS, Canvas API, SVG, CSS
- **Database** - Prisma, SQLite
- **Libraries** - shadcn/ui
- **Tools** - React, Node.js


## Getting Started

### Prerequisites

- Node.js 20+ or Bun

### Installation

```bash
git clone https://github.com/stsgs1980/Inventory.git
cd Inventory
bun install
```

### Run

```bash
bun run dev
```

## License

[MIT](LICENSE)

---
Built with: Next.js + React + TypeScript + Python
