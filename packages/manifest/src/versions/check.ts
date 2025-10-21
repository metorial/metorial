import { canonicalize } from '@metorial-mcp-containers/canonicalize';
import { nixpacksPlan } from '@metorial-mcp-containers/nixpacks';
import { $ } from 'bun';
import fs from 'fs-extra';
import PQueue from 'p-queue';
import path from 'path';
import { getAllServers } from '../manifest/getServers';
import { readManifest } from '../manifest/read';
import { rootDir } from '../root';
import type { ServerVersion } from './get';
import { generateRepoReadme } from './readme/repo';
import { generateServerReadme } from './readme/server';

export let checkVersions = async (opts: { force?: boolean; only?: string[] }) => {
  let servers = await getAllServers();

  let catalogDir = path.join(rootDir, 'catalog');

  let normalizedServers = servers.map(s => ({
    id: s.id,
    owner: s.repo.owner,
    repo: s.repo.repo,
    repoUrl: s.repo.url
  }));

  await fs.writeFile(
    path.join(catalogDir, 'index.json'),
    JSON.stringify(normalizedServers, null, 2)
  );

  await fs.writeFile(
    path.join(rootDir, 'DOCKER_SERVERS.md'),
    await generateRepoReadme(servers)
  );

  let queue = new PQueue({ concurrency: 10 });

  for (let server of servers) {
    if (opts.only && !opts.only.includes(server.id) && !opts.only.includes(server.fullId)) {
      continue;
    }

    queue.add(async () => {
      try {
        let version = (
          await $`git ls-remote ${server.repo.url} ${server.repo.branch} | awk '{ print $1 }'`.text()
        )
          .trim()
          .split(' ')[0]
          .split('\n')[0];

        let fullServerId = `${server.repo.owner}/${server.repo.repo}/${server.id}`;
        let manifest = await readManifest(fullServerId);
        let canonicalizedManifest = canonicalize(manifest);
        let manifestHash = Bun.CryptoHasher.hash('sha3-512', canonicalizedManifest)
          .toHex()
          .slice(0, 32);

        let serverDir = path.join(catalogDir, server.repo.owner, server.repo.repo, server.id);
        let versionsDir = path.join(serverDir, 'versions');
        let versionDir = path.join(versionsDir, version);
        let versionFilePath = path.join(versionDir, 'version.json');

        let versionManifest: ServerVersion | undefined;

        let versionExists =
          (await fs.pathExists(versionDir)) && (await fs.pathExists(versionFilePath));
        if (versionExists) {
          versionManifest = await fs.readJSON(versionFilePath, 'utf-8');

          if (versionManifest!.manifestHash != manifestHash) {
            versionExists = false;

            console.log(
              `Version ${version} for ${fullServerId} exists but has a different manifest, rebuilding`
            );

            await fs.remove(versionDir);
          }
        }

        if (!versionExists || opts.force) {
          console.log(`Creating version ${version} for ${fullServerId}`);

          try {
            let plan = await nixpacksPlan(fullServerId, version);

            versionManifest = {
              serverId: fullServerId,
              version,
              manifest,
              manifestHash,
              createdAt: new Date().toISOString(),
              builder: [
                {
                  type: 'nixpacks',
                  plan
                }
              ]
            };

            await fs.mkdirp(versionDir);
            await fs.writeFile(versionFilePath, JSON.stringify(versionManifest, null, 2));
          } catch (e: any) {
            console.error(`Error creating version ${version} for ${fullServerId}:`);

            if (e.stdout) console.log(await new Response(e.stdout).text());
            if (e.stderr) console.log(await new Response(e.stderr).text());

            throw e;
          }
        } else {
          console.log(`Version ${version} for ${fullServerId} already exists`);
        }

        if (versionManifest) {
          await fs.writeFile(
            path.join(serverDir, 'README.md'),
            await generateServerReadme(server, versionManifest)
          );
        }
      } catch (e: any) {
        console.error(`Error processing ${server.id}: ${e.message}`);
        console.error(e);
      }
    });
  }

  await queue.onIdle();
};
