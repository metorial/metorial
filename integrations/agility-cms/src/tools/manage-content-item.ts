import { SlateTool } from 'slates';
import { z } from 'zod';
import { MgmtClient } from '../lib/client';
import { spec } from '../spec';

export let manageContentItem = SlateTool.create(spec, {
  name: 'Manage Content Item',
  key: 'manage_content_item',
  description: `Creates, updates, or deletes a content item via the Management API. For creating or updating, provide the content fields and reference name. For deleting, provide the contentId and set the operation to "delete". Requires OAuth authentication.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      operation: z
        .enum(['save', 'delete'])
        .describe('Operation to perform: "save" to create/update, "delete" to remove'),
      contentId: z
        .number()
        .optional()
        .describe('Content item ID. Required for update and delete. Omit for create.'),
      referenceName: z
        .string()
        .optional()
        .describe('Reference name of the content model. Required for save operations.'),
      fields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Content fields as key-value pairs. Required for save operations.'),
      properties: z
        .record(z.string(), z.any())
        .optional()
        .describe('Optional item properties to set (e.g., itemOrder)'),
      comments: z.string().optional().describe('Optional comments for the operation'),
      locale: z.string().optional().describe('Locale code override')
    })
  )
  .output(
    z.object({
      contentId: z.number().optional().describe('Content item ID of the saved/deleted item'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MgmtClient({
      token: ctx.auth.token,
      guid: ctx.config.guid,
      locale: ctx.input.locale || ctx.config.locale,
      region: ctx.auth.region
    });

    if (ctx.input.operation === 'delete') {
      if (!ctx.input.contentId) {
        throw new Error('contentId is required for delete operations');
      }
      await client.deleteContentItem(ctx.input.contentId, ctx.input.comments);
      return {
        output: { contentId: ctx.input.contentId, success: true },
        message: `Deleted content item **#${ctx.input.contentId}**`
      };
    }

    let item: Record<string, any> = {
      fields: ctx.input.fields || {}
    };
    if (ctx.input.contentId) {
      item.contentID = ctx.input.contentId;
    }
    if (ctx.input.referenceName) {
      item.properties = {
        ...(ctx.input.properties || {}),
        referenceName: ctx.input.referenceName
      };
    } else if (ctx.input.properties) {
      item.properties = ctx.input.properties;
    }

    let result = await client.saveContentItem(item);
    let savedId = result?.contentID ?? ctx.input.contentId;

    return {
      output: { contentId: savedId, success: true },
      message: ctx.input.contentId
        ? `Updated content item **#${savedId}**`
        : `Created content item **#${savedId}** in **${ctx.input.referenceName}**`
    };
  })
  .build();
