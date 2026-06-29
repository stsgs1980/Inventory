# Inventory DXF

A field tool for architects and engineers to perform building surveys on a tablet -- draw floor plans with walls, openings, and rooms in a Canvas CAD editor, then export to DXF format compatible with CADSoftTools Inventory.

[![Next.js](https://img.shields.io/badge/Next.js-black?style=flat-square)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-61DAFB?style=flat-square)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square)](https://www.typescriptlang.org)
[![Python](https://img.shields.io/badge/Python-3776AB?style=flat-square)](https://python.org)
[![Tailwind_CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=flat-square)](https://tailwindcss.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [DXF Export](#dxf-export)
- [Canvas Editor](#canvas-editor)
- [Configuration](#configuration)
- [Status](#status)
- [License](#license)

## Features

- Canvas CAD editor with wall drawing, opening placement, and room polygon rendering
- Snap system: grid (10 cm), wall endpoints, midpoints, intersections, perpendicular from point to wall
- Navigation: mouse wheel zoom to cursor, Shift+drag pan, keyboard shortcuts (1/2/3 for tool switching)
- DXF export in AutoCAD 2007 (AC1021) format with CSTINVENTORY XDATA for full CADSoftTools Inventory compatibility
- 8 DXF layers: Portant, Despartitor, Incaperi, IncIzolate, Nivel, Gol, Dimensiuni, Text
- CRUD for buildings, rooms, walls (coordinate-based), and openings (doors/windows)
- Automatic area calculation per room
- Touch-friendly design (minimum 44px target for tablet use)
- Romanian UI language for field engineers in Moldova/Romania

## Tech Stack

- **Framework** - Next.js 16 (App Router, Turbopack)
- **Language** - TypeScript 5
- **Styling** - Tailwind CSS 4
- **UI Components** - shadcn/ui (Radix UI)
- **Database** - Prisma ORM, SQLite
- **Canvas** - Canvas 2D API
- **DXF Generation** - Custom writer with XDATA support
- **Backend** - Python/FastAPI (Telegram Bot), ezdxf

## Getting Started

### Prerequisites

- Node.js 20+ or Bun
- npx (for Prisma migrations)

### Installation

```bash
git clone https://github.com/stsgs1980/Inventory.git
cd Inventory
bun install
npx prisma db push
```

### Run

```bash
bun run dev
```

For production build:

```bash
bun run build
node .next/standalone/server.js
```

Python bot (separate):

```bash
cd inventory-bot
pip install -r requirements.txt
python main.py
```

## Architecture

### Frontend (Next.js 16 + TypeScript + Tailwind CSS)

The frontend follows an anti-monolith approach: max 200 lines per file, max 3 useState per component, barrel exports in every directory.

- `src/app/api/` - REST API routes for buildings, rooms, walls, openings (CRUD + DXF export)
- `src/components/canvas/` - Canvas CAD editor: main editor with keyboard shortcuts, toolbar, status bar
- `src/components/inventory/` - Data entry forms: building, room, wall, opening, export panel, floor plan viewer
- `src/hooks/` - Editor state, canvas render loop (requestAnimationFrame), building data, wall mutations
- `src/lib/canvas/` - CAD engine: geometry, snap system, renderer (grid, walls, coordinates), room renderer, tools
- `src/lib/dxf/` - DXF generator: writer with XDATA (CSTINVENTORY), TABLES section (layers, APPID), ENTITIES section, room polygon builder
- `src/store/` - Global application state

### Backend (Python/FastAPI -- Telegram Bot)

- `inventory-bot/services/dxf/` - DXF generation via ezdxf, wall drawing, annotations
- `inventory-bot/handlers/` - Telegram bot handlers
- `inventory-bot/models/` - Pydantic data models

### Database (Prisma + SQLite)

- **Building** - letter, resolution, floor type, heights
- **Room** - number, purpose, building reference
- **Wall** - absolute coordinates (startX/Y, endX/Y in meters), thickness, type (portant/despartitor)
- **Opening** - type (door/window), offset along wall, width, height

## Project Structure

- `src/app/api/buildings/` - Building CRUD + DXF export endpoints
- `src/app/api/rooms/` - Room CRUD endpoints
- `src/app/api/walls/` - Wall CRUD endpoints (coordinate-based)
- `src/app/api/openings/` - Opening CRUD endpoints
- `src/components/canvas/canvas-editor.tsx` - Main Canvas editor with keyboard shortcuts
- `src/components/canvas/canvas-toolbar.tsx` - Tool panel
- `src/components/canvas/canvas-status-bar.tsx` - Coordinates and snap status
- `src/components/inventory/building-form.tsx` - Building data form
- `src/components/inventory/room-form.tsx` - Room data form
- `src/components/inventory/wall-form.tsx` - Wall data form
- `src/components/inventory/opening-form.tsx` - Opening data form
- `src/components/inventory/export-panel.tsx` - DXF export panel
- `src/components/inventory/room-card.tsx` - Room card with area calculation
- `src/hooks/use-canvas-editor.ts` - Editor state, tools, snap
- `src/hooks/use-canvas-render.ts` - Canvas render loop (requestAnimationFrame)
- `src/lib/canvas/geometry.ts` - Geometric calculations (distances, angles, intersections)
- `src/lib/canvas/snap.ts` - Snap system (grid, endpoints, midpoints, perpendicular)
- `src/lib/canvas/renderer.ts` - Grid, walls, coordinate system rendering
- `src/lib/dxf/writer.ts` - DXF writer + XDATA (CSTINVENTORY)
- `src/lib/dxf/dxf-tables.ts` - TABLES section (layers, APPID)
- `src/lib/dxf/entities.ts` - ENTITIES section (walls, openings, dimensions)
- `src/lib/dxf/generator.ts` - DXF generation orchestrator
- `src/types/inventory.ts` - Shared types (BuildingData, WallData, OpeningData, EditorTool)
- `src/store/inventory-store.ts` - Global application state

## DXF Export

Format: AutoCAD 2007 (AC1021). All wall, room contour, and opening entities contain CSTINVENTORY extended data for recognition by CADSoftTools Inventory. The APPID CSTINVENTORY is registered in the DXF TABLES section.

| Layer | Color | Purpose |
|-------|-------|---------|
| Portant | Red | Load-bearing walls |
| Despartitor | Green | Partition walls |
| Incaperi | Light blue | Room contours |
| IncIzolate | Blue | Isolated rooms |
| Nivel | Purple | Level marks |
| Gol | Magenta | Openings (doors/windows) |
| Dimensiuni | Light blue | Dimension lines |
| Text | White | Text labels |

## Canvas Editor

| Tool | Shortcut | Description |
|------|----------|-------------|
| Select | 1 | Select wall/room/opening |
| Wall | 2 | Draw wall (click start + click end) |
| Opening | 3 | Add opening on wall (click on wall) |
| Cancel | Escape | Cancel current action |
| Delete | Delete | Delete selected element |

## Configuration

Development rules enforced in the project:

- Max 200 lines per file, max 3 useState per component (anti-monolith)
- Barrel exports (index.ts) in every components/hooks/types directory
- No Unicode emoji in code, UI, or documentation
- Romanian UI language for field engineers
- Touch-friendly: minimum 44px target for tablet

## Status

| Phase | Status | Description |
|-------|--------|-------------|
| Phase 1: Canvas editor | Done | CAD drawing of walls, openings, rooms with snap system |
| Phase 2: DXF structure | Done | DXF generation with CSTINVENTORY XDATA, all layers |
| Phase 3: Input templates | Planned | Structured templates for field surveys |
| Phase 4: Export templates | Planned | Standard export templates for Inventory |
| Phase 5: Print templates | Planned | On-site documentation printing |

## License

[MIT](LICENSE)

---
Built with: Next.js + React + TypeScript + Tailwind CSS + Python