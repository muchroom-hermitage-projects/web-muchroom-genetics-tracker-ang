// This file is required by karma.conf.js and loads recursively all the .spec and framework files

import 'zone.js/testing';
import { getTestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting
} from '@angular/platform-browser-dynamic/testing';

declare const require: {
  context(path: string, deep?: boolean, filter?: RegExp): {
    <T>(id: string): T;
    keys(): string[];
  };
};

// First, initialize the Angular testing environment.
getTestBed().initTestEnvironment(
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting(),
);

// Then we find all the tests.
const requireAny = require as unknown as { context?: typeof require.context; (id: string): unknown };

if (typeof requireAny.context === 'function') {
  const context = requireAny.context('./', true, /\.spec\.ts$/);
  context.keys().forEach(context);
} else {
  const karma = (window as any).__karma__;
  const karmaFiles = karma?.files ? Object.keys(karma.files) : [];
  karmaFiles
    .filter((file) => file.endsWith('.spec.ts'))
    .forEach((file) => {
      const normalized = file.replace(/^\/base\//, './');
      requireAny(normalized);
    });
}
