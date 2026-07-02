import { SlateTool } from 'slates';
import { z } from 'zod';
import { GitHubClient } from '../lib/client';
import { spec } from '../spec';

export let listBranches = SlateTool.create(spec, {
  name: 'List Branches',
  key: 'list_branches',
  description: `List branches in a GitHub repository with optional filtering for protected branches.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      protected: z.boolean().optional().describe('Filter by protection status'),
      perPage: z.number().optional().describe('Results per page (max 100)'),
      page: z.number().optional().describe('Page number')
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
      page: ctx.input.page,
      protected: ctx.input.protected
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
