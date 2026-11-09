import { registerHooks } from 'node:module';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';

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
  load(url, context, next) {
    if (url.endsWith('.ts') || url.endsWith('.tsx')) return { format: 'module', shortCircuit: true,
      source: ts.transpileModule(readFileSync(fileURLToPath(url), 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
      }).outputText };
    return next(url, context);
  },
});
