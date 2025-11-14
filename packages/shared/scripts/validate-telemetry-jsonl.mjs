#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import schema from '../../schemas/json/telemetry.v1.json' with { type: 'json' };

function usage(){
  console.log('Usage: node scripts/validate-telemetry-jsonl.mjs <file.jsonl>');
}

const fileArg = process.argv[2];
const file = path.isAbsolute(fileArg || '') ? (fileArg || '') : path.join(process.cwd(), fileArg || '');
if (!fileArg) { usage(); process.exit(2); }

let contents = '';
try { contents = fs.readFileSync(file, 'utf-8'); } catch (e) {
  console.error('Failed to read file:', e?.message || e);
  process.exit(2);
}

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);
const validate = ajv.compile(schema);

let total = 0, valid = 0, invalid = 0;
const errors = [];
for (const line of contents.split(/\r?\n/)) {
  if (!line.trim()) continue;
  total++;
  let obj;
  try { obj = JSON.parse(line); } catch (e) {
    invalid++;
    errors.push({ line: total, error: 'Invalid JSON' });
    continue;
  }
  const ok = validate(obj);
  if (ok) valid++; else { invalid++; errors.push({ line: total, errorList: validate.errors }); }
}

console.log(JSON.stringify({ total, valid, invalid, ok: invalid === 0, errors }, null, 2));
process.exit(invalid === 0 ? 0 : 1);
