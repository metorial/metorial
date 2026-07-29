import { SlateTool } from 'slates';
import { z } from 'zod';
import { GitHubClient } from '../lib/client';
import { spec } from '../spec';
import { mapRelease, releaseSchema } from './repository-read-contracts';

export let getReleaseByTag = SlateTool.create(spec, {
  name: 'Get Release by Tag',
  key: 'get_release_by_tag',
  description: 'Get a published GitHub release by its tag name.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      tag: z.string().describe("Tag name, for example 'v1.0.0'")
    })
  )
  .output(releaseSchema)
  .handleInvocation(async ctx => {
    let client = new GitHubClient(ctx.auth);
    let release = mapRelease(
      await client.getReleaseByTag(ctx.input.owner, ctx.input.repo, ctx.input.tag)
    );
    return {
      output: release,
      message: `Retrieved release **${release.tagName}** from **${ctx.input.owner}/${ctx.input.repo}**.`
    };
  })
  .build();
