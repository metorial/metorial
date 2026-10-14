import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { BotstarClient } from '../lib/client';
import { botIdSchema, botScopeGuidance, entityIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let listCmsItems = SlateTool.create(spec, {
  name: 'List CMS Items',
  key: 'list_cms_items',
  description: `Retrieve items from a CMS entity. Supports pagination and filtering by name or status. Items are data objects with attributes defined by their parent entity. ${botScopeGuidance}`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      botId: botIdSchema,
      entityId: entityIdSchema,
      env: z.enum(['draft', 'live']).optional().describe('Environment (draft or live)'),
      page: z.number().optional().describe('Page number (default: 1)'),
      limit: z.number().optional().describe('Items per page (default: 100)'),
      name: z.string().optional().describe('Filter by item name'),
      status: z.enum(['enabled', 'disabled']).optional().describe('Filter by item status')
    })
  )
  .output(
    z.object({
      items: z
        .array(
          z.object({
            itemId: z.string().describe('Unique identifier of the item'),
            name: z.string().optional().describe('Name of the item'),
            status: z.string().optional().describe('Status of the item'),
            fields: z
              .record(z.string(), z.any())
              .optional()
              .describe('Field values of the item')
          })
        )
        .describe('List of CMS items')
    })
  )
  .handleInvocation(async ctx => {
    for (let [field, value] of [
      ['page', ctx.input.page],
      ['limit', ctx.input.limit]
    ] as const) {
      if (value !== undefined && (!Number.isSafeInteger(value) || value < 1)) {
        throw createApiServiceError(`${field} must be a positive whole number.`);
      }
    }
    let client = new BotstarClient(ctx.auth.token);
    let items = await client.listCmsEntityItems(ctx.input.botId, ctx.input.entityId, {
      env: ctx.input.env,
      page: ctx.input.page,
      limit: ctx.input.limit,
      name: ctx.input.name,
      status: ctx.input.status
    });

    let mapped = (Array.isArray(items) ? items : []).map((item: any) => {
      let { id, _id, name, status, ...fields } = item;
      return {
        itemId: id || _id || '',
        name: name ?? undefined,
        status: status ?? undefined,
        fields
      };
    });

    return {
      output: { items: mapped },
      message: `Retrieved **${mapped.length}** CMS item(s).`
    };
  })
  .build();
