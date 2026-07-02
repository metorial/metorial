import { SlateTool } from 'slates';
import { z } from 'zod';
import { HubClient } from '../lib/client';
import { huggingFaceServiceError } from '../lib/errors';
import { spec } from '../spec';

let collectionSummarySchema = z.object({
  slug: z.string().describe('Collection slug'),
  title: z.string().optional().describe('Collection title'),
  description: z.string().optional().describe('Collection description'),
  owner: z.string().optional().describe('Owner username or organization'),
  private: z.boolean().optional().describe('Whether the collection is private'),
  itemCount: z.number().optional().describe('Number of items in the collection'),
  lastUpdated: z.string().optional().describe('Last updated timestamp')
});

let mapCollectionSummary = (collection: any) => ({
  slug: collection.slug,
  title: collection.title,
  description: collection.description,
  owner: collection.owner?.name || collection.owner,
  private: collection.private,
  itemCount: Array.isArray(collection.items) ? collection.items.length : collection.itemCount,
  lastUpdated: collection.lastUpdated || collection.updatedAt
});

export let listCollectionsTool = SlateTool.create(spec, {
  name: 'List Collections',
  key: 'list_collections',
  description: `List Hugging Face collections. Filter by owner, query text, or item, and page through collection discovery results.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().optional().describe('Search query for collection title or content'),
      owner: z.string().optional().describe('Owner username or organization namespace'),
      item: z
        .string()
        .optional()
        .describe('Filter by contained item, for example "models/owner/model-name"'),
      sort: z.enum(['upvotes', 'lastModified', 'trending']).optional().describe('Sort field'),
      cursor: z.string().optional().describe('Pagination cursor from a previous response'),
      limit: z
        .number()
        .optional()
        .default(10)
        .describe('Maximum number of collections to return')
    })
  )
  .output(
    z.object({
      collections: z.array(collectionSummarySchema).describe('Matching collections'),
      nextCursor: z.string().optional().describe('Cursor for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HubClient({ token: ctx.auth.token });
    let result = await client.listCollections({
      query: ctx.input.query,
      owner: ctx.input.owner,
      item: ctx.input.item,
      sort: ctx.input.sort,
      cursor: ctx.input.cursor,
      limit: ctx.input.limit
    });

    let rawCollections = Array.isArray(result)
      ? result
      : result.collections || result.items || result.data || [];
    let collections = rawCollections.map(mapCollectionSummary);

    return {
      output: {
        collections,
        nextCursor: result.nextCursor || result.cursor
      },
      message: `Found **${collections.length}** collection(s).`
    };
  })
  .build();

export let getCollectionTool = SlateTool.create(spec, {
  name: 'Get Collection',
  key: 'get_collection',
  description: `Retrieve a Hugging Face collection by its slug. Returns the collection's title, description, and all items (models, datasets, spaces) it contains.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      slug: z.string().describe('Collection slug (e.g. "username/collection-name-64f...")')
    })
  )
  .output(
    z.object({
      slug: z.string().describe('Collection slug'),
      title: z.string().describe('Collection title'),
      description: z.string().optional().describe('Collection description'),
      owner: z.string().optional().describe('Owner username or organization'),
      private: z.boolean().optional().describe('Whether the collection is private'),
      items: z
        .array(
          z.object({
            itemId: z.string().describe('Item ID'),
            itemType: z.string().describe('Item type (model, dataset, space)'),
            note: z.string().optional().describe('Note about the item')
          })
        )
        .describe('Items in the collection'),
      lastUpdated: z.string().optional().describe('Last updated timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HubClient({ token: ctx.auth.token });

    let collection = await client.getCollection({ slug: ctx.input.slug });

    let items = (collection.items || []).map((item: any) => ({
      itemId: item.id || item._id,
      itemType: item.type,
      note: item.note
    }));

    return {
      output: {
        slug: collection.slug,
        title: collection.title,
        description: collection.description,
        owner: collection.owner,
        private: collection.private,
        items,
        lastUpdated: collection.lastUpdated
      },
      message: `Retrieved collection **"${collection.title}"** with **${items.length}** item(s).`
    };
  })
  .build();

export let createCollectionTool = SlateTool.create(spec, {
  name: 'Create Collection',
  key: 'create_collection',
  description: `Create a new collection to curate related models, datasets, and Spaces.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      title: z.string().describe('Collection title'),
      namespace: z.string().describe('User or organization namespace for the collection'),
      description: z.string().optional().describe('Collection description'),
      private: z
        .boolean()
        .optional()
        .default(false)
        .describe('Whether the collection should be private')
    })
  )
  .output(
    z.object({
      slug: z.string().describe('Created collection slug'),
      title: z.string().describe('Collection title'),
      url: z.string().optional().describe('URL to the collection')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HubClient({ token: ctx.auth.token });

    let result = await client.createCollection({
      title: ctx.input.title,
      namespace: ctx.input.namespace,
      description: ctx.input.description,
      private: ctx.input.private
    });

    return {
      output: {
        slug: result.slug,
        title: result.title,
        url: result.url
      },
      message: `Created collection **"${ctx.input.title}"** in namespace **${ctx.input.namespace}**.`
    };
  })
  .build();

export let updateCollectionTool = SlateTool.create(spec, {
  name: 'Update Collection',
  key: 'update_collection',
  description: `Update a Hugging Face collection's title, description, visibility, or theme.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      slug: z.string().describe('Collection slug to update'),
      title: z.string().optional().describe('New collection title'),
      description: z.string().optional().describe('New collection description'),
      private: z.boolean().optional().describe('Whether the collection should be private'),
      theme: z
        .enum(['orange', 'blue', 'green', 'purple', 'pink', 'indigo'])
        .optional()
        .describe('Collection theme color')
    })
  )
  .output(
    z.object({
      slug: z.string().describe('Updated collection slug'),
      title: z.string().optional().describe('Collection title'),
      description: z.string().optional().describe('Collection description'),
      private: z.boolean().optional().describe('Whether the collection is private'),
      url: z.string().optional().describe('URL to the collection')
    })
  )
  .handleInvocation(async ctx => {
    let hasUpdates =
      ctx.input.title !== undefined ||
      ctx.input.description !== undefined ||
      ctx.input.private !== undefined ||
      ctx.input.theme !== undefined;

    if (!hasUpdates) {
      throw huggingFaceServiceError(
        'Provide at least one of title, description, private, or theme to update a collection.'
      );
    }

    let client = new HubClient({ token: ctx.auth.token });
    let result = await client.updateCollection({
      slug: ctx.input.slug,
      title: ctx.input.title,
      description: ctx.input.description,
      private: ctx.input.private,
      theme: ctx.input.theme
    });

    return {
      output: {
        slug: result.slug || ctx.input.slug,
        title: result.title,
        description: result.description,
        private: result.private,
        url: result.url
      },
      message: `Updated collection **${result.slug || ctx.input.slug}**.`
    };
  })
  .build();

export let deleteCollectionTool = SlateTool.create(spec, {
  name: 'Delete Collection',
  key: 'delete_collection',
  description: `Delete a collection. This does not delete the items within the collection, only the collection grouping itself.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      slug: z.string().describe('Collection slug to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the collection was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HubClient({ token: ctx.auth.token });
    await client.deleteCollection({ slug: ctx.input.slug });
    return {
      output: { deleted: true },
      message: `Deleted collection **${ctx.input.slug}**.`
    };
  })
  .build();

export let addCollectionItemTool = SlateTool.create(spec, {
  name: 'Add Collection Item',
  key: 'add_collection_item',
  description: `Add a model, dataset, or space to an existing collection with an optional note.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      slug: z.string().describe('Collection slug'),
      itemId: z.string().describe('Repository ID to add (e.g. "username/repo-name")'),
      itemType: z.enum(['model', 'dataset', 'space']).describe('Type of the item to add'),
      note: z.string().optional().describe('Note about why this item is in the collection')
    })
  )
  .output(
    z.object({
      added: z.boolean().describe('Whether the item was successfully added')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HubClient({ token: ctx.auth.token });

    await client.addCollectionItem({
      slug: ctx.input.slug,
      itemId: ctx.input.itemId,
      itemType: ctx.input.itemType,
      note: ctx.input.note
    });

    return {
      output: { added: true },
      message: `Added **${ctx.input.itemId}** (${ctx.input.itemType}) to collection **${ctx.input.slug}**.`
    };
  })
  .build();

export let removeCollectionItemTool = SlateTool.create(spec, {
  name: 'Remove Collection Item',
  key: 'remove_collection_item',
  description: `Remove an item from a collection.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      slug: z.string().describe('Collection slug'),
      itemId: z.string().describe('ID of the item to remove')
    })
  )
  .output(
    z.object({
      removed: z.boolean().describe('Whether the item was successfully removed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HubClient({ token: ctx.auth.token });

    await client.removeCollectionItem({
      slug: ctx.input.slug,
      itemId: ctx.input.itemId
    });

    return {
      output: { removed: true },
      message: `Removed item from collection **${ctx.input.slug}**.`
    };
  })
  .build();
