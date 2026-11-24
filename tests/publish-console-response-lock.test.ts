import { test, expect } from "vitest";
import { readFile } from "node:fs/promises";
import { EventEmitter } from "node:events";
import vm from "node:vm";
import ts from "typescript";

async function harness() {
  const source = await readFile("scripts/publish-console/server.ts", "utf8");
  const start = source.indexOf("let requestQueue =");
  expect(start).toBeGreaterThan(0);
  const context = vm.createContext({});
  vm.runInContext(ts.transpileModule(source.slice(start, source.indexOf("const server = createServer", start)), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, context);
  return context.runSerializedResponse as (request: object, res: ReturnType<typeof response>, handler: () => Promise<void>) => Promise<void>;
}

function response() {
  const value = Object.assign(new EventEmitter(), { destroyed: false, writableFinished: false });
  return Object.assign(value, { destroy() { value.destroyed = true; value.emit("close"); } });
}

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => { resolve = done; });
  return { promise, resolve };
}

test("a later revision waits until the earlier request consumes its files", async () => {
  const run = await harness(); const a = response(); const b = response();
  const started = deferred(); const resume = deferred(); let disk = ""; let read = "";
  const first = run({}, a, async () => { disk = "A"; started.resolve(); await resume.promise; read = disk; a.emit("finish"); });
  await started.promise;
  const second = run({}, b, async () => { disk = "B"; b.emit("finish"); });
  resume.resolve(); await Promise.all([first, second]);
  expect(read).toBe("A"); expect(disk).toBe("B");
});

test("a streaming response holds the lock after the handler returns", async () => {
  const run = await harness(); const a = response(); const b = response(); const started = deferred(); let nextStarted = false;
  const first = run({}, a, async () => { started.resolve(); }); await started.promise;
  const second = run({}, b, async () => { nextStarted = true; b.emit("finish"); });
  await new Promise((resolve) => setImmediate(resolve)); expect(nextStarted).toBe(false);
  a.emit("finish"); await Promise.all([first, second]); expect(nextStarted).toBe(true);
});

test("closing a client does not release a still-running preparation", async () => {
  const run = await harness(); const a = response(); const b = response(); const started = deferred(); const resume = deferred(); let nextStarted = false;
  const first = run({}, a, async () => { started.resolve(); await resume.promise; }); await started.promise;
  a.destroy();
  const second = run({}, b, async () => { nextStarted = true; b.emit("finish"); });
  await new Promise((resolve) => setImmediate(resolve)); expect(nextStarted).toBe(false);
  resume.resolve(); await Promise.all([first, second]); expect(nextStarted).toBe(true);
});

test("a handler failure releases its slot and allows the next response", async () => {
  const run = await harness(); const a = response(); const b = response(); let nextStarted = false;
  const first = run({}, a, async () => { throw new Error("synthetic failure"); });
  const second = run({}, b, async () => { nextStarted = true; b.emit("finish"); });
  await Promise.all([first, second]); expect(a.destroyed).toBe(true); expect(nextStarted).toBe(true);
});
