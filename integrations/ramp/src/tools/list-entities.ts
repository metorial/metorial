import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
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
      entity: z.any().optional().describe('Single entity object (when entityId is provided)'),
      entities: z.array(z.any()).optional().describe('List of entity objects'),
      nextCursor: z.string().optional().describe('Cursor for fetching the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    if (ctx.input.entityId) {
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
