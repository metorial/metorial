import { SlateTool } from 'slates';
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

    if (!ctx.input.issueId && !ctx.input.issueNumber) {
      throw new Error('Either issueId or issueNumber must be provided');
    }

    let response: any;
    if (ctx.input.issueNumber) {
      response = await client.getIssueByNumber(ctx.input.issueNumber);
    } else {
      response = await client.getIssue(ctx.input.issueId!);
    }

    let issue = response.data;

    return {
      output: {
        issueId: issue.id,
        issueNumber: issue.number,
        summary: issue.summary,
        description: issue.description,
        projectId: issue.project?.id,
        projectName: issue.project?.name,
        typeName: issue.type?.name,
        statusName: issue.status?.name,
        priorityName: issue.priority?.name,
        assigneeName: issue.assignee?.name,
        ownerName: issue.owner?.name,
        createdAt: issue.createTime ? String(issue.createTime) : undefined,
        updatedAt: issue.updateTime ? String(issue.updateTime) : undefined,
        url: issue.url,
        raw: issue
      },
      message: `Retrieved issue **${issue.summary || issue.id}**.`
    };
  })
  .build();
