import { SlateTool } from 'slates';
import { z } from 'zod';
import { GitHubClient } from '../lib/client';
import { spec } from '../spec';

export let listBranches = SlateTool.create(spec, {
  name: 'List Branches',
  key: 'list_branches',
  description: 'List branches in a GitHub repository.',
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      perPage: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Results per page (minimum 1, maximum 100)'),
      page: z.number().min(1).optional().describe('Page number (minimum 1)')
    })
  )
  .output(
    z.object({
      branches: z.array(
        z.object({
          name: z.string().describe('Branch name'),
          sha: z.string().describe('HEAD commit SHA'),
          protected: z.boolean().describe('Whether the branch is protected')
        })
      ),
      totalCount: z.number().describe('Number of branches returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GitHubClient({
      token: ctx.auth.token,
      instanceUrl: ctx.auth.instanceUrl
    });
    let branches = await client.listBranches(ctx.input.owner, ctx.input.repo, {
      perPage: ctx.input.perPage,
      page: ctx.input.page
    });

    let mapped = branches.map((b: any) => ({
      name: b.name,
      sha: b.commit.sha,
      protected: b.protected
    }));

    return {
      output: { branches: mapped, totalCount: mapped.length },
      message: `Found **${mapped.length}** branches in **${ctx.input.owner}/${ctx.input.repo}**.`
    };
  })
  .build();
