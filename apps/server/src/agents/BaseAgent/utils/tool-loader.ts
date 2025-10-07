// src/agents/BaseAgent/tools-loader.ts
import fs from "node:fs";
import path from "node:path";

export type Ctor<T = unknown> = new (...args: any[]) => T;

export async function loadToolClasses(toolsDir: string) {
  const classes: Ctor[] = [];
  if (!fs.existsSync(toolsDir)) return classes;

  for (const dirent of fs.readdirSync(toolsDir, { withFileTypes: true })) {
    if (!dirent.isDirectory()) continue;

    const name = dirent.name;
    const base = path.join(toolsDir, name, name); // .../<Name>/<Name>
    const jsFile = `${base}.js`;
    const tsFile = `${base}.ts`;
    let mod: any | null = null;
    if (fs.existsSync(jsFile)) {
      mod = await import(jsFile);
    } else if (fs.existsSync(tsFile)) {
      // Works only if you've registered ts-node at startup.
      mod = await import(tsFile);
    } else {
      continue;
    }
    const Klass = mod?.default ?? mod?.[name];
    if (typeof Klass === "function") classes.push(Klass);
  }

  return classes;
}

export function extractFunctionDeclarations(toolClasses: Ctor[]): any[] {
  const fns: any[] = [];
  for (const K of toolClasses) {
    // Prefer a static property, else a static method
    const fd = (K as any).functionDeclaration ??
               (typeof (K as any).getFunctionDeclaration === "function"
                 ? (K as any).getFunctionDeclaration()
                 : undefined);
    if (fd) fns.push(fd);
  }
  return fns;
}
