import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { folderIdSchema, projectIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let manageInsight = SlateTool.create(spec, {
  name: 'Manage Insight',
  key: 'manage_insight',
  description: `Create, update, or delete an insight in Dovetail. Insights represent key findings and conclusions from research. The legacy insight API is retained for compatibility; prefer manage_doc for new documents.`,
  instructions: [
    'To create an insight, provide at least a title or content.',
    'To update, provide insightId and a title or custom fields. Content, publishing, and contributors cannot be patched with this API.',
    'To delete, provide the insightId and set action to "delete".'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('The operation to perform'),
      insightId: z.string().optional().describe('Insight ID (required for update and delete)'),
      contentType: z
        .enum(['html', 'markdown', 'text'])
        .optional()
        .describe('Initial content format (create only).'),
      projectId: projectIdSchema
        .optional()
        .describe(
          'Project ID from list_projects (create only; cannot combine with folderId).'
        ),
      folderId: folderIdSchema
        .optional()
        .describe(
          'Folder ID from browse_folders (create only; cannot combine with projectId).'
        ),
      title: z.string().optional().describe('Insight title'),
      content: z
        .string()
        .optional()
        .describe('Initial insight content (create only; content cannot be patched).'),
      published: z
        .boolean()
        .optional()
        .describe(
          'Legacy publishing input; unsupported by the current API. Use the Dovetail app to publish.'
        ),
      contributors: z
        .array(z.string())
        .optional()
        .describe(
          'Legacy contributor input; unsupported by the current API. Use the Dovetail app to manage contributors.'
        ),
      fields: z
        .array(
          z.object({
            label: z.string().describe('Field label'),
            value: z.string().nullable().optional().describe('Field value')
          })
        )
        .optional()
        .describe('Custom fields to set during create or update')
    })
  )
  .output(
    z.object({
      insightId: z.string(),
      title: z.string().optional(),
      published: z.boolean().optional(),
      createdAt: z.string().optional(),
      updatedAt: z.string().optional(),
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    if (ctx.input.projectId && ctx.input.folderId)
      throw createApiServiceError('Choose projectId or folderId, not both.');
    if (ctx.input.published !== undefined || ctx.input.contributors !== undefined)
      throw createApiServiceError(
        'Dovetail does not support publishing or contributor changes through this API. Use the Dovetail app.'
      );

    if (ctx.input.action === 'create') {
      let insight = await client.createInsight({
        title: ctx.input.title,
        content: ctx.input.content,
        contentType: ctx.input.contentType,
        projectId: ctx.input.projectId,
        folderId: ctx.input.folderId,
        fields: ctx.input.fields
      });
      return {
        output: {
          insightId: insight.id,
          title: insight.title,
          published: insight.published,
          createdAt: insight.created_at,
          updatedAt: insight.updated_at
        },
        message: `Created insight **${insight.title || 'Untitled'}** (ID: ${insight.id}).`
      };
    }

    if (!ctx.input.insightId) {
      throw createApiServiceError('insightId is required for update and delete actions');
    }

    if (ctx.input.action === 'update') {
      if (
        ctx.input.projectId !== undefined ||
        ctx.input.folderId !== undefined ||
        ctx.input.contentType !== undefined
      )
        throw createApiServiceError(
          'projectId, folderId, and contentType are only supported when creating a document.'
        );
      if (ctx.input.content !== undefined)
        throw createApiServiceError(
          'Dovetail cannot patch insight content. Update its title or fields, or create a new document with initial content.'
        );
      if (ctx.input.title === undefined && !ctx.input.fields?.length)
        throw createApiServiceError('Provide a title or custom fields to update.');
      let insight = await client.updateInsight(ctx.input.insightId, {
        title: ctx.input.title,
        fields: ctx.input.fields
      });
      return {
        output: {
          insightId: insight.id,
          title: insight.title,
          published: insight.published,
          updatedAt: insight.updated_at
        },
        message: `Updated insight **${insight.title || ctx.input.insightId}**.`
      };
    }

    // delete
    let result = await client.deleteInsight(ctx.input.insightId);
    return {
      output: {
        insightId: result.id,
        title: result.title,
        deleted: true
      },
      message: `Deleted insight **${result.title || ctx.input.insightId}**. It can be restored from trash within 30 days.`
    };
  })
  .build();
