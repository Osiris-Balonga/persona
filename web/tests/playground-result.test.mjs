import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { portraitImageForSize } from "../src/lib/portrait-image.ts";

const require = createRequire(import.meta.url);
function renderPicker() {
  const source = readFileSync(new URL("../src/components/playground-result.tsx", import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const renderedModule = { exports: {} };
  let stateCalls = 0;
  const dependencies = {
    react: { ...React, useState: initial => [++stateCalls === 2 ? true : initial, () => {}] },
    "next/image": { __esModule: true, default: ({ src, unoptimized, ...props }) => React.createElement("img", { ...props, src: unoptimized ? src : `/_next/image?url=${encodeURIComponent(src)}&w=640&q=75`, alt: "" }) },
    "next-intl": { useLocale: () => "en", useTranslations: () => (key, args) => `${key}${args?.number ?? args?.count ?? ""}` },
    "lucide-react": new Proxy({}, { get: () => () => null }),
    "@/lib/portrait-image": { portraitImageForSize },
    "@/lib/country-display-name": { countryDisplayName: () => "" },
    "@/components/docs/code-block": { CodeBlock: () => null },
  };
  new Function("require", "module", "exports", compiled)(id => dependencies[id] ?? require(id), renderedModule, renderedModule.exports);
  const people = Array.from({ length: 100 }, (_, index) => ({ id: `fixture-${index}`, name: { full: `Test Person ${index}` }, picture: index === 99 ? null : { large: `https://example.test/large-${index}.webp`, thumbnail: `https://example.test/thumb-${index}.webp` } }));
  return renderToStaticMarkup(React.createElement(renderedModule.exports.PlaygroundResult, { response: { results: people }, loading: false, error: null, onRetry() {} }));
}

test("expanded 100-person picker serves pre-generated portraits directly and preserves fallback labels", () => {
  const html = renderPicker();
  const picker = html.slice(html.indexOf('aria-hidden="false"'), html.indexOf('class="playground-swap'));
  for (let index = 0; index < 99; index++) assert.ok(picker.includes(`https://example.test/thumb-${index}.webp`));
  assert.ok(html.includes("https://example.test/large-0.webp"));
  assert.ok(!html.includes("/_next/image"));
  assert.ok(picker.includes('aria-label="selectPerson100"'));
  assert.ok(picker.includes('loading="lazy"'));
  assert.ok(picker.includes('TP'));
  assert.ok(!picker.includes('>100</button>'));
});
