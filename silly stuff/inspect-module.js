import * as module from './imessage-kit/dist/index.js';

console.log('Available exports:');
console.log(Object.keys(module));

// Also check the default export
console.log('Default export:', module.default);

// Check if it's a function or class
if (module.default) {
  console.log('Default export type:', typeof module.default);
}