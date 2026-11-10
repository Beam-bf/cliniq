// Production Node 24 entrypoints use native TypeScript stripping. This hook only
// resolves the existing project's @/ aliases and extensionless TS imports; no
// test utilities, client bundle or TypeScript compiler are loaded by the service.
import { registerHooks } from 'node:module';
import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

registerHooks({
  resolve(specifier, context, next) {
    let url;
    if (specifier.startsWith('@/')) url = new URL(`../src/${specifier.slice(2)}`, import.meta.url);
    else if (specifier.startsWith('.') && context.parentURL) url = new URL(specifier, context.parentURL);
    if (url) {
      for (const suffix of ['.ts', '/index.ts']) {
        const candidate = fileURLToPath(url) + suffix;
        if (existsSync(candidate)) return { url: pathToFileURL(candidate).href, shortCircuit: true };
      }
    }
    return next(specifier, context);
  },
});
