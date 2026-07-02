import { SlateTool } from 'slates';
import { z } from 'zod';
import { HubSpotClient } from '../lib/client';
import { hubSpotActionScopes } from '../lib/scopes';
import { spec } from '../spec';

let listOutputSchema = z.object({
  listId: z.string().describe('HubSpot list ID'),
  name: z.string().optional().describe('List name'),
  processingType: z
    .string()
    .optional()
    .describe('Processing type (MANUAL, DYNAMIC, or SNAPSHOT)'),
  objectTypeId: z.string().optional().describe('Object type ID the list contains'),
  size: z.number().optional().describe('Number of records in the list'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last updated timestamp')
});

export let createList = SlateTool.create(spec, {
  name: 'Create List',
  key: 'create_list',
  description: `Create a new contact list in HubSpot. Lists can be MANUAL (manually managed membership), DYNAMIC (membership based on filter criteria), or SNAPSHOT (filter-based at creation, then manually managed).`,
  instructions: [
    'Use objectTypeId "0-1" for contacts, "0-2" for companies.',
    'For DYNAMIC or SNAPSHOT lists, provide a filterBranch defining the membership criteria.'
  ],
  tags: { destructive: false, readOnly: false }
})
  .scopes(hubSpotActionScopes.createList)
  .input(
    z.object({
      name: z.string().describe('List name'),
      processingType: z
        .enum(['MANUAL', 'DYNAMIC', 'SNAPSHOT'])
        .describe(
          'MANUAL for manual membership, DYNAMIC for continuously filter-based, SNAPSHOT for filter-based at creation'
        ),
      objectTypeId: z
        .string()
        .default('0-1')
        .describe('Object type ID (0-1 for contacts, 0-2 for companies)'),
      filterBranch: z.any().optional().describe('Filter criteria for DYNAMIC lists')
    })
  )
  .output(listOutputSchema)
  .handleInvocation(async ctx => {
    let client = new HubSpotClient(ctx.auth.token);
    let result = await client.createList(
      ctx.input.name,
      ctx.input.processingType,
      ctx.input.objectTypeId,
      ctx.input.filterBranch
    );

    return {
      output: {
        listId: String(result.listId || result.id),
        name: result.name,
        processingType: result.processingType,
        objectTypeId: result.objectTypeId,
        size: result.size,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt
      },
      message: `Created ${ctx.input.processingType} list **${ctx.input.name}** (ID: ${result.listId || result.id})`
    };
  })
  .build();

export let getList = SlateTool.create(spec, {
  name: 'Get List',
  key: 'get_list',
  description: `Retrieve a list from HubSpot by ID, including its metadata and membership count.`,
  tags: { readOnly: true }
})
  .scopes(hubSpotActionScopes.getList)
  .input(
    z.object({
      listId: z.string().describe('HubSpot list ID')
    })
  )
  .output(listOutputSchema)
  .handleInvocation(async ctx => {
    let client = new HubSpotClient(ctx.auth.token);
    let result = await client.getList(ctx.input.listId);

    return {
      output: {
        listId: String(result.listId || result.id),
        name: result.name,
        processingType: result.processingType,
        objectTypeId: result.objectTypeId,
        size: result.size,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt
      },
      message: `Retrieved list **${result.name}** (${result.size || 0} members)`
    };
  })
  .build();

export let updateListMembership = SlateTool.create(spec, {
  name: 'Update List Membership',
  key: 'update_list_membership',
  description: `Add or remove records from a manually managed HubSpot list. Provide record IDs to add, remove, or both in a single operation.`,
  constraints: [
    'Only works with MANUAL or SNAPSHOT lists. DYNAMIC lists are automatically managed by their filter criteria.'
  ],
  tags: { destructive: false, readOnly: false }
})
  .scopes(hubSpotActionScopes.updateListMembership)
  .input(
    z.object({
      listId: z.string().describe('HubSpot list ID'),
      addRecordIds: z.array(z.string()).optional().describe('Record IDs to add to the list'),
      removeRecordIds: z
        .array(z.string())
        .optional()
        .describe('Record IDs to remove from the list')
    })
  )
  .output(
    z.object({
      recordsAdded: z.number().optional().describe('Number of records added'),
      recordsRemoved: z.number().optional().describe('Number of records removed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HubSpotClient(ctx.auth.token);
    let added = 0;
    let removed = 0;

    if (ctx.input.addRecordIds && ctx.input.addRecordIds.length > 0) {
      let result = await client.addToList(ctx.input.listId, ctx.input.addRecordIds);
      added = result?.recordIdsAdded?.length || ctx.input.addRecordIds.length;
    }

    if (ctx.input.removeRecordIds && ctx.input.removeRecordIds.length > 0) {
      let result = await client.removeFromList(ctx.input.listId, ctx.input.removeRecordIds);
      removed = result?.recordIdsRemoved?.length || ctx.input.removeRecordIds.length;
    }

    return {
      output: {
        recordsAdded: added,
        recordsRemoved: removed
      },
      message: `Updated list membership: **${added}** added, **${removed}** removed`
    };
  })
  .build();

export let deleteList = SlateTool.create(spec, {
  name: 'Delete List',
  key: 'delete_list',
  description: `Delete a list from HubSpot. This removes the list definition but does not delete the records in it.`,
  tags: { destructive: true, readOnly: false }
})
  .scopes(hubSpotActionScopes.deleteList)
  .input(
    z.object({
      listId: z.string().describe('HubSpot list ID to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HubSpotClient(ctx.auth.token);
    await client.deleteList(ctx.input.listId);

    return {
      output: { success: true },
      message: `Deleted list (ID: ${ctx.input.listId})`
    };
  })
  .build();

export let searchLists = SlateTool.create(spec, {
  name: 'Search Lists',
  key: 'search_lists',
  description: `Search for lists in HubSpot by name. Optionally filter by processing type (MANUAL, DYNAMIC, or SNAPSHOT).`,
  tags: { readOnly: true }
})
  .scopes(hubSpotActionScopes.searchLists)
  .input(
    z.object({
      query: z.string().describe('Search query for list name'),
      processingTypes: z
        .array(z.enum(['MANUAL', 'DYNAMIC', 'SNAPSHOT']))
        .optional()
        .describe('Filter by processing type')
    })
  )
  .output(
    z.object({
      lists: z.array(listOutputSchema).describe('Matching lists'),
      total: z.number().optional().describe('Total number of results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HubSpotClient(ctx.auth.token);
    let result = await client.searchLists(ctx.input.query, ctx.input.processingTypes);

    let lists = (result.lists || result.results || []).map((r: any) => ({
      listId: String(r.listId || r.id),
      name: r.name,
      processingType: r.processingType,
      objectTypeId: r.objectTypeId,
      size: r.size,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt
    }));

    return {
      output: {
        lists,
        total: result.total || lists.length
      },
      message: `Found **${lists.length}** lists matching "${ctx.input.query}"`
    };
  })
  .build();
