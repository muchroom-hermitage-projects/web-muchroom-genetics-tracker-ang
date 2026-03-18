# Mycology Genetics Tracker

A specialized tool for tracking the genetic genealogy of mushroom cultures. This application allows users to visualize and manage the complex relationships between different culture types, from spores and agar to liquid cultures and grain spawns.

## 🍄 Overview

The Mycology Genetics Tracker is a standalone Angular application designed to help mycologists track strains, generations, and lineage through a Directed Acyclic Graph (DAG) interface. It provides tools for metadata management, relationship tracking, and data persistence using local storage.

## ✨ Key Features

- **Genetic Genealogy Graph**: Visualize culture relationships using Cytoscape.js and the Dagre layout.
- **Culture Management**: Track various types (Spore, Agar, Liquid Culture, Grain Spawn, Fruit, Clone, Slant).
- **Metadata Tracking**: Record transfer numbers, clone generations, contamination status, and viability.
- **Strain Identification**: Automatic strain label generation (e.g., POS-1, LED-2).
- **Advanced Filtering**: Filter cultures by strain, type, generation, contamination, and viability.
- **Import/Export**: Save and load your data via JSON files.
- **Local Persistence**: Data is automatically saved to your browser's local storage.

## 🛠️ Tech Stack

- **Framework**: [Angular 19](https://angular.dev/) (Standalone components, Signals-based state management)
- **UI Components**: [Angular Material](https://material.angular.io/)
- **Graph Visualization**: [Cytoscape.js](https://js.cytoscape.org/) with `cytoscape-dagre`
- **Build Tool**: Vite (via Angular's new build system)
- **Testing**:
  - Unit: [Vitest](https://vitest.dev/)
  - E2E: [Playwright](https://playwright.dev/)
- **Linting/Formatting**: ESLint, Prettier

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (Recommended version: 18.x or 20.x+)
- [npm](https://www.npmjs.com/)

### Installation

```bash
# Clone the repository (if applicable)
# git clone <repository-url>
# cd mycology-genetics-tracker

# Install dependencies
npm install
```

### Development Server

Run the development server with hot reload:

```bash
npm run start
```
Navigate to `http://localhost:4200/`.

### Build

Generate build artifacts in the `dist/` directory:

```bash
npm run build
```

## 🧪 Testing

### Unit Tests (Vitest)

Execute unit tests:

```bash
npm run test
```

Generate coverage reports:

```bash
npm run test:coverage
```

### End-to-End Tests (Playwright)

Run the Playwright test suite:

```bash
npm run test:e2e
```

## 📂 Project Structure

| File/Folder | Purpose |
|---|---|
| `src/app/services/culture.service.ts` | State management and localStorage I/O (Single Source of Truth) |
| `src/app/services/graph-builder.service.ts` | Cytoscape element and stylesheet generation |
| `src/app/models/culture.model.ts` | Enums and interfaces (Culture, Relationship, etc.) |
| `src/app/components/genealogy-graph/` | Graph rendering and node selection logic |
| `src/app/components/culture-detail/` | Detail panel and relationship management |
| `src/app/components/filter-panel/` | Left sidebar filter controls |
| `src/app/components/node-modal/` | CRUD dialogs for cultures |

## 🧹 Code Quality

- **Linting**: `npm run lint`
- **Formatting**: `npm run format` (Uses Prettier and ESLint auto-fix)
- **Git Hooks**: Pre-commit hooks are configured via Husky and lint-staged.

## 🐳 Docker

A basic Dockerfile is included for containerized development or deployment.

```bash
# Build the image
docker build -t mycology-genetics-tracker .

# Run the container (check Dockerfile for entry point)
# docker run -p 4200:4200 mycology-genetics-tracker
```

## 📝 TODO

- [ ] Implement contamination UI (red background for affected nodes).
- [ ] Auto-derive relationship types based on source/target types.
- [ ] Add graph zoom controls and minimap.
- [ ] Expand cloning implementation.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
