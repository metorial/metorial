import { SlateTool } from 'slates';
import { z } from 'zod';
import { JiraClient } from '../lib/client';
import { spec } from '../spec';

export let manageQueueTool = SlateTool.create(spec, {
  name: 'List Queues & Issues',
  key: 'list_queues',
  description: `List service desk queues and optionally retrieve the issues within a specific queue. Queues are pre-configured filters agents use to manage incoming work.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      serviceDeskId: z.string().describe('ID of the service desk'),
      queueId: z
        .string()
        .optional()
        .describe('If provided, retrieves issues from this specific queue'),
      start: z.number().optional().describe('Starting index for pagination'),
      limit: z.number().optional().describe('Maximum number of results')
    })
  )
  .output(
    z.object({
      queues: z
        .array(
          z.object({
            queueId: z.string().describe('Queue ID'),
            name: z.string().describe('Queue name'),
            jql: z.string().optional().describe('JQL filter for the queue'),
            issueCount: z.number().optional().describe('Number of issues in the queue')
          })
        )
        .optional()
        .describe('List of queues (when no queueId specified)'),
      issues: z
        .array(
          z.object({
            issueId: z.string().describe('Issue ID'),
            issueKey: z.string().describe('Issue key'),
            summary: z.string().optional().describe('Issue summary'),
            status: z.string().optional().describe('Current status'),
            priority: z.string().optional().describe('Priority level'),
            assigneeName: z.string().optional().describe('Assignee display name')
          })
        )
        .optional()
        .describe('Issues in the specified queue'),
      total: z.number().describe('Total count')
    })
  )
  .handleInvocation(async ctx => {
    let client = new JiraClient({
      token: ctx.auth.token,
      cloudId: ctx.auth.cloudId
    });

    if (ctx.input.queueId) {
      let result = await client.getQueueIssues(
        ctx.input.serviceDeskId,
        ctx.input.queueId,
        ctx.input.start,
        ctx.input.limit
      );

      let issues = (result.values || []).map((issue: any) => ({
        issueId: issue.id,
        issueKey: issue.key,
        summary: issue.fields?.summary,
        status: issue.fields?.status?.name,
        priority: issue.fields?.priority?.name,
        assigneeName: issue.fields?.assignee?.displayName
      }));

      return {
        output: {
          issues,
          total: result.size || issues.length
        },
        message: `Found **${issues.length}** issues in queue ${ctx.input.queueId}.`
      };
    }

    let result = await client.getQueues(
      ctx.input.serviceDeskId,
      ctx.input.start,
      ctx.input.limit
    );

    let queues = (result.values || []).map((q: any) => ({
      queueId: String(q.id),
      name: q.name,
      jql: q.jql,
      issueCount: q.issueCount
    }));

    return {
      output: {
        queues,
        total: result.size || queues.length
      },
      message: `Found **${queues.length}** queues for service desk ${ctx.input.serviceDeskId}.`
    };
  })
  .build();
