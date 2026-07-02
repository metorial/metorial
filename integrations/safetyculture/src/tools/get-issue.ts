import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
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

    let collaborators = (issue.collaborators || []).map((c: any) => c.user_id || c.id || c);

    return {
      output: {
        issueId: issue.id || issue.incident_id,
        title: issue.title,
        description: issue.description,
        status: issue.status,
        priority: issue.priority,
        categoryId: issue.category_id || issue.category?.id,
        siteId: issue.site_id || issue.site?.id,
        assetId: issue.asset_id || issue.asset?.id,
        dueAt: issue.due_at,
        occurredAt: issue.occurred_at,
        createdAt: issue.created_at,
        creatorId: issue.creator?.user_id || issue.creator_id,
        collaborators,
        timeline
      },
      message: `Retrieved issue **${issue.title || ctx.input.issueId}** (status: ${issue.status || 'unknown'}).`
    };
  })
  .build();
