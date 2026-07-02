import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listPullRequestsTool = SlateTool.create(spec, {
  name: 'List Pull Requests',
  key: 'list_pull_requests',
  description: `List pull requests for a repository. Filter by state (OPEN, MERGED, DECLINED, SUPERSEDED) to find specific PRs.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      repoSlug: z.string().describe('Repository slug'),
      state: z
        .enum(['OPEN', 'MERGED', 'DECLINED', 'SUPERSEDED'])
        .optional()
        .describe('Filter by PR state'),
      page: z.number().optional().describe('Page number'),
      pageLen: z.number().optional().describe('Results per page (max 50)')
    })
  )
  .output(
    z.object({
      pullRequests: z.array(
        z.object({
          pullRequestId: z.number(),
          title: z.string(),
          state: z.string(),
          author: z.string().optional(),
          sourceBranch: z.string().optional(),
          destinationBranch: z.string().optional(),
          createdOn: z.string().optional(),
          updatedOn: z.string().optional(),
          htmlUrl: z.string().optional(),
          commentCount: z.number().optional(),
          taskCount: z.number().optional()
        })
      ),
      totalCount: z.number().optional(),
      hasNextPage: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, workspace: ctx.config.workspace });

    let result = await client.listPullRequests(ctx.input.repoSlug, {
      state: ctx.input.state,
      page: ctx.input.page,
      pageLen: ctx.input.pageLen
    });

    let pullRequests = (result.values || []).map((pr: any) => ({
      pullRequestId: pr.id,
      title: pr.title,
      state: pr.state,
      author: pr.author?.display_name || undefined,
      sourceBranch: pr.source?.branch?.name || undefined,
      destinationBranch: pr.destination?.branch?.name || undefined,
      createdOn: pr.created_on,
      updatedOn: pr.updated_on,
      htmlUrl: pr.links?.html?.href || undefined,
      commentCount: pr.comment_count,
      taskCount: pr.task_count
    }));

    return {
      output: {
        pullRequests,
        totalCount: result.size,
        hasNextPage: !!result.next
      },
      message: `Found **${pullRequests.length}** pull requests${ctx.input.state ? ` with state ${ctx.input.state}` : ''}.`
    };
  })
  .build();
