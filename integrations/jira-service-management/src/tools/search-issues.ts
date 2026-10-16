import { SlateTool } from 'slates';
import { z } from 'zod';
import { JiraClient } from '../lib/client';
import { spec } from '../spec';

let issueSchema = z.object({
  issueId: z.string().describe('Unique ID of the issue'),
  issueKey: z.string().describe('Human-readable issue key (e.g., PROJ-123)'),
  summary: z.string().optional().describe('Issue summary/title'),
  status: z.string().optional().describe('Current status name'),
  issueType: z.string().optional().describe('Type of the issue'),
  priority: z.string().optional().describe('Priority level'),
  assigneeAccountId: z.string().optional().describe('Account ID of the assignee'),
  assigneeName: z.string().optional().describe('Display name of the assignee'),
  reporterAccountId: z.string().optional().describe('Account ID of the reporter'),
  reporterName: z.string().optional().describe('Display name of the reporter'),
  projectKey: z.string().optional().describe('Project key'),
  projectName: z.string().optional().describe('Project name'),
  created: z.string().optional().describe('Creation timestamp'),
  updated: z.string().optional().describe('Last updated timestamp')
});

export let searchIssuesTool = SlateTool.create(spec, {
  name: 'Search Issues',
  key: 'search_issues',
  description: `Search for Jira issues using JQL (Jira Query Language). Supports filtering by project, status, assignee, priority, labels, and any other issue fields.
Use JQL syntax like \`project = "KEY" AND status = "Open"\` or \`assignee = currentUser() ORDER BY updated DESC\`.`,
  instructions: [
    'Use JQL syntax for the query parameter. Examples: `project = PROJ`, `status = "In Progress"`, `assignee = accountId`.',
    'Combine conditions with AND/OR and sort with ORDER BY.',
    'For efficient pagination, pass the returned nextPageToken and omit startAt. With a cursor, startAt skips relative to that cursor.',
    'Search stops after the requested result window and is limited to 10 API requests and 30 seconds, including offset skipping. Narrow the query or use cursors for deep pagination.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      jql: z.string().describe('JQL query string to search issues'),
      fields: z
        .array(z.string())
        .optional()
        .describe('Specific fields to return (e.g., ["summary", "status", "assignee"])'),
      maxResults: z
        .number()
        .optional()
        .describe('Maximum number of results to return (default: 50, max: 100)'),
      startAt: z
        .number()
        .optional()
        .describe('Offset from the search start, or relative to nextPageToken when provided'),
      nextPageToken: z
        .string()
        .optional()
        .describe(
          'Continuation cursor from a previous search_issues response. Omit startAt to return the next page directly.'
        )
    })
  )
  .output(
    z.object({
      total: z
        .number()
        .optional()
        .describe(
          'Exact total, when available. The current enhanced search API does not provide this field.'
        ),
      startAt: z
        .number()
        .describe('Requested offset relative to the search start or supplied cursor'),
      maxResults: z.number().describe('Maximum results returned'),
      issues: z.array(issueSchema).describe('List of matching issues'),
      returnedCount: z
        .number()
        .optional()
        .describe('Number of issues returned in this response; not a total match count'),
      nextPageToken: z
        .string()
        .optional()
        .describe('Cursor for the next page, when returned by Jira'),
      isLast: z
        .boolean()
        .optional()
        .describe('Whether Jira marked the final provider page reached by this response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new JiraClient(ctx.auth);

    let result = await client.searchIssues(
      ctx.input.jql,
      ctx.input.fields,
      ctx.input.maxResults,
      ctx.input.startAt,
      ctx.input.nextPageToken
    );

    let issues = (result.issues || []).map((issue: any) => ({
      issueId: issue.id,
      issueKey: issue.key,
      summary: issue.fields?.summary,
      status: issue.fields?.status?.name,
      issueType: issue.fields?.issuetype?.name,
      priority: issue.fields?.priority?.name,
      assigneeAccountId: issue.fields?.assignee?.accountId,
      assigneeName: issue.fields?.assignee?.displayName,
      reporterAccountId: issue.fields?.reporter?.accountId,
      reporterName: issue.fields?.reporter?.displayName,
      projectKey: issue.fields?.project?.key,
      projectName: issue.fields?.project?.name,
      created: issue.fields?.created,
      updated: issue.fields?.updated
    }));

    return {
      output: {
        startAt: result.startAt,
        maxResults: result.maxResults,
        issues,
        returnedCount: issues.length,
        nextPageToken: result.nextPageToken,
        isLast: result.isLast
      },
      message: `Returned **${issues.length}** issues starting at offset ${result.startAt}${ctx.input.nextPageToken ? ' from the supplied cursor' : ''}.${result.nextPageToken ? ' Use nextPageToken to continue.' : ''}`
    };
  })
  .build();
