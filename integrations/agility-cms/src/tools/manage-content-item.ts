import { createApiServiceError, SlateTool } from 'slates';
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
        .describe('Reference name of the content container. Required for save operations.'),
      definitionName: z
        .string()
        .optional()
        .describe(
          'Content model name. Required for create unless supplied in properties.definitionName.'
        ),
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
      batchId: z
        .number()
        .optional()
        .describe('Queued batch ID. Use get_batch_status if success is false.'),
      success: z.boolean().describe('Whether the write batch completed successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MgmtClient({
      token: ctx.auth.token,
      guid: ctx.config.guid,
      locale: ctx.input.locale || ctx.config.locale,
      region: ctx.auth.region,
      authMethod: ctx.auth.authMethod
    });

    if (ctx.input.contentId !== undefined && !Number.isInteger(ctx.input.contentId)) {
      throw createApiServiceError('contentId must be a whole number.');
    }
    if (ctx.input.operation === 'delete') {
      if (ctx.input.contentId === undefined || ctx.input.contentId <= 0) {
        throw createApiServiceError('A positive contentId is required for delete operations.');
      }
      let result = await client.deleteContentItem(ctx.input.contentId, ctx.input.comments);
      return {
        output: {
          contentId: ctx.input.contentId,
          batchId: result.batchId,
          success: result.completed
        },
        message: result.completed
          ? `Deleted content item **#${ctx.input.contentId}**`
          : `Deletion is still pending in batch **#${result.batchId}**. Call get_batch_status to check completion.`
      };
    }

    let updating = ctx.input.contentId !== undefined && ctx.input.contentId > 0;
    let item: Record<string, any> = updating
      ? await client.getContentItem(ctx.input.contentId!)
      : { contentID: -1, properties: {}, fields: {} };
    if (!item || typeof item !== 'object') {
      throw createApiServiceError('The content item to update was not found.');
    }
    item.fields = { ...item.fields, ...ctx.input.fields };
    item.properties = { ...item.properties, ...ctx.input.properties };
    if (ctx.input.referenceName !== undefined)
      item.properties.referenceName = ctx.input.referenceName;
    if (ctx.input.definitionName !== undefined)
      item.properties.definitionName = ctx.input.definitionName;
    if (
      !updating &&
      (!item.properties.referenceName || !item.properties.definitionName || !ctx.input.fields)
    ) {
      throw createApiServiceError(
        'Creating content requires fields, a container referenceName, and a model definitionName (directly or in properties). Call list_containers and list_content_models to discover these names.'
      );
    }

    let result = await client.saveContentItem(item);
    let savedId = result.itemIds[0] ?? (updating ? ctx.input.contentId : undefined);
    if (result.completed && !savedId) {
      throw createApiServiceError(
        `Agility CMS batch ${result.batchId} completed without a content item ID. Call get_batch_status to inspect it.`
      );
    }
    return {
      output: { contentId: savedId, batchId: result.batchId, success: result.completed },
      message: result.completed
        ? `${updating ? 'Updated' : 'Created'} content item **#${savedId}**`
        : `Save is still pending in batch **#${result.batchId}**. Call get_batch_status to check completion.`
    };
  })
  .build();
