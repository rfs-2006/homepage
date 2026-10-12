// 이름 끝에 점·공백이 붙어 윈도우에서 안 열리는 폴더·파일 이름을 고친다.
//   node fixnames.mjs            (기본 ~/rfs-cafe)
//   node fixnames.mjs 폴더경로
import { readdirSync, renameSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const root = process.argv[2] || join(homedir(), 'rfs-cafe');
let fixed = 0;
function walk(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === '.profile') continue;
    let name = e.name;
    const clean = name.replace(/[. ]+$/, '');
    if (clean && clean !== name) {
      if (existsSync(join(dir, clean))) { console.log('이미 있음, 건너뜀:', join(dir, name)); }
      else { renameSync(join(dir, name), join(dir, clean)); name = clean; fixed++; }
    }
    if (e.isDirectory()) walk(join(dir, name));
  }
}
walk(root);
console.log('고친 이름', fixed, '개');
