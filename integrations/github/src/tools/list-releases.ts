import { SlateTool } from 'slates';
import { z } from 'zod';
import { GitHubClient } from '../lib/client';
import { spec } from '../spec';
import { mapRelease, paginationInputShape, releaseSchema } from './repository-read-contracts';

export let listReleases = SlateTool.create(spec, {
  name: 'List Releases',
  key: 'list_releases',
  description:
    'List releases in a GitHub repository. Regular git tags without an associated release are not included.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      ...paginationInputShape
    })
  )
  .output(
    z.object({
      releases: z.array(releaseSchema),
      page: z.number(),
      perPage: z.number(),
      returnedCount: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = new GitHubClient(ctx.auth);
    let values = await client.listReleases(ctx.input.owner, ctx.input.repo, ctx.input);
    let releases = values.map(mapRelease);
    return {
      output: {
        releases,
        page: ctx.input.page ?? 1,
        perPage: ctx.input.perPage ?? 30,
        returnedCount: releases.length
      },
      message: `Found **${releases.length}** releases in **${ctx.input.owner}/${ctx.input.repo}**.`
    };
  })
  .build();
