import { SlateTool } from 'slates';
import { z } from 'zod';
import { PlacidClient } from '../lib/client';
import { spec } from '../spec';

let collectionOutputSchema = z.object({
  collectionId: z.number().describe('Unique collection ID'),
  title: z.string().describe('Collection title'),
  customData: z.string().nullable().describe('Custom reference data'),
  templateUuids: z.array(z.string()).describe('UUIDs of templates in this collection')
});

export let manageCollections = SlateTool.create(spec, {
  name: 'Manage Collections',
  key: 'manage_collections',
  description: `List, retrieve, create, update, or delete template collections. Collections organize templates into groups for easier management. You can add or remove templates from collections.`,
  instructions: [
    'Use action "list" to browse all collections.',
    'Use action "get" to retrieve a specific collection and its template UUIDs.',
    'Use action "create" to create a new collection, optionally with templates.',
    'Use action "update" to modify a collection\'s title, custom data, or template membership.',
    'Use action "delete" to permanently remove a collection.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('Action to perform'),
      collectionId: z
        .number()
        .optional()
        .describe('Collection ID (required for get, update, delete)'),
      title: z
        .string()
        .optional()
        .describe('Collection title (required for create; optional for update)'),
      customData: z
        .string()
        .optional()
        .describe('Custom reference data (max 1024 chars; for create or update)'),
      templateUuids: z
        .array(z.string())
        .optional()
        .describe('Template UUIDs to include (for create; max 500)'),
      addTemplateUuids: z
        .array(z.string())
        .optional()
        .describe('Template UUIDs to add to the collection (for update)'),
      removeTemplateUuids: z
        .array(z.string())
        .optional()
        .describe('Template UUIDs to remove from the collection (for update)'),
      perPage: z.number().optional().describe('Results per page (max 100; for list)')
    })
  )
  .output(
    z.object({
      collection: collectionOutputSchema
        .optional()
        .describe('Single collection (for get, create, update)'),
      collections: z
        .array(collectionOutputSchema)
        .optional()
        .describe('List of collections (for list)'),
      deleted: z
        .boolean()
        .optional()
        .describe('Whether the collection was deleted (for delete)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PlacidClient({ token: ctx.auth.token });

    let mapCollection = (c: {
      id: number;
      title: string;
      custom_data: string | null;
      template_uuids: string[];
    }) => ({
      collectionId: c.id,
      title: c.title,
      customData: c.custom_data,
      templateUuids: c.template_uuids
    });

    switch (ctx.input.action) {
      case 'list': {
        let result = await client.listCollections({ perPage: ctx.input.perPage });
        let collections = result.data.map(mapCollection);
        return {
          output: { collections },
          message: `Found **${collections.length}** collection(s).`
        };
      }

      case 'get': {
        if (ctx.input.collectionId === undefined)
          throw new Error('collectionId is required for "get" action');
        let collection = await client.getCollection(ctx.input.collectionId);
        return {
          output: { collection: mapCollection(collection) },
          message: `Collection **"${collection.title}"** contains **${collection.template_uuids.length}** template(s).`
        };
      }

      case 'create': {
        if (!ctx.input.title) throw new Error('title is required for "create" action');
        let collection = await client.createCollection({
          title: ctx.input.title,
          templateUuids: ctx.input.templateUuids,
          customData: ctx.input.customData
        });
        return {
          output: { collection: mapCollection(collection) },
          message: `Collection **"${collection.title}"** created with **${collection.template_uuids.length}** template(s).`
        };
      }

      case 'update': {
        if (ctx.input.collectionId === undefined)
          throw new Error('collectionId is required for "update" action');
        let collection = await client.updateCollection(ctx.input.collectionId, {
          title: ctx.input.title,
          customData: ctx.input.customData,
          addTemplateUuids: ctx.input.addTemplateUuids,
          removeTemplateUuids: ctx.input.removeTemplateUuids
        });
        return {
          output: { collection: mapCollection(collection) },
          message: `Collection **"${collection.title}"** updated. Now contains **${collection.template_uuids.length}** template(s).`
        };
      }

      case 'delete': {
        if (ctx.input.collectionId === undefined)
          throw new Error('collectionId is required for "delete" action');
        await client.deleteCollection(ctx.input.collectionId);
        return {
          output: { deleted: true },
          message: `Collection **#${ctx.input.collectionId}** deleted.`
        };
      }
    }
  })
  .build();
