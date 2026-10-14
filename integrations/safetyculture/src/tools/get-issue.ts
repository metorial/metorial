import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { taskState } from '../lib/task-values';
import { spec } from '../spec';

export let getIssue = SlateTool.create(spec, {
  name: 'Get Issue',
  key: 'get_issue',
  description: `Retrieve full details of a specific issue (incident) by ID, including its timeline of activity and comments.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      issueId: z.string().describe('The unique ID of the issue to retrieve'),
      includeTimeline: z
        .boolean()
        .optional()
        .describe('Whether to also fetch the issue activity timeline')
    })
  )
  .output(
    z.object({
      issueId: z.string().describe('Unique issue identifier'),
      title: z.string().optional().describe('Issue title'),
      description: z.string().optional().describe('Issue description'),
      status: z.string().optional().describe('Current status'),
      priority: z.string().optional().describe('Priority level'),
      categoryId: z.string().optional().describe('Category ID'),
      siteId: z.string().optional().describe('Associated site ID'),
      assetId: z.string().optional().describe('Associated asset ID'),
      dueAt: z.string().optional().describe('Due date'),
      occurredAt: z.string().optional().describe('When the incident occurred'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      creatorId: z.string().optional().describe('User ID of the issue creator'),
      collaborators: z.array(z.string()).optional().describe('List of collaborator user IDs'),
      timeline: z.any().optional().describe('Issue activity timeline if requested')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let issue = await client.getIssue(ctx.input.issueId);
    let timeline: any;

    if (ctx.input.includeTimeline) {
      timeline = await client.getIssueTimeline(ctx.input.issueId);
    }

    let task = issue.task ?? issue;
    let collaborators = (task.collaborators || [])
      .map((c: any) => c.user?.user_id || c.collaborator_id || c.user_id || c.id)
      .filter((id: unknown): id is string => typeof id === 'string');

    return {
      output: {
        issueId: task.task_id || issue.id || issue.incident_id || ctx.input.issueId,
        title: task.title ?? undefined,
        description: task.description ?? undefined,
        status: taskState(task.status) ?? task.status_id ?? undefined,
        priority: taskState(task.priority) ?? task.priority_id ?? undefined,
        categoryId: issue.category_id ?? issue.category?.id ?? undefined,
        siteId: task.site_id ?? task.site?.site_id ?? task.site?.id ?? undefined,
        assetId: task.asset_id ?? task.asset?.id ?? undefined,
        dueAt: task.due_at ?? undefined,
        occurredAt: task.occurred_at ?? undefined,
        createdAt: task.created_at ?? undefined,
        creatorId: task.creator?.user_id ?? task.creator_id ?? undefined,
        collaborators,
        timeline
      },
      message: `Retrieved issue **${task.title || ctx.input.issueId}** (status: ${taskState(task.status) || task.status_id || 'unknown'}).`
    };
  })
  .build();
