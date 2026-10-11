import { SlateTool } from 'slates';
import { z } from 'zod';
import { collectionWebUrl, HubClient } from '../lib/client';
import { huggingFaceServiceError } from '../lib/errors';
import { spec } from '../spec';

let collectionSummarySchema = z.object({
  slug: z.string().describe('Collection slug'),
  title: z.string().optional().describe('Collection title'),
  description: z.string().optional().describe('Collection description'),
  owner: z.string().optional().describe('Owner username or organization'),
  private: z.boolean().optional().describe('Whether the collection is private'),
  itemCount: z
    .number()
    .optional()
    .describe(
      'Number of item previews included in this listing (Hugging Face returns at most 4 per collection); call get_collection for the full item list'
    ),
  lastUpdated: z.string().optional().describe('Last updated timestamp')
});

let ownerName = (owner: any) =>
  typeof owner === 'string' ? owner : (owner?.name ?? undefined);

let mapCollectionSummary = (collection: any) => ({
  slug: collection.slug,
  title: collection.title,
  description: collection.description ?? undefined,
  owner: ownerName(collection.owner),
  private: collection.private,
  itemCount: Array.isArray(collection.items) ? collection.items.length : collection.itemCount,
  lastUpdated: collection.lastUpdated || collection.updatedAt
});

let mapCollectionItem = (item: any) => ({
  itemObjectId: item._id,
  itemId: item.id ?? item._id,
  itemType: item.type,
  note: typeof item.note === 'string' ? item.note : (item.note?.text ?? undefined)
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

    let rawCollections = Array.isArray(result.data) ? result.data : [];
    let collections = rawCollections.map(mapCollectionSummary);

    return {
      output: {
        collections,
        nextCursor: result.nextCursor
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
            itemObjectId: z
              .string()
              .optional()
              .describe('Collection item object ID, used by remove_collection_item'),
            itemId: z.string().describe('Item ID (repository ID or paper ID)'),
            itemType: z
              .string()
              .describe('Item type (model, dataset, space, paper, collection)'),
            note: z.string().optional().describe('Note about the item')
          })
        )
        .describe('Items in the collection'),
      lastUpdated: z.string().optional().describe('Last updated timestamp'),
      url: z.string().optional().describe('URL to the collection')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HubClient({ token: ctx.auth.token });

    let collection = await client.getCollection({ slug: ctx.input.slug });

    let items = (collection.items || []).map(mapCollectionItem);

    return {
      output: {
        slug: collection.slug,
        title: collection.title,
        description: collection.description ?? undefined,
        owner: ownerName(collection.owner),
        private: collection.private,
        items,
        lastUpdated: collection.lastUpdated,
        url: collectionWebUrl(collection.slug ?? ctx.input.slug)
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
      title: z.string().describe('Collection title (up to 60 characters)'),
      namespace: z
        .string()
        .describe(
          'User or organization namespace for the collection. Call get_user_info to discover your username and organizations.'
        ),
      description: z
        .string()
        .optional()
        .describe('Collection description (up to 150 characters)'),
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
        url: result.url ?? (result.slug ? collectionWebUrl(result.slug) : undefined)
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
        slug: result?.slug || ctx.input.slug,
        title: result?.title,
        description: result?.description ?? undefined,
        private: result?.private,
        url: collectionWebUrl(result?.slug || ctx.input.slug)
      },
      message: `Updated collection **${result?.slug || ctx.input.slug}**.`
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
      added: z.boolean().describe('Whether the item was successfully added'),
      itemObjectId: z
        .string()
        .optional()
        .describe(
          'Collection item object ID of the added item, used by remove_collection_item'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new HubClient({ token: ctx.auth.token });

    let collection = await client.addCollectionItem({
      slug: ctx.input.slug,
      itemId: ctx.input.itemId,
      itemType: ctx.input.itemType,
      note: ctx.input.note
    });

    let addedItem = (collection?.items || []).find(
      (item: any) => item.id === ctx.input.itemId && item.type === ctx.input.itemType
    );

    return {
      output: { added: true, itemObjectId: addedItem?._id },
      message: `Added **${ctx.input.itemId}** (${ctx.input.itemType}) to collection **${ctx.input.slug}**.`
    };
  })
  .build();

export let removeCollectionItemTool = SlateTool.create(spec, {
  name: 'Remove Collection Item',
  key: 'remove_collection_item',
  description: `Remove an item from a collection. Accepts either the collection item object ID returned by get_collection or add_collection_item, or the repository ID of the item.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      slug: z.string().describe('Collection slug'),
      itemId: z
        .string()
        .describe(
          'Collection item object ID (itemObjectId from get_collection) or the repository ID of the item (e.g. "username/repo-name")'
        ),
      itemType: z
        .enum(['model', 'dataset', 'space', 'paper', 'collection'])
        .optional()
        .describe('Item type, used to disambiguate when itemId is a repository ID')
    })
  )
  .output(
    z.object({
      removed: z.boolean().describe('Whether the item was successfully removed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HubClient({ token: ctx.auth.token });

    let itemObjectId = ctx.input.itemId;
    let collection = await client.getCollection({ slug: ctx.input.slug });
    let items: any[] = Array.isArray(collection?.items) ? collection.items : [];

    if (!items.some(item => item._id === itemObjectId)) {
      let matches = items.filter(
        item =>
          item.id === ctx.input.itemId &&
          (!ctx.input.itemType || item.type === ctx.input.itemType)
      );
      if (matches.length === 0) {
        throw huggingFaceServiceError(
          `Item "${ctx.input.itemId}" was not found in collection "${ctx.input.slug}". Call get_collection to list its items.`
        );
      }
      if (matches.length > 1) {
        throw huggingFaceServiceError(
          `Multiple items match "${ctx.input.itemId}" in collection "${ctx.input.slug}". Provide itemType or the itemObjectId from get_collection.`
        );
      }
      itemObjectId = matches[0]._id;
    }

    await client.removeCollectionItem({
      slug: ctx.input.slug,
      itemObjectId
    });

    return {
      output: { removed: true },
      message: `Removed **${ctx.input.itemId}** from collection **${ctx.input.slug}**.`
    };
  })
  .build();
