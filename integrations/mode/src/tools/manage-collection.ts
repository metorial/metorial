import { SlateTool } from 'slates';
import { z } from 'zod';
import { ModeClient } from '../lib/client';
import { getEmbedded, normalizeCollection } from '../lib/helpers';
import { spec } from '../spec';

let collectionSchema = z.object({
  collectionToken: z.string().describe('Unique token of the collection'),
  name: z.string().describe('Name of the collection'),
  description: z.string().describe('Description of the collection'),
  spaceType: z.string().describe('Type of the collection'),
  state: z.string().describe('State of the collection'),
  restricted: z.boolean().describe('Whether the collection is restricted'),
  freeDefault: z.boolean().describe('Whether this is the free default collection'),
  createdAt: z.string(),
  updatedAt: z.string()
});

export let listCollections = SlateTool.create(spec, {
  name: 'List Collections',
  key: 'list_collections',
  description: `List all collections (formerly Spaces) in the workspace. Optionally filter to include all collections (including ones the admin has not joined) or only custom collections.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      filter: z
        .enum(['all', 'custom'])
        .optional()
        .describe(
          'Filter type: "all" returns all collections including unjoined ones, "custom" returns only custom collections'
        ),
      page: z.number().optional().describe('Page number'),
      perPage: z.number().optional().describe('Results per page')
    })
  )
  .output(
    z.object({
      collections: z.array(collectionSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new ModeClient({
      token: ctx.auth.token,
      secret: ctx.auth.secret,
      workspaceName: ctx.config.workspaceName
    });

    let data = await client.listCollections({
      filter: ctx.input.filter,
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });
    let collections = getEmbedded(data, 'spaces').map(normalizeCollection);

    return {
      output: { collections },
      message: `Found **${collections.length}** collections.`
    };
  })
  .build();

export let manageCollection = SlateTool.create(spec, {
  name: 'Manage Collection',
  key: 'manage_collection',
  description: `Create, update, or delete a collection (Space) in the workspace.
Use **create** to make a new collection for organizing reports.
Use **update** to rename or change the description.
Use **delete** to remove an empty collection (all reports must be removed first).`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Action to perform'),
      collectionToken: z
        .string()
        .optional()
        .describe('Token of the collection (required for update/delete)'),
      name: z.string().optional().describe('Name for the collection (create/update)'),
      description: z
        .string()
        .optional()
        .describe('Description for the collection (create/update)'),
      spaceType: z
        .string()
        .optional()
        .describe('Type of collection (create only, defaults to "custom")')
    })
  )
  .output(collectionSchema)
  .handleInvocation(async ctx => {
    let client = new ModeClient({
      token: ctx.auth.token,
      secret: ctx.auth.secret,
      workspaceName: ctx.config.workspaceName
    });

    let { action } = ctx.input;

    if (action === 'create') {
      let raw = await client.createCollection({
        name: ctx.input.name!,
        description: ctx.input.description,
        spaceType: ctx.input.spaceType
      });
      let collection = normalizeCollection(raw);
      return {
        output: collection,
        message: `Created collection **${collection.name}**.`
      };
    }

    if (action === 'update') {
      let raw = await client.updateCollection(ctx.input.collectionToken!, {
        name: ctx.input.name,
        description: ctx.input.description
      });
      let collection = normalizeCollection(raw);
      return {
        output: collection,
        message: `Updated collection **${collection.name}**.`
      };
    }

    // action === 'delete'
    let existing = await client.getCollection(ctx.input.collectionToken!);
    let collection = normalizeCollection(existing);
    await client.deleteCollection(ctx.input.collectionToken!);
    return {
      output: collection,
      message: `Deleted collection **${collection.name}**.`
    };
  })
  .build();
