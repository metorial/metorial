import { SlateTool } from 'slates';
import { z } from 'zod';
import { GitHubClient } from '../lib/client';
import { spec } from '../spec';

export let listMilestones = SlateTool.create(spec, {
  name: 'List Milestones',
  key: 'list_milestones',
  description:
    'List milestones in a GitHub repository with their numbers, titles, state, due dates, and issue counts. Use the milestone number with manage_issue to assign an issue to a milestone.',
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      owner: z.string().describe('Repository owner (user or organization)'),
      repo: z.string().describe('Repository name'),
      state: z
        .enum(['open', 'closed', 'all'])
        .optional()
        .describe('Filter by milestone state (default: open)'),
      sort: z
        .enum(['due_on', 'completeness'])
        .optional()
        .describe('Sort by due date or completeness (default: due_on)'),
      direction: z.enum(['asc', 'desc']).optional().describe('Sort direction (default: asc)'),
      perPage: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Results per page (minimum 1, maximum 100; default 30)'),
      page: z.number().min(1).optional().describe('Page number (minimum 1)')
    })
  )
  .output(
    z.object({
      milestones: z.array(
        z.object({
          milestoneNumber: z
            .number()
            .describe('Milestone number used by manage_issue milestone'),
          milestoneId: z.number().describe('Unique milestone ID'),
          title: z.string().describe('Milestone title'),
          description: z.string().nullable().describe('Milestone description'),
          state: z.string().describe('Milestone state'),
          openIssues: z.number().describe('Number of open issues'),
          closedIssues: z.number().describe('Number of closed issues'),
          dueOn: z.string().nullable().describe('Due date timestamp'),
          htmlUrl: z.string().describe('URL to the milestone on GitHub'),
          createdAt: z.string().describe('Creation timestamp'),
          updatedAt: z.string().describe('Last update timestamp'),
          closedAt: z.string().nullable().describe('Closure timestamp')
        })
      ),
      totalCount: z.number().describe('Number of milestones returned'),
      hasNextPage: z
        .boolean()
        .describe('Whether GitHub reports another page; request page + 1 to continue')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GitHubClient({
      token: ctx.auth.token,
      instanceUrl: ctx.auth.instanceUrl
    });
    let result = await client.listMilestones(ctx.input.owner, ctx.input.repo, {
      state: ctx.input.state,
      sort: ctx.input.sort,
      direction: ctx.input.direction,
      perPage: ctx.input.perPage,
      page: ctx.input.page
    });

    let milestones = result.items.map((milestone: any) => ({
      milestoneNumber: milestone.number,
      milestoneId: milestone.id,
      title: milestone.title,
      description: milestone.description ?? null,
      state: milestone.state,
      openIssues: milestone.open_issues ?? 0,
      closedIssues: milestone.closed_issues ?? 0,
      dueOn: milestone.due_on ?? null,
      htmlUrl: milestone.html_url,
      createdAt: milestone.created_at,
      updatedAt: milestone.updated_at,
      closedAt: milestone.closed_at ?? null
    }));

    return {
      output: {
        milestones,
        totalCount: milestones.length,
        hasNextPage: result.hasNextPage
      },
      message: `Found **${milestones.length}** milestones in **${ctx.input.owner}/${ctx.input.repo}** (state: ${ctx.input.state ?? 'open'}).`
    };
  })
  .build();
