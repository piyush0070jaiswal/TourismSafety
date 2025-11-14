#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

function usage(){
  console.log('Usage: node scripts/generate-telemetry.mjs <count> [outFile.jsonl]');
}

const count = Number(process.argv[2] ?? '10');
const outFile = process.argv[3] || 'telemetry.generated.jsonl';
if (!Number.isFinite(count) || count <= 0) { usage(); process.exit(2); }

const now = Date.now();
function uuid(idx){
  const base = ("00000000" + idx.toString(16)).slice(-8);
  return `550e8400-e29b-41d4-a716-${base.padStart(12,'0')}`;
}

let lines = [];
for (let i=0;i<count;i++){
  const ts = new Date(now - (count - i) * 1000).toISOString();
  const lat = 19.05 + Math.random() * 0.1;
  const lon = 72.85 + Math.random() * 0.1;
  const hr = Math.floor(60 + Math.random()*80);
  const sos = Math.random() < 0.05 ? true : undefined;
  const obj = { deviceId: uuid(i), ts, lat, lon, hr };
  if (sos) obj.sos = true;
  lines.push(JSON.stringify(obj));
}

fs.writeFileSync(path.resolve(process.cwd(), outFile), lines.join('\n'));
console.log(`Wrote ${lines.length} payloads to ${outFile}`);
