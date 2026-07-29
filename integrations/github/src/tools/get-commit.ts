import { SlateTool } from 'slates';
import { z } from 'zod';
import { GitHubClient } from '../lib/client';
import { spec } from '../spec';
import { commitSchema, mapCommit, paginationInputShape } from './repository-read-contracts';

export let getCommit = SlateTool.create(spec, {
  name: 'Get Commit Details',
  key: 'get_commit',
  description: 'Get details for a commit from a GitHub repository.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      sha: z.string().describe('Commit SHA, branch name, or tag name'),
      detail: z
        .enum(['none', 'stats', 'full_patch'])
        .default('stats')
        .describe(
          'Changed-file detail: none omits stats/files, stats includes line counts, and full_patch also includes unified diffs'
        ),
      ...paginationInputShape
    })
  )
  .output(
    z.object({
      commit: commitSchema,
      detail: z.enum(['none', 'stats', 'full_patch']),
      page: z.number(),
      perPage: z.number(),
      fileCount: z.number().describe('Number of changed files returned on this page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GitHubClient(ctx.auth);
    let value = await client.getCommit(ctx.input.owner, ctx.input.repo, ctx.input.sha, {
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });
    let commit = mapCommit(value, ctx.input.detail);

    return {
      output: {
        commit,
        detail: ctx.input.detail,
        page: ctx.input.page ?? 1,
        perPage: ctx.input.perPage ?? 30,
        fileCount: commit.files?.length ?? 0
      },
      message: `Retrieved commit \`${commit.sha.slice(0, 12)}\` from **${ctx.input.owner}/${ctx.input.repo}**.`
    };
  })
  .build();
