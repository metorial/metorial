import { SlateTool } from 'slates';
import { z } from 'zod';
import { clientFor } from '../lib/client';
import { recordSchema } from '../lib/validation';
import { spec } from '../spec';

export let listEntities = SlateTool.create(spec, {
  name: 'List Entities',
  key: 'list_entities',
  description: `Retrieve business entities (for multi-entity businesses). Entities are used to organize users, cards, and transactions for reporting and policy enforcement. Can also fetch a specific entity by ID.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      entityId: z
        .string()
        .optional()
        .describe('Specific entity ID to retrieve. If not provided, lists all entities.'),
      cursor: z.string().optional().describe('Pagination cursor from a previous response'),
      pageSize: z
        .number()
        .min(2)
        .max(100)
        .optional()
        .describe('Number of results per page (2-100)')
    })
  )
  .output(
    z.object({
      entity: recordSchema
        .optional()
        .describe('Single entity object (when entityId is provided)'),
      entities: z.array(recordSchema).optional().describe('List of entity objects'),
      nextCursor: z.string().optional().describe('Cursor for fetching the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = clientFor(ctx);

    if (ctx.input.entityId !== undefined) {
      let entity = await client.getEntity(ctx.input.entityId);
      return {
        output: { entity },
        message: `Retrieved entity **${entity.entity_name || ctx.input.entityId}**.`
      };
    }

    let result = await client.listEntities({
      start: ctx.input.cursor,
      pageSize: ctx.input.pageSize
    });

    return {
      output: {
        entities: result.data,
        nextCursor: result.page?.next
      },
      message: `Retrieved **${result.data.length}** entities${result.page?.next ? ' (more pages available)' : ''}.`
    };
  })
  .build();
