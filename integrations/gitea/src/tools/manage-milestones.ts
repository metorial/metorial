import { SlateTool } from 'slates';
import { z } from 'zod';
import { GiteaClient } from '../lib/client';
import { spec } from '../spec';

let milestoneOutputSchema = z.object({
  milestoneId: z.number().describe('Milestone ID'),
  title: z.string().describe('Milestone title'),
  description: z.string().describe('Milestone description'),
  state: z.string().describe('Milestone state (open or closed)'),
  openIssues: z.number().describe('Number of open issues'),
  closedIssues: z.number().describe('Number of closed issues'),
  dueOn: z.string().optional().describe('Due date'),
  closedAt: z.string().optional().describe('Closed timestamp'),
  createdAt: z.string().describe('Creation timestamp'),
  updatedAt: z.string().describe('Last update timestamp')
});

export let listMilestones = SlateTool.create(spec, {
  name: 'List Milestones',
  key: 'list_milestones',
  description: `List milestones in a repository with their progress (open/closed issue counts). Useful for finding milestone IDs needed when creating or updating issues.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      state: z
        .enum(['open', 'closed', 'all'])
        .optional()
        .describe('Filter by milestone state'),
      page: z.number().optional().describe('Page number'),
      limit: z.number().optional().describe('Results per page')
    })
  )
  .output(
    z.object({
      milestones: z.array(milestoneOutputSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new GiteaClient({ token: ctx.auth.token, baseUrl: ctx.auth.baseUrl });
    let milestones = await client.listMilestones(ctx.input.owner, ctx.input.repo, {
      state: ctx.input.state,
      page: ctx.input.page,
      limit: ctx.input.limit
    });

    return {
      output: {
        milestones: milestones.map(m => ({
          milestoneId: m.id,
          title: m.title,
          description: m.description || '',
          state: m.state,
          openIssues: m.open_issues,
          closedIssues: m.closed_issues,
          dueOn: m.due_on || undefined,
          closedAt: m.closed_at || undefined,
          createdAt: m.created_at,
          updatedAt: m.updated_at
        }))
      },
      message: `Found **${milestones.length}** milestones in **${ctx.input.owner}/${ctx.input.repo}**`
    };
  })
  .build();

export let createMilestone = SlateTool.create(spec, {
  name: 'Create Milestone',
  key: 'create_milestone',
  description: `Create a new milestone in a repository for tracking progress on a group of issues and pull requests.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      title: z.string().describe('Milestone title'),
      description: z.string().optional().describe('Milestone description'),
      dueOn: z.string().optional().describe('Due date in ISO 8601 format')
    })
  )
  .output(milestoneOutputSchema)
  .handleInvocation(async ctx => {
    let client = new GiteaClient({ token: ctx.auth.token, baseUrl: ctx.auth.baseUrl });
    let m = await client.createMilestone(ctx.input.owner, ctx.input.repo, {
      title: ctx.input.title,
      description: ctx.input.description,
      dueOn: ctx.input.dueOn
    });

    return {
      output: {
        milestoneId: m.id,
        title: m.title,
        description: m.description || '',
        state: m.state,
        openIssues: m.open_issues,
        closedIssues: m.closed_issues,
        dueOn: m.due_on || undefined,
        closedAt: m.closed_at || undefined,
        createdAt: m.created_at,
        updatedAt: m.updated_at
      },
      message: `Created milestone **${m.title}** in **${ctx.input.owner}/${ctx.input.repo}**`
    };
  })
  .build();
