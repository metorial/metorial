import { anyOf, SlateTool } from 'slates';
import { z } from 'zod';
import { GitHubClient } from '../lib/client';
import { spec } from '../spec';

export let createBranch = SlateTool.create(spec, {
  name: 'Create Branch',
  key: 'create_branch',
  description: 'Create a new branch in a GitHub repository.',
  tags: { destructive: false }
})
  .scopes(anyOf('repo', 'public_repo'))
  .input(
    z.object({
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      branch: z.string().describe('Name for new branch'),
      from_branch: z.string().optional().describe('Source branch (defaults to repo default)')
    })
  )
  .output(
    z.object({
      ref: z.string().describe('Full git ref for the created branch'),
      branch: z.string().describe('Created branch name'),
      sha: z.string().describe('Commit SHA targeted by the new branch'),
      url: z.string().optional().describe('GitHub API URL for the branch ref')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GitHubClient(ctx.auth);
    let result = await client.createBranch(
      ctx.input.owner,
      ctx.input.repo,
      ctx.input.branch,
      ctx.input.from_branch
    );

    return {
      output: {
        ref: result.ref,
        branch: ctx.input.branch,
        sha: result.object.sha,
        url: result.url
      },
      message: `Created branch \`${ctx.input.branch}\` in **${ctx.input.owner}/${ctx.input.repo}** from \`${ctx.input.from_branch ?? 'the default branch'}\`.`
    };
  })
  .build();
