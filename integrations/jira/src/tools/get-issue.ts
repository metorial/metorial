import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { JiraClient } from '../lib/client';
import { resolveJiraIssueIdOrKey } from '../lib/errors';
import { spec } from '../spec';

export let getIssueTool = SlateTool.create(spec, {
  name: 'Get Issue',
  key: 'get_issue',
  description: `Retrieve detailed information about a Jira issue by its key or ID. Returns the full issue data including all fields, status, assignee, reporter, comments, and changelog. Optionally expand additional information like transitions, rendered fields, or changelog.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      issueIdOrKey: z
        .string()
        .optional()
        .describe('The issue key (e.g., "PROJ-123") or numeric ID. Preferred field.'),
      issueKey: z
        .string()
        .optional()
        .describe('Legacy alias for issueIdOrKey, used only when issueIdOrKey is omitted.'),
      fields: z
        .array(z.string())
        .optional()
        .describe(
          'Specific field keys to return (e.g., ["summary", "status", "assignee"]). Returns all fields if omitted.'
        ),
      expand: z
        .array(z.string())
        .optional()
        .describe(
          'Additional data to expand (e.g., ["changelog", "transitions", "renderedFields"]).'
        )
    })
  )
  .output(
    z.object({
      issueId: z.string().describe('The issue ID.'),
      issueKey: z.string().describe('The issue key.'),
      selfUrl: z.string().describe('The API URL for this issue.'),
      summary: z.string().optional().describe('The issue summary.'),
      status: z.string().optional().describe('The current status name.'),
      issueType: z.string().optional().describe('The issue type name.'),
      priority: z.string().optional().describe('The priority name.'),
      assignee: z
        .object({
          accountId: z.string(),
          displayName: z.string()
        })
        .optional()
        .nullable()
        .describe('The assigned user.'),
      reporter: z
        .object({
          accountId: z.string(),
          displayName: z.string()
        })
        .optional()
        .nullable()
        .describe('The reporter.'),
      projectKey: z.string().optional().describe('The project key.'),
      labels: z.array(z.string()).optional().describe('Labels on the issue.'),
      created: z.string().optional().describe('Created timestamp.'),
      updated: z.string().optional().describe('Last updated timestamp.'),
      description: z.any().optional().describe('The issue description in ADF format.'),
      fields: z.record(z.string(), z.any()).optional().describe('All returned fields.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new JiraClient({
      token: ctx.auth.token,
      cloudId: ctx.auth.cloudId,
      refreshToken: ctx.auth.refreshToken
    });

    let issueIdOrKey = resolveJiraIssueIdOrKey(ctx.input);
    let issue = await client.getIssue(issueIdOrKey, {
      fields: ctx.input.fields,
      expand: ctx.input.expand
    });

    let f = issue.fields ?? {};

    return {
      output: {
        issueId: issue.id,
        issueKey: issue.key,
        selfUrl: issue.self,
        summary: f.summary,
        status: f.status?.name,
        issueType: f.issuetype?.name,
        priority: f.priority?.name,
        assignee: f.assignee
          ? {
              accountId: f.assignee.accountId,
              displayName: f.assignee.displayName
            }
          : null,
        reporter: f.reporter
          ? {
              accountId: f.reporter.accountId,
              displayName: f.reporter.displayName
            }
          : null,
        projectKey: f.project?.key,
        labels: f.labels,
        created: f.created,
        updated: f.updated,
        description: f.description,
        fields: f
      },
      message: `Retrieved issue **${issue.key}**: ${f.summary ?? 'No summary'} (${f.status?.name ?? 'Unknown status'}).`
    };
  })
  .build();
