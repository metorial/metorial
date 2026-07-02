import { SlateTool } from 'slates';
import { z } from 'zod';
import { JiraClient } from '../lib/client';
import { spec } from '../spec';

export let getIssueTool = SlateTool.create(spec, {
  name: 'Get Issue',
  key: 'get_issue',
  description: `Retrieve detailed information about a specific Jira issue by its key or ID. Returns the full issue fields including summary, description, status, assignee, comments, transitions, and SLA information for service desk requests.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      issueIdOrKey: z.string().describe('Issue key (e.g., PROJ-123) or numeric issue ID'),
      fields: z
        .array(z.string())
        .optional()
        .describe('Specific fields to return. Omit to get all fields.'),
      includeTransitions: z
        .boolean()
        .optional()
        .describe('Whether to include available workflow transitions')
    })
  )
  .output(
    z.object({
      issueId: z.string().describe('Unique ID of the issue'),
      issueKey: z.string().describe('Human-readable issue key'),
      selfUrl: z.string().optional().describe('REST API URL of the issue'),
      summary: z.string().optional().describe('Issue summary/title'),
      description: z.any().optional().describe('Issue description (ADF format)'),
      status: z.string().optional().describe('Current status name'),
      statusCategory: z
        .string()
        .optional()
        .describe('Status category (e.g., "To Do", "In Progress", "Done")'),
      issueType: z.string().optional().describe('Type of the issue'),
      priority: z.string().optional().describe('Priority level'),
      assigneeAccountId: z.string().optional().describe('Account ID of the assignee'),
      assigneeName: z.string().optional().describe('Display name of the assignee'),
      reporterAccountId: z.string().optional().describe('Account ID of the reporter'),
      reporterName: z.string().optional().describe('Display name of the reporter'),
      projectKey: z.string().optional().describe('Project key'),
      projectName: z.string().optional().describe('Project name'),
      labels: z.array(z.string()).optional().describe('Issue labels'),
      components: z.array(z.string()).optional().describe('Component names'),
      created: z.string().optional().describe('Creation timestamp'),
      updated: z.string().optional().describe('Last updated timestamp'),
      resolutionDate: z.string().optional().describe('Resolution timestamp'),
      resolution: z.string().optional().describe('Resolution name'),
      transitions: z
        .array(
          z.object({
            transitionId: z.string(),
            transitionName: z.string(),
            toStatus: z.string().optional()
          })
        )
        .optional()
        .describe('Available workflow transitions')
    })
  )
  .handleInvocation(async ctx => {
    let client = new JiraClient({
      token: ctx.auth.token,
      cloudId: ctx.auth.cloudId
    });

    let issue = await client.getIssue(ctx.input.issueIdOrKey, ctx.input.fields);

    let transitions: any[] | undefined;
    if (ctx.input.includeTransitions) {
      let rawTransitions = await client.getTransitions(ctx.input.issueIdOrKey);
      transitions = rawTransitions.map((t: any) => ({
        transitionId: t.id,
        transitionName: t.name,
        toStatus: t.to?.name
      }));
    }

    let output = {
      issueId: issue.id,
      issueKey: issue.key,
      selfUrl: issue.self,
      summary: issue.fields?.summary,
      description: issue.fields?.description,
      status: issue.fields?.status?.name,
      statusCategory: issue.fields?.status?.statusCategory?.name,
      issueType: issue.fields?.issuetype?.name,
      priority: issue.fields?.priority?.name,
      assigneeAccountId: issue.fields?.assignee?.accountId,
      assigneeName: issue.fields?.assignee?.displayName,
      reporterAccountId: issue.fields?.reporter?.accountId,
      reporterName: issue.fields?.reporter?.displayName,
      projectKey: issue.fields?.project?.key,
      projectName: issue.fields?.project?.name,
      labels: issue.fields?.labels,
      components: issue.fields?.components?.map((c: any) => c.name),
      created: issue.fields?.created,
      updated: issue.fields?.updated,
      resolutionDate: issue.fields?.resolutiondate,
      resolution: issue.fields?.resolution?.name,
      transitions
    };

    return {
      output,
      message: `Retrieved issue **${issue.key}**: "${issue.fields?.summary}" (${issue.fields?.status?.name})`
    };
  })
  .build();
