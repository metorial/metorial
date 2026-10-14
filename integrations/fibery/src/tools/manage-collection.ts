import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageCollectionTool = SlateTool.create(spec, {
  name: 'Manage Collection',
  key: 'manage_collection',
  description: `Add, remove, replace, or clear items in a collection relation field on an entity. Use this to manage linked entities, file attachments, and multi-select values.`,
  instructions: [
    'Use "get_schema" to find collection field names.',
    'Use "query_entities" to find entity IDs for linking.',
    'The "add" action appends items; the "remove" action detaches items without deleting them.',
    'The "set" action replaces all collection items with itemIds; "reset" clears the collection. Pass an empty itemIds array for reset.'
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
        .enum(['add', 'remove', 'set', 'reset'])
        .describe('Add, remove, replace (set), or clear (reset) collection items'),
      itemIds: z
        .array(z.string())
        .describe('Array of fibery/id values to add, remove, or set. Pass [] for reset.')
    })
  )
  .output(
    z.object({
      entityId: z.string().describe('The entity whose collection was modified'),
      field: z.string().describe('The collection field that was modified'),
      action: z.string().describe('The action performed (add, remove, set, or reset)'),
      itemCount: z.number().describe('Number of submitted item IDs; zero for reset')
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
    } else if (ctx.input.action === 'remove') {
      await client.removeCollectionItems({
        typeName: ctx.input.typeName,
        field: ctx.input.field,
        entityId: ctx.input.entityId,
        itemIds: ctx.input.itemIds
      });
    } else if (ctx.input.action === 'set') {
      await client.setCollectionItems({
        typeName: ctx.input.typeName,
        field: ctx.input.field,
        entityId: ctx.input.entityId,
        itemIds: ctx.input.itemIds
      });
    } else {
      await client.resetCollectionItems({
        typeName: ctx.input.typeName,
        field: ctx.input.field,
        entityId: ctx.input.entityId
      });
    }

    return {
      output: {
        entityId: ctx.input.entityId,
        field: ctx.input.field,
        action: ctx.input.action,
        itemCount: ctx.input.action === 'reset' ? 0 : ctx.input.itemIds.length
      },
      message: `Completed collection action **${ctx.input.action}** on \`${ctx.input.field}\` for entity \`${ctx.input.entityId}\`.`
    };
  })
  .build();
