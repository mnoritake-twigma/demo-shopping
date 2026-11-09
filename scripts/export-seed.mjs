import ts from 'typescript';
import { readFileSync, writeFileSync } from 'node:fs';
const source=readFileSync(new URL('../src/mocks/seed.ts',import.meta.url),'utf8');
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {products,categories}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
for(const [name,data] of Object.entries({products,categories}))writeFileSync(new URL(`../docs/seed-${name}.json`,import.meta.url),JSON.stringify(data,null,2)+'\n');
console.log('Exported product and category fixtures.');
