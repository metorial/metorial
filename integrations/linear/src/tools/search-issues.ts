import { SlateTool } from 'slates';
import { z } from 'zod';
import { LinearClient } from '../lib/client';
import { spec } from '../spec';
import { mapIssueToOutput } from './create-issue';

export let searchIssuesTool = SlateTool.create(spec, {
  name: 'Search Issues',
  key: 'search_issues',
  description: `Searches Linear issues using text/vector similarity search. Returns matching issues ranked by relevance.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().describe('Search query text'),
      teamId: z.string().optional().describe('Limit search to a specific team'),
      first: z.number().optional().describe('Number of results to return (default: 50)'),
      after: z.string().optional().describe('Pagination cursor'),
      includeArchived: z.boolean().optional().describe('Include archived issues in results')
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

    let result = await client.searchIssues(ctx.input.query, {
      teamId: ctx.input.teamId,
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
      message: `Found **${issues.length}** issues matching "${ctx.input.query}"`
    };
  })
  .build();
