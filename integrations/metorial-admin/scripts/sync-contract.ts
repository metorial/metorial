import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { $ } from 'bun';
import { DEFAULT_API_VERSION } from '../src/config';
import { contractBreaks, contractVersionBreaks } from '../src/lib/contractGuard';

let apiUrl = process.env.API_URL || 'https://api.metorial.com';
let out = path.resolve(import.meta.dir, '../src/lib/contract.json');
let packageJson = path.resolve(import.meta.dir, '../package.json');

let bumpVersion = async () => {
  let pkg = await Bun.file(packageJson).json();
  let [release, prerelease] = pkg.version.split('-');
  let [major, minor, patch] = release.split('.').map(Number);
  pkg.version = prerelease ? release : `${major}.${minor}.${patch + 1}`;
  await Bun.write(packageJson, `${JSON.stringify(pkg, null, 2)}\n`);
  return pkg.version as string;
};

let sync = async () => {
  let workDir = await mkdtemp(path.join(tmpdir(), 'metorial-admin-sync-'));
  try {
    let cliDir = process.env.METORIAL_CLI_DIR;
    if (!cliDir) {
      cliDir = path.join(workDir, 'cli');
      await $`git clone --depth 1 https://github.com/metorial/cli ${cliDir}`;
    }

    let generated = path.join(workDir, 'contract.json');
    await $`bun src/index.ts ${apiUrl} --target slate --out ${generated}`.cwd(
      path.join(cliDir, 'generator')
    );

    let previousText = await Bun.file(out).text();
    let nextText = await Bun.file(generated).text();
    let next = JSON.parse(nextText);
    let versionBreaks = contractVersionBreaks(next, DEFAULT_API_VERSION);
    let breaks = contractBreaks(JSON.parse(previousText), next);

    if (versionBreaks.length) {
      console.error(
        `The new contract targets a different Metorial API version than the integration default, so contract.json was left unchanged. Update DEFAULT_API_VERSION in src/config.ts together with the contract.\n  ${versionBreaks.join('\n  ')}`
      );
      process.exitCode = 1;
    } else if (breaks.length) {
      console.error(
        `The new contract breaks existing tools, so contract.json was left unchanged. Pin keys with manifest key overrides or deprecate by hand.\n  ${breaks.join('\n  ')}`
      );
      process.exitCode = 1;
    } else if (nextText !== previousText) {
      await Bun.write(out, nextText);
      if (process.argv.includes('--bump')) console.log(await bumpVersion());
    }
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
};

if (import.meta.main) await sync();
