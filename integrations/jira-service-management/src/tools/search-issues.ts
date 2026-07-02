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
    'Combine conditions with AND/OR and sort with ORDER BY.'
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
        .describe('Index of the first result to return for pagination')
    })
  )
  .output(
    z.object({
      total: z.number().describe('Total number of matching issues'),
      startAt: z.number().describe('Index of the first returned result'),
      maxResults: z.number().describe('Maximum results returned'),
      issues: z.array(issueSchema).describe('List of matching issues')
    })
  )
  .handleInvocation(async ctx => {
    let client = new JiraClient({
      token: ctx.auth.token,
      cloudId: ctx.auth.cloudId
    });

    let result = await client.searchIssues(
      ctx.input.jql,
      ctx.input.fields,
      ctx.input.maxResults,
      ctx.input.startAt
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
        total: result.total,
        startAt: result.startAt,
        maxResults: result.maxResults,
        issues
      },
      message: `Found **${result.total}** issues matching the query. Returned ${issues.length} results starting at index ${result.startAt}.`
    };
  })
  .build();
