import { SlateTool } from 'slates';
import { z } from 'zod';
import { GitHubClient } from '../lib/client';
import { spec } from '../spec';
import { mapRelease, releaseSchema } from './repository-read-contracts';

export let getLatestRelease = SlateTool.create(spec, {
  name: 'Get Latest Release',
  key: 'get_latest_release',
  description:
    'Get the latest published full release in a GitHub repository. Drafts and prereleases are excluded by GitHub.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name')
    })
  )
  .output(releaseSchema)
  .handleInvocation(async ctx => {
    let client = new GitHubClient(ctx.auth);
    let release = mapRelease(await client.getLatestRelease(ctx.input.owner, ctx.input.repo));
    return {
      output: release,
      message: `Retrieved latest release **${release.tagName}** from **${ctx.input.owner}/${ctx.input.repo}**.`
    };
  })
  .build();
