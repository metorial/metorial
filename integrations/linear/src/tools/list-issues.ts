import { SlateTool } from 'slates';
import { z } from 'zod';
import { LinearClient } from '../lib/client';
import { spec } from '../spec';
import { mapIssueToOutput } from './create-issue';

export let listIssuesTool = SlateTool.create(spec, {
  name: 'List Issues',
  key: 'list_issues',
  description: `Lists issues from Linear with optional filtering by team, assignee, project, cycle, or workflow state. Returns paginated results.`,
  instructions: [
    'Use cursor-based pagination with the "after" parameter and the returned "nextCursor" value.',
    'Combine multiple filters to narrow results — all filters are applied with AND logic.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      teamId: z.string().optional().describe('Filter by team ID'),
      assigneeId: z.string().optional().describe('Filter by assignee user ID'),
      projectId: z.string().optional().describe('Filter by project ID'),
      cycleId: z.string().optional().describe('Filter by cycle ID'),
      stateId: z.string().optional().describe('Filter by workflow state ID'),
      first: z
        .number()
        .optional()
        .describe('Number of issues to return (default: 50, max: 250)'),
      after: z.string().optional().describe('Pagination cursor from previous response'),
      includeArchived: z.boolean().optional().describe('Include archived issues')
    })
  )
  .output(
    z.object({
      issues: z.array(
        z.object({
          issueId: z.string(),
          identifier: z.string(),
          title: z.string(),
          description: z.string().nullable(),
          priority: z.number(),
          priorityLabel: z.string(),
          estimate: z.number().nullable(),
          dueDate: z.string().nullable(),
          url: z.string(),
          teamId: z.string(),
          teamName: z.string(),
          stateId: z.string(),
          stateName: z.string(),
          assigneeId: z.string().nullable(),
          assigneeName: z.string().nullable(),
          projectId: z.string().nullable(),
          projectName: z.string().nullable(),
          labels: z.array(
            z.object({
              labelId: z.string(),
              name: z.string(),
              color: z.string()
            })
          ),
          createdAt: z.string(),
          updatedAt: z.string()
        })
      ),
      hasNextPage: z.boolean(),
      nextCursor: z.string().nullable()
    })
  )
  .handleInvocation(async ctx => {
    let client = new LinearClient(ctx.auth.token);

    let result = await client.listIssues({
      teamId: ctx.input.teamId,
      assigneeId: ctx.input.assigneeId,
      projectId: ctx.input.projectId,
      cycleId: ctx.input.cycleId,
      stateId: ctx.input.stateId,
      first: ctx.input.first,
      after: ctx.input.after,
      includeArchived: ctx.input.includeArchived
    });

    let issues = (result.nodes || []).map(mapIssueToOutput);

    return {
      output: {
        issues,
        hasNextPage: result.pageInfo?.hasNextPage || false,
        nextCursor: result.pageInfo?.endCursor || null
      },
      message: `Found **${issues.length}** issues${result.pageInfo?.hasNextPage ? ' (more available)' : ''}`
    };
  })
  .build();
