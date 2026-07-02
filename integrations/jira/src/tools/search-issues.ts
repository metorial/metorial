import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { JiraClient } from '../lib/client';
import { spec } from '../spec';

export let searchIssuesTool = SlateTool.create(spec, {
  name: 'Search Issues',
  key: 'search_issues',
  description: `Search for Jira issues using JQL (Jira Query Language). Returns matching issues with their key fields. Supports pagination and field selection.`,
  instructions: [
    'JQL examples: `project = PROJ AND status = "In Progress"`, `assignee = currentUser() ORDER BY updated DESC`, `labels in ("urgent", "blocker")`.',
    'Use the fields parameter to limit returned fields for better performance.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      jql: z.string().describe('The JQL query string to search for issues.'),
      nextPageToken: z
        .string()
        .optional()
        .describe(
          'Pagination token from a previous response. Pass this to get the next page of results.'
        ),
      maxResults: z
        .number()
        .optional()
        .default(50)
        .describe('Maximum number of results to return (max 100).'),
      fields: z
        .array(z.string())
        .optional()
        .describe('Specific fields to return (e.g., ["summary", "status", "assignee"]).')
    })
  )
  .output(
    z.object({
      total: z.number().describe('Total number of matching issues.'),
      maxResults: z.number().describe('Maximum number of results returned.'),
      nextPageToken: z
        .string()
        .optional()
        .describe('Token to fetch the next page of results. Absent when no more pages.'),
      issues: z
        .array(
          z.object({
            issueId: z.string().describe('The issue ID.'),
            issueKey: z.string().describe('The issue key.'),
            summary: z.string().optional().describe('The issue summary.'),
            status: z.string().optional().describe('The current status name.'),
            issueType: z.string().optional().describe('The issue type name.'),
            priority: z.string().optional().describe('The priority name.'),
            assignee: z.string().optional().nullable().describe('The assignee display name.'),
            updated: z.string().optional().describe('Last updated timestamp.')
          })
        )
        .describe('The matching issues.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new JiraClient({
      token: ctx.auth.token,
      cloudId: ctx.auth.cloudId,
      refreshToken: ctx.auth.refreshToken
    });

    let result = await client.searchIssues(ctx.input.jql, {
      nextPageToken: ctx.input.nextPageToken,
      maxResults: ctx.input.maxResults,
      fields: ctx.input.fields
    });

    let issues = (result.issues ?? []).map((issue: any) => {
      let f = issue.fields ?? {};
      return {
        issueId: issue.id,
        issueKey: issue.key,
        summary: f.summary,
        status: f.status?.name,
        issueType: f.issuetype?.name,
        priority: f.priority?.name,
        assignee: f.assignee?.displayName ?? null,
        updated: f.updated
      };
    });

    let nextPageToken: string | undefined = result.nextPageToken;

    return {
      output: {
        total: result.total ?? issues.length,
        maxResults: result.maxResults ?? ctx.input.maxResults,
        nextPageToken,
        issues
      },
      message: `Found **${result.total ?? issues.length}** issues matching the query. Returned ${issues.length} results.${nextPageToken ? ' More pages available.' : ''}`
    };
  })
  .build();
