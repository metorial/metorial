import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageCollectionTool = SlateTool.create(spec, {
  name: 'Manage Collection',
  key: 'manage_collection',
  description: `Add or remove items from a collection (many-to-many relation) field on an entity. Use this to manage linked entities, file attachments, and other collection-type relations.`,
  instructions: [
    'Use "get_schema" to find collection field names.',
    'Use "query_entities" to find entity IDs for linking.',
    'The "add" action appends items; the "remove" action detaches items without deleting them.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      typeName: z
        .string()
        .describe('Fully qualified type name of the entity (e.g., "Project Management/Task")'),
      entityId: z.string().describe('The fibery/id of the entity that owns the collection'),
      field: z
        .string()
        .describe(
          'Fully qualified collection field name (e.g., "Project/Tags" or "Project/Files")'
        ),
      action: z
        .enum(['add', 'remove'])
        .describe('Whether to add or remove items from the collection'),
      itemIds: z
        .array(z.string())
        .describe('Array of fibery/id values for items to add or remove')
    })
  )
  .output(
    z.object({
      entityId: z.string().describe('The entity whose collection was modified'),
      field: z.string().describe('The collection field that was modified'),
      action: z.string().describe('The action performed (add or remove)'),
      itemCount: z.number().describe('Number of items added or removed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      accountName: ctx.config.accountName,
      token: ctx.auth.token
    });

    if (ctx.input.action === 'add') {
      await client.addCollectionItems({
        typeName: ctx.input.typeName,
        field: ctx.input.field,
        entityId: ctx.input.entityId,
        itemIds: ctx.input.itemIds
      });
    } else {
      await client.removeCollectionItems({
        typeName: ctx.input.typeName,
        field: ctx.input.field,
        entityId: ctx.input.entityId,
        itemIds: ctx.input.itemIds
      });
    }

    return {
      output: {
        entityId: ctx.input.entityId,
        field: ctx.input.field,
        action: ctx.input.action,
        itemCount: ctx.input.itemIds.length
      },
      message: `${ctx.input.action === 'add' ? 'Added' : 'Removed'} **${ctx.input.itemIds.length}** items ${ctx.input.action === 'add' ? 'to' : 'from'} \`${ctx.input.field}\` on entity \`${ctx.input.entityId}\`.`
    };
  })
  .build();
