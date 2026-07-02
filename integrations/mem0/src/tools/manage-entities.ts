import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listEntities = SlateTool.create(spec, {
  name: 'List Entities',
  key: 'list_entities',
  description: `List all entities (users, agents, apps, and runs/sessions) registered in Mem0. Optionally filter by entity type. Returns each entity's ID, name, type, memory count, and timestamps.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      entityType: z
        .enum(['user', 'agent', 'app', 'run'])
        .optional()
        .describe('Filter entities by type')
    })
  )
  .output(
    z.object({
      entities: z
        .array(
          z.object({
            entityId: z.string().describe('Unique entity identifier'),
            name: z.string().describe('Entity name'),
            type: z.string().optional().describe('Entity type: user, agent, app, or run'),
            totalMemories: z
              .number()
              .optional()
              .describe('Number of memories associated with this entity'),
            owner: z.string().optional().describe('Entity owner'),
            organization: z.string().optional().describe('Parent organization'),
            metadata: z.record(z.string(), z.unknown()).optional().describe('Entity metadata'),
            createdAt: z.string().optional().describe('Creation timestamp'),
            updatedAt: z.string().optional().describe('Last update timestamp')
          })
        )
        .describe('List of entities')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      orgId: ctx.config.orgId,
      projectId: ctx.config.projectId
    });

    let results = await client.listEntities({
      entityType: ctx.input.entityType
    });

    let entities = results.map(e => ({
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
      output: { entities },
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
      entityId: z.string().describe('Unique identifier of the entity to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the entity was deleted successfully'),
      entityType: z.string().describe('Type of the deleted entity'),
      entityId: z.string().describe('ID of the deleted entity')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      orgId: ctx.config.orgId,
      projectId: ctx.config.projectId
    });

    await client.deleteEntity(ctx.input.entityType, ctx.input.entityId);

    return {
      output: {
        deleted: true,
        entityType: ctx.input.entityType,
        entityId: ctx.input.entityId
      },
      message: `Deleted ${ctx.input.entityType} **${ctx.input.entityId}** and all associated memories.`
    };
  })
  .build();
