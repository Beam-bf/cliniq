// Checks local configured secrets without printing their values or reading git-ignored data.
import {execFileSync} from 'node:child_process';
import {readFileSync,readdirSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {readServerEnvironment} from '../knowledge/serverEnv.ts';
const env=readServerEnvironment();
const names=['AI_API_KEY','AI_ACCOUNT_ID','ANTHROPIC_API_KEY','POLICY_API_TOKEN','POLICY_SERVICE_TOKEN'];
const secrets=names.map(name=>env[name]).filter(value=>value&&value.length>=12);
const files=execFileSync('git',['ls-files','-c','-o','--exclude-standard','-z'],{encoding:'utf8'}).split('\0').filter(Boolean);
function walk(path) {return readdirSync(path,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?walk(join(path,entry.name)):[join(path,entry.name)]);}
const assets=existsSync('dist')?walk('dist'):[];
let hits=0;
for(const path of [...new Set([...files,...assets])]) {
  const bytes=readFileSync(path);
  if(secrets.some(value=>bytes.includes(Buffer.from(value)))) {console.error(`FAIL configured secret exposure in ${path}`);hits++;}
}
const tracked=execFileSync('git',['ls-files','-z'],{encoding:'utf8'}).split('\0');
const forbidden=tracked.filter(path=>/(?:^|\/)(?:\.dev\.vars|\.env(?:\..*)?|\.knowledge\/|\.browser-qa\/)|\.(?:sqlite3?|db|onnx|pdf)$/i.test(path));
if(forbidden.length) {console.error(`FAIL tracked environment/source/database artifacts: ${forbidden.join(', ')}`);hits+=forbidden.length;}
console.log(`${hits?'FAIL':'PASS'} secret boundary: ${files.length} repository files, ${assets.length} built assets, ${secrets.length} configured secret values checked; no values printed.`);
if(hits)process.exitCode=1;
