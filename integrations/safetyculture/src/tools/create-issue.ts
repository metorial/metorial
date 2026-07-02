import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createIssue = SlateTool.create(spec, {
  name: 'Create Issue',
  key: 'create_issue',
  description: `Create a new issue (incident) in SafetyCulture. Issues track incidents and can be assigned to users, categorized, and associated with sites or assets.`
})
  .input(
    z.object({
      title: z.string().describe('Title of the issue'),
      description: z.string().optional().describe('Detailed description of the issue'),
      categoryId: z.string().optional().describe('Issue category ID'),
      priority: z
        .string()
        .optional()
        .describe('Priority level (e.g., "NONE", "LOW", "MEDIUM", "HIGH")'),
      assigneeIds: z
        .array(z.string())
        .optional()
        .describe('User IDs to assign as collaborators'),
      dueAt: z.string().optional().describe('Due date in ISO 8601 format'),
      siteId: z.string().optional().describe('Site ID to associate with'),
      assetId: z.string().optional().describe('Asset ID to associate with'),
      occurredAt: z
        .string()
        .optional()
        .describe('When the incident occurred, in ISO 8601 format')
    })
  )
  .output(
    z.object({
      issueId: z.string().describe('ID of the newly created issue'),
      title: z.string().optional().describe('Title of the created issue'),
      rawResponse: z.any().optional().describe('Full API response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.createIssue({
      title: ctx.input.title,
      description: ctx.input.description,
      categoryId: ctx.input.categoryId,
      priority: ctx.input.priority,
      assigneeIds: ctx.input.assigneeIds,
      dueAt: ctx.input.dueAt,
      siteId: ctx.input.siteId,
      assetId: ctx.input.assetId,
      occurredAt: ctx.input.occurredAt
    });

    let issueId = result.id || result.incident_id;

    return {
      output: {
        issueId,
        title: result.title || ctx.input.title,
        rawResponse: result
      },
      message: `Created issue **${ctx.input.title}** (ID: ${issueId}).`
    };
  })
  .build();
