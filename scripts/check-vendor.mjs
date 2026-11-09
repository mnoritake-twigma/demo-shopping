import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const manifest=JSON.parse(readFileSync(new URL('../docs/vendor-manifest.json',import.meta.url)));
let errors=0;
for(const [path,expected] of Object.entries(manifest.files)){
 const actual=createHash('sha256').update(readFileSync(new URL('../src/vendor/mnoritake-ds/'+path,import.meta.url))).digest('hex');
 if(actual!==expected){console.error('Modified upstream file: '+path);errors++;}
}
if(errors)process.exit(1);
console.log(`${Object.keys(manifest.files).length} upstream files are unchanged (${manifest.commit}).`);
