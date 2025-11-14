#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import schema from '../../schemas/json/telemetry.v1.json' with { type: 'json' };

function usage(){
  console.log('Usage: node scripts/validate-telemetry.mjs <file.json>');
}

const fileArg = process.argv[2];
const file = path.isAbsolute(fileArg) ? fileArg : path.join(process.cwd(), fileArg || '');
if(!file){ usage(); process.exit(2); }

let data;
try{
  data = JSON.parse(fs.readFileSync(file,'utf-8'));
}catch(e){
  console.error('Failed to read/parse JSON:', e.message);
  process.exit(2);
}

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);
const validate = ajv.compile(schema);
const ok = validate(data);
if(ok){
  console.log('VALID');
  process.exit(0);
}else{
  console.log('INVALID');
  console.log(JSON.stringify(validate.errors, null, 2));
  process.exit(1);
}
