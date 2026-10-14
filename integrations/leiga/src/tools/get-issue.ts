import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getIssueTool = SlateTool.create(spec, {
  name: 'Get Issue',
  key: 'get_issue',
  description: `Retrieve detailed information about a specific issue by its ID or issue number. Returns all fields including summary, description, type, priority, status, assignee, dates, and more.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      issueId: z.number().optional().describe('The numeric ID of the issue'),
      issueNumber: z.string().optional().describe('The issue number (e.g. "PROJ-123")')
    })
  )
  .output(
    z.object({
      issueId: z.number().describe('Issue ID'),
      issueNumber: z.number().optional().describe('Issue number within the project'),
      summary: z.string().optional().describe('Issue summary/title'),
      description: z.string().optional().describe('Issue description'),
      projectId: z.number().optional().describe('Project ID'),
      projectName: z.string().optional().describe('Project name'),
      typeName: z.string().optional().describe('Issue type name'),
      statusName: z.string().optional().describe('Current status name'),
      priorityName: z.string().optional().describe('Priority level name'),
      assigneeName: z.string().optional().describe('Assignee name'),
      ownerName: z.string().optional().describe('Owner name'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      updatedAt: z.string().optional().describe('Last update timestamp'),
      url: z.string().optional().describe('URL to the issue in Leiga'),
      raw: z.any().optional().describe('Full raw issue data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.issueId === undefined && !ctx.input.issueNumber?.trim()) {
      throw createApiServiceError('Either issueId or issueNumber must be provided', {
        reason: 'missing_issue_identifier'
      });
    }

    let response: any;
    if (ctx.input.issueNumber) {
      response = await client.getIssueByNumber(ctx.input.issueNumber);
    } else {
      response = await client.getIssue(ctx.input.issueId!);
    }

    let raw = response.data;
    let issue = raw?.data ?? raw;
    let issueId = raw?.id ?? issue?.id;
    if (typeof issueId !== 'number') {
      throw createApiServiceError('Leiga did not return the requested issue details.', {
        reason: 'invalid_issue_response'
      });
    }
    let text = (value: unknown) => (typeof value === 'string' ? value : undefined);
    let number = (value: unknown) => (typeof value === 'number' ? value : undefined);

    return {
      output: {
        issueId,
        issueNumber: number(issue.issueNumber ?? issue.number),
        summary: text(issue.summary),
        description: text(issue.description),
        projectId: number(raw.projectId ?? issue.projectId ?? issue.project?.id),
        projectName: text(issue.project?.name),
        typeName: text(issue.issueTypeIdVO?.name ?? issue.type?.name),
        statusName: text(issue.statusVO?.name ?? issue.status?.name),
        priorityName: text(issue.priorityVO?.name ?? issue.priority?.name),
        assigneeName: text(issue.assigneeVO?.name ?? issue.assignee?.name),
        ownerName: text(issue.ownerVO?.name ?? issue.owner?.name),
        createdAt: raw.createTime == null ? undefined : String(raw.createTime),
        updatedAt: raw.updateTime == null ? undefined : String(raw.updateTime),
        url: text(issue.url),
        raw
      },
      message: `Retrieved issue **${issue.summary || issue.id}**.`
    };
  })
  .build();
