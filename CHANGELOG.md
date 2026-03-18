# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.1] - 2026-03-18

### Changed
- Update README.md and TODO.md with project overview and task updates. [[4aec07e](https://github.com/wdudek82/web-muchroom-genetics-tracker-ang/commit/4aec07e34a872c73010d8c2889b15c518fd11abf)]
- Upgrade project to Angular 19. [[9a78419](https://github.com/wdudek82/web-muchroom-genetics-tracker-ang/commit/9a7841906b0120cdda7da31b143689881a35e2f9)]
- Refine UI wording and pluralization in navbar and genealogy graph. [[f7eae42](https://github.com/wdudek82/web-muchroom-genetics-tracker-ang/commit/f7eae42b484e1c24daac7d8964c767e328aad8dd), [d874c90](https://github.com/wdudek82/web-muchroom-genetics-tracker-ang/commit/d874c907165147c76591306781d69e7612e86ef4)]
- Update unit tests for genealogy graph component. [[72f060e](https://github.com/wdudek82/web-muchroom-genetics-tracker-ang/commit/72f060e1f838912ece96ef81f879cfc6d5acf658)]

## [0.1.0] - 2026-03-05

### Added
- Implement genealogy graph using Cytoscape.js with dagre layout. [[b6900d3](https://github.com/wdudek82/web-muchroom-genetics-tracker-ang/commit/b6900d3), [054ac22](https://github.com/wdudek82/web-muchroom-genetics-tracker-ang/commit/054ac22)]
- Add culture management (create, edit, delete) via modal dialogs. [[accd19a](https://github.com/wdudek82/web-muchroom-genetics-tracker-ang/commit/accd19a), [67baf29](https://github.com/wdudek82/web-muchroom-genetics-tracker-ang/commit/67baf29)]
- Support for various mushroom culture types (Spore, Agar, LC, etc.). [[b6900d3](https://github.com/wdudek82/web-muchroom-genetics-tracker-ang/commit/b6900d3)]
- Track genetic relationships between cultures with specific types (Germination, Transfer, etc.). [[e0541c4](https://github.com/wdudek82/web-muchroom-genetics-tracker-ang/commit/e0541c4), [aaa01d5](https://github.com/wdudek82/web-muchroom-genetics-tracker-ang/commit/aaa01d5)]
- Filter genealogy trees by strain, contamination, and archived status. [[f8810c8](https://github.com/wdudek82/web-muchroom-genetics-tracker-ang/commit/f8810c8), [bd6e645](https://github.com/wdudek82/web-muchroom-genetics-tracker-ang/commit/bd6e645)]
- Visual indicators for archived and contaminated cultures. [[b3ef7ef](https://github.com/wdudek82/web-muchroom-genetics-tracker-ang/commit/b3ef7ef), [a3727c3](https://github.com/wdudek82/web-muchroom-genetics-tracker-ang/commit/a3727c3)]
- Subtree movement support to preserve genetic structure during graph interaction. [[99575d2](https://github.com/wdudek82/web-muchroom-genetics-tracker-ang/commit/99575d2)]
- Persistence using `localStorage`. [[b6900d3](https://github.com/wdudek82/web-muchroom-genetics-tracker-ang/commit/b6900d3)]

### Changed
- Refactor application state to use Angular Signals. [[f0f9a6f](https://github.com/wdudek82/web-muchroom-genetics-tracker-ang/commit/f0f9a6f)]
- Migrate from Karma to Vitest for unit testing. [[90c3e8f](https://github.com/wdudek82/web-muchroom-genetics-tracker-ang/commit/90c3e8f)]
- Upgrade project through Angular versions 16, 17, and 18. [[741966a](https://github.com/wdudek82/web-muchroom-genetics-tracker-ang/commit/741966a), [ed0e590](https://github.com/wdudek82/web-muchroom-genetics-tracker-ang/commit/ed0e590), [d525aeb](https://github.com/wdudek82/web-muchroom-genetics-tracker-ang/commit/d525aeb)]
- Improve UI styling and relationship labels. [[0cc5e70](https://github.com/wdudek82/web-muchroom-genetics-tracker-ang/commit/0cc5e70), [94735da](https://github.com/wdudek82/web-muchroom-genetics-tracker-ang/commit/94735da)]
- Enhance Navbar and add Data Import/Export functionality. [[2b19a9d](https://github.com/wdudek82/web-muchroom-genetics-tracker-ang/commit/2b19a9d), [0e88065](https://github.com/wdudek82/web-muchroom-genetics-tracker-ang/commit/0e88065)]
