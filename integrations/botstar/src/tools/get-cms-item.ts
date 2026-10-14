import { SlateTool } from 'slates';
import { z } from 'zod';
import { BotstarClient } from '../lib/client';
import { botIdSchema, botScopeGuidance, entityIdSchema, itemIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let getCmsItem = SlateTool.create(spec, {
  name: 'Get CMS Item',
  key: 'get_cms_item',
  description: `Retrieve one CMS item and its field values. Call list_cms_entities and list_cms_items to discover entity and item IDs. ${botScopeGuidance}`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      botId: botIdSchema,
      entityId: entityIdSchema,
      itemId: itemIdSchema,
      env: z.enum(['draft', 'live']).optional().describe('Environment to read')
    })
  )
  .output(
    z.object({
      itemId: z.string().describe('ID of the CMS item'),
      entityId: z.string().describe('ID of the parent entity'),
      name: z.string().optional().describe('Name of the item'),
      status: z.string().optional().describe('Whether the item is enabled or disabled'),
      fields: z
        .record(z.string(), z.any())
        .describe('Item values keyed by entity field unique_name')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BotstarClient(ctx.auth.token);
    let item = await client.getCmsEntityItem(
      ctx.input.botId,
      ctx.input.entityId,
      ctx.input.itemId,
      ctx.input.env
    );
    let { id, _id, entity_id, name, status, ...fields } = item;
    return {
      output: {
        itemId: id || _id || ctx.input.itemId,
        entityId: entity_id || ctx.input.entityId,
        name: name ?? undefined,
        status: status ?? undefined,
        fields
      },
      message: `Retrieved CMS item **${name ?? ctx.input.itemId}**.`
    };
  })
  .build();
