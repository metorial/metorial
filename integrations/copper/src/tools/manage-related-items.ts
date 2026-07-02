import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getRelatedItems = SlateTool.create(spec, {
  name: 'Get Related Items',
  key: 'get_related_items',
  description: `Get all entities related to a given CRM record. Relationships are bidirectional — returns linked people, companies, opportunities, projects, and tasks.`,
  instructions: [
    'Entity type should be the plural form: "people", "companies", "leads", "opportunities", "projects", "tasks"'
  ],
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      entityType: z
        .enum(['people', 'companies', 'leads', 'opportunities', 'projects', 'tasks'])
        .describe('Type of the source entity'),
      entityId: z.number().describe('ID of the source entity')
    })
  )
  .output(
    z.object({
      relatedItems: z.array(z.any()).describe('Related entity records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    let items = await client.getRelatedItems(ctx.input.entityType, ctx.input.entityId);

    return {
      output: { relatedItems: Array.isArray(items) ? items : [] },
      message: `Retrieved related items for ${ctx.input.entityType} ${ctx.input.entityId}.`
    };
  })
  .build();

export let createRelatedItem = SlateTool.create(spec, {
  name: 'Create Related Item',
  key: 'create_related_item',
  description: `Create a relationship between two CRM entities. Relationships are bidirectional. Not all entity type combinations are allowed — see Copper's relationship rules.`,
  instructions: [
    'Source entity type must be plural: "people", "companies", "leads", "opportunities", "projects", "tasks"',
    'Related resource type must be singular: "person", "company", "opportunity", "project", "task", "lead"'
  ],
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      entityType: z
        .enum(['people', 'companies', 'leads', 'opportunities', 'projects', 'tasks'])
        .describe('Type of the source entity (plural form)'),
      entityId: z.number().describe('ID of the source entity'),
      relatedResourceType: z
        .string()
        .describe(
          'Type of the entity to relate: "person", "company", "opportunity", "project", "task", or "lead"'
        ),
      relatedResourceId: z.number().describe('ID of the entity to relate')
    })
  )
  .output(
    z.object({
      created: z.boolean().describe('Whether the relationship was created')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    await client.createRelatedItem(ctx.input.entityType, ctx.input.entityId, {
      resource: {
        id: ctx.input.relatedResourceId,
        type: ctx.input.relatedResourceType
      }
    });

    return {
      output: { created: true },
      message: `Created relationship between ${ctx.input.entityType} ${ctx.input.entityId} and ${ctx.input.relatedResourceType} ${ctx.input.relatedResourceId}.`
    };
  })
  .build();

export let deleteRelatedItem = SlateTool.create(spec, {
  name: 'Delete Related Item',
  key: 'delete_related_item',
  description: `Remove a relationship between two CRM entities. This only removes the link — neither entity is deleted.`,
  tags: { destructive: true, readOnly: false }
})
  .input(
    z.object({
      entityType: z
        .enum(['people', 'companies', 'leads', 'opportunities', 'projects', 'tasks'])
        .describe('Type of the source entity (plural form)'),
      entityId: z.number().describe('ID of the source entity'),
      relatedResourceType: z
        .string()
        .describe(
          'Type of the related entity: "person", "company", "opportunity", "project", "task", or "lead"'
        ),
      relatedResourceId: z.number().describe('ID of the related entity')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the relationship was removed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    await client.deleteRelatedItem(ctx.input.entityType, ctx.input.entityId, {
      resource: {
        id: ctx.input.relatedResourceId,
        type: ctx.input.relatedResourceType
      }
    });

    return {
      output: { deleted: true },
      message: `Removed relationship between ${ctx.input.entityType} ${ctx.input.entityId} and ${ctx.input.relatedResourceType} ${ctx.input.relatedResourceId}.`
    };
  })
  .build();
