import '@analogjs/vitest-angular/setup-zone';
import '@angular/material/prebuilt-themes/indigo-pink.css';
import 'zone.js';
import 'zone.js/testing';

import { getTestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting,
} from '@angular/platform-browser-dynamic/testing';
import { afterEach, vi } from 'vitest';

const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

const isMaterialThemeWarning = (args: unknown[]) =>
  args.some(
    (arg) =>
      typeof arg === 'string' &&
      arg.includes('Could not find Angular Material core theme'),
  );

// suppress the Angular Material theme warning that still fires in jsdom
// even though we import a prebuilt theme; keep other errors visible.
console.error = (...args: unknown[]) => {
  if (isMaterialThemeWarning(args)) {
    return;
  }
  return originalConsoleError(...args);
};
console.warn = (...args: unknown[]) => {
  if (isMaterialThemeWarning(args)) {
    return;
  }
  return originalConsoleWarn(...args);
};

if (!getTestBed().platform) {
  getTestBed().initTestEnvironment(
    BrowserDynamicTestingModule,
    platformBrowserDynamicTesting(),
  );
}

if (typeof document !== 'undefined' && document.body) {
  ['mat-app-background', 'mat-typography'].forEach((className) =>
    document.body.classList.add(className),
  );
}

// Mock Canvas for Cytoscape
HTMLCanvasElement.prototype.getContext = () => {
  return {
    fillRect: () => {},
    clearRect: () => {},
    getImageData: (x: number, y: number, w: number, h: number) => {
      return {
        data: new Array(w * h * 4).fill(0),
      };
    },
    putImageData: () => {},
    createImageData: () => {
      return [];
    },
    setTransform: () => {},
    drawImage: () => {},
    save: () => {},
    restore: () => {},
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    closePath: () => {},
    stroke: () => {},
    translate: () => {},
    scale: () => {},
    rotate: () => {},
    arc: () => {},
    fill: () => {},
    measureText: () => {
      return { width: 0 };
    },
    transform: () => {},
    rect: () => {},
    clip: () => {},
  } as any;
};

afterEach(() => {
  vi.restoreAllMocks();
});
