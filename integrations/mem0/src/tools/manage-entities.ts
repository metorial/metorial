import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listEntities = SlateTool.create(spec, {
  name: 'List Entities',
  key: 'list_entities',
  description: `List one page of entities (users, agents, apps, and runs/sessions) registered in Mem0. Optionally filter the current page by entity type. Use the entity name with delete_entity, rather than its internal ID.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      entityType: z
        .enum(['user', 'agent', 'app', 'run'])
        .optional()
        .describe(
          'Filter this page by entity type; continue pagination even if the page is empty'
        ),
      page: z.number().int().min(1).optional().describe('Page number (default: 1)'),
      pageSize: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe('Entities per page (default: 100)')
    })
  )
  .output(
    z.object({
      entities: z
        .array(
          z.object({
            entityId: z.string().trim().min(1).describe('Unique entity identifier'),
            name: z.string().describe('Entity name'),
            type: z
              .string()
              .trim()
              .min(1)
              .optional()
              .describe('Entity type: user, agent, app, or run'),
            totalMemories: z
              .number()
              .optional()
              .describe('Number of memories associated with this entity'),
            owner: z.string().trim().min(1).optional().describe('Entity owner'),
            organization: z.string().trim().min(1).optional().describe('Parent organization'),
            metadata: z.record(z.string(), z.unknown()).optional().describe('Entity metadata'),
            createdAt: z.string().trim().min(1).optional().describe('Creation timestamp'),
            updatedAt: z.string().trim().min(1).optional().describe('Last update timestamp')
          })
        )
        .describe('List of entities'),
      totalEntities: z
        .number()
        .describe('Provider total across all entity types before filtering this page'),
      next: z
        .string()
        .optional()
        .describe('Provider URL for the next page; increment page to continue'),
      previous: z.string().optional().describe('Provider URL for the previous page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      legacyScope: ctx.config
    });

    let results = await client.listEntities({
      entityType: ctx.input.entityType,
      page: ctx.input.page,
      pageSize: ctx.input.pageSize
    });

    let entities = results.entities.map(e => ({
      entityId: String(e.id || ''),
      name: String(e.name || ''),
      type: e.type ? String(e.type) : undefined,
      totalMemories: e.totalMemories,
      owner: e.owner ? String(e.owner) : undefined,
      organization: e.organization ? String(e.organization) : undefined,
      metadata: e.metadata,
      createdAt: e.createdAt ? String(e.createdAt) : undefined,
      updatedAt: e.updatedAt ? String(e.updatedAt) : undefined
    }));

    let typeLabel = ctx.input.entityType || 'all types';
    return {
      output: {
        entities,
        totalEntities: results.totalEntities,
        next: results.next,
        previous: results.previous
      },
      message: `Found **${entities.length}** entities (${typeLabel}).`
    };
  })
  .build();

export let deleteEntity = SlateTool.create(spec, {
  name: 'Delete Entity',
  key: 'delete_entity',
  description: `Delete an entity and all of its associated memories. Supports user, agent, app, and run entity types. This permanently removes the entity and all memories scoped to it.`,
  constraints: [
    'This action is irreversible and will delete all memories associated with the entity.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      entityType: z.enum(['user', 'agent', 'app', 'run']).describe('Type of entity to delete'),
      entityId: z
        .string()
        .trim()
        .min(1)
        .describe(
          'Entity name used as userId, agentId, appId, or runId. Call list_entities and use its name, not its internal entityId.'
        )
    })
  )
  .output(
    z.object({
      deleted: z
        .boolean()
        .describe('Whether entity deletion has completed; false while processing is pending'),
      entityType: z.string().describe('Type of the deleted entity'),
      entityId: z
        .string()
        .trim()
        .min(1)
        .describe('Name of the entity whose deletion was requested'),
      eventId: z
        .string()
        .optional()
        .describe('Processing event ID. Call get_event to check completion.'),
      status: z.string().describe('Processing status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      legacyScope: ctx.config
    });

    let result = await client.deleteEntity(ctx.input.entityType, ctx.input.entityId);

    return {
      output: {
        deleted: result.status === 'SUCCEEDED',
        entityType: ctx.input.entityType,
        entityId: ctx.input.entityId,
        eventId: result.eventId,
        status: result.status
      },
      message:
        result.status === 'SUCCEEDED'
          ? `Deleted ${ctx.input.entityType} **${ctx.input.entityId}** and all associated memories.`
          : `Deletion requested for ${ctx.input.entityType} **${ctx.input.entityId}** and all associated memories. Call get_event with eventId ${result.eventId} to check completion.`
    };
  })
  .build();
