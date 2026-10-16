import { SlateTool } from 'slates';
import { z } from 'zod';
import { fabricValidationError } from '../lib/errors';
import { spec } from '../spec';
import { createFabricClient } from './common';

let operationSchema = z.object({
  status: z.number().describe('HTTP status returned by Microsoft Fabric.'),
  statusText: z.string().optional().describe('HTTP status text.'),
  location: z.string().optional().describe('LRO Location header, when present.'),
  operationId: z
    .string()
    .optional()
    .describe('Fabric x-ms-operation-id header, when present.'),
  retryAfter: z.string().optional().describe('Retry-After header, when present.')
});

export let coreCreateItem = SlateTool.create(spec, {
  name: 'Core Create Item',
  key: 'core_create_item',
  description:
    'Official upstream MCP name: core_create-item. Create a Microsoft Fabric item in a workspace using Fabric REST.',
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({
      workspaceId: z
        .string()
        .describe(
          'Fabric workspace ID from core_list_workspaces where the item will be created.'
        ),
      displayName: z.string().describe('Display name for the new item.'),
      itemType: z
        .string()
        .describe('Fabric item type, such as Lakehouse, DataPipeline, Dataflow, or Notebook.'),
      description: z.string().optional().describe('Optional item description.'),
      definition: z
        .unknown()
        .optional()
        .describe(
          'Optional item-type-specific definition payload. Use either definition or creationPayload, not both.'
        ),
      creationPayload: z
        .unknown()
        .optional()
        .describe(
          'Optional item-type-specific creation payload. Use either creationPayload or definition, not both.'
        ),
      folderId: z
        .string()
        .optional()
        .describe('Optional Fabric folder ID where the item should be created.'),
      options: z
        .record(z.string(), z.unknown())
        .optional()
        .describe(
          'Item-type-specific definition options. Requires definition; see the item type Update Definition API.'
        ),
      sensitivityLabelSettings: z
        .unknown()
        .optional()
        .describe('Optional Fabric sensitivity label settings for the item.')
    })
  )
  .output(
    z.object({
      workspaceId: z.string().describe('Workspace where the item was created.'),
      item: z.unknown().describe('Fabric item response body, when returned synchronously.'),
      operation: operationSchema.describe('HTTP and LRO operation metadata.')
    })
  )
  .handleInvocation(async ctx => {
    let result = await createFabricClient(ctx).createItem(ctx.input);

    return {
      output: {
        workspaceId: ctx.input.workspaceId,
        item: result.item,
        operation: result.operation
      },
      message: `Created Fabric item **${ctx.input.displayName}** or started its creation operation.`
    };
  })
  .build();

export { operationSchema };

let workspaceIdSchema = z
  .string()
  .describe(
    'Fabric workspace ID. Call core_list_workspaces to discover authorized workspaces.'
  );
let itemIdSchema = z
  .string()
  .describe('Fabric item ID. Call core_list_items to discover workspace items.');
let itemReferenceSchema = { workspaceId: workspaceIdSchema, itemId: itemIdSchema };
let jobReferenceSchema = {
  ...itemReferenceSchema,
  jobInstanceId: z
    .string()
    .describe('Job instance ID from the Location URL returned by datafactory_run_pipeline.')
};
let paginationInput = {
  continuationToken: z
    .string()
    .optional()
    .describe('Continuation token from a previous response.'),
  pageLimit: z
    .number()
    .optional()
    .describe(
      'Maximum number of pages to retrieve. Omit to retrieve all pages; must be a positive integer.'
    )
};
let validatePageLimit = (pageLimit?: number) => {
  if (pageLimit !== undefined && (!Number.isInteger(pageLimit) || pageLimit < 1)) {
    throw fabricValidationError('pageLimit must be a positive integer.');
  }
};
let paginatedOutput = {
  continuationToken: z
    .string()
    .optional()
    .describe('Continuation token when more pages are available.'),
  pageCount: z.number().describe('Number of pages retrieved.')
};

export let coreListWorkspaces = SlateTool.create(spec, {
  name: 'Core List Workspaces',
  key: 'core_list_workspaces',
  description:
    'Discover accessible Fabric workspaces and their IDs using the Fabric REST API.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      ...paginationInput,
      roles: z
        .string()
        .optional()
        .describe(
          'Comma-separated workspace roles to filter, such as Admin,Member,Contributor,Viewer.'
        ),
      preferWorkspaceSpecificEndpoints: z
        .boolean()
        .optional()
        .describe('Include workspace-specific API endpoints in the provider response.')
    })
  )
  .output(
    z.object({
      workspaces: z
        .array(z.unknown())
        .describe(
          'Complete workspace objects returned by Fabric, including IDs and display names.'
        ),
      ...paginatedOutput
    })
  )
  .handleInvocation(async ctx => {
    validatePageLimit(ctx.input.pageLimit);
    let result = await createFabricClient(ctx).listWorkspaces(ctx.input);
    return {
      output: {
        workspaces: result.items,
        continuationToken: result.continuationToken,
        pageCount: result.pageCount
      },
      message: `Returned **${result.items.length}** Fabric workspace(s).`
    };
  })
  .build();

export let coreListItems = SlateTool.create(spec, {
  name: 'Core List Items',
  key: 'core_list_items',
  description:
    'Discover Fabric items in a workspace. Call core_list_workspaces first to select a workspace.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      workspaceId: workspaceIdSchema,
      ...paginationInput,
      itemType: z
        .string()
        .optional()
        .describe('Filter by Fabric item type, such as Lakehouse or DataPipeline.'),
      recursive: z
        .boolean()
        .optional()
        .describe('Include nested folders. Fabric defaults to true.'),
      rootFolderId: z
        .string()
        .optional()
        .describe('Optional root folder ID; omitted uses the workspace root.'),
      include: z
        .array(z.string())
        .optional()
        .describe('Additional properties to include, currently DefaultIdentity.')
    })
  )
  .output(
    z.object({
      workspaceId: z.string(),
      items: z
        .array(z.unknown())
        .describe('Complete item objects returned by Fabric, including IDs, names and types.'),
      ...paginatedOutput
    })
  )
  .handleInvocation(async ctx => {
    validatePageLimit(ctx.input.pageLimit);
    let result = await createFabricClient(ctx).listItems(ctx.input);
    return {
      output: {
        workspaceId: ctx.input.workspaceId,
        items: result.items,
        continuationToken: result.continuationToken,
        pageCount: result.pageCount
      },
      message: `Returned **${result.items.length}** Fabric item(s).`
    };
  })
  .build();

export let coreGetItem = SlateTool.create(spec, {
  name: 'Core Get Item',
  key: 'core_get_item',
  description:
    'Read a Fabric item. Discover workspace and item IDs with core_list_workspaces and core_list_items.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      ...itemReferenceSchema,
      include: z
        .array(z.string())
        .optional()
        .describe('Additional properties to include, currently DefaultIdentity.')
    })
  )
  .output(
    z.object({
      workspaceId: z.string(),
      itemId: z.string(),
      item: z.unknown().describe('Complete Fabric item response.')
    })
  )
  .handleInvocation(async ctx => ({
    output: {
      workspaceId: ctx.input.workspaceId,
      itemId: ctx.input.itemId,
      item: await createFabricClient(ctx).getItem(ctx.input)
    },
    message: `Returned Fabric item **${ctx.input.itemId}**.`
  }))
  .build();

export let coreUpdateItem = SlateTool.create(spec, {
  name: 'Core Update Item',
  key: 'core_update_item',
  description:
    'Update a Fabric item display name or description. Discover IDs with core_list_workspaces and core_list_items.',
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({
      ...itemReferenceSchema,
      displayName: z
        .string()
        .optional()
        .describe('New display name. Provide displayName or description.'),
      description: z
        .string()
        .max(256)
        .optional()
        .describe('New description. An empty string clears it.')
    })
  )
  .output(
    z.object({
      workspaceId: z.string(),
      itemId: z.string(),
      item: z.unknown().describe('Complete updated Fabric item response.')
    })
  )
  .handleInvocation(async ctx => ({
    output: {
      workspaceId: ctx.input.workspaceId,
      itemId: ctx.input.itemId,
      item: await createFabricClient(ctx).updateItem(ctx.input)
    },
    message: `Updated Fabric item **${ctx.input.itemId}**.`
  }))
  .build();

export let coreDeleteItem = SlateTool.create(spec, {
  name: 'Core Delete Item',
  key: 'core_delete_item',
  description:
    'Delete a Fabric item. Discover IDs with core_list_workspaces and core_list_items. Fabric uses soft deletion for supported item types unless hardDelete is true.',
  tags: { readOnly: false, destructive: true }
})
  .input(
    z.object({
      ...itemReferenceSchema,
      hardDelete: z
        .boolean()
        .optional()
        .describe(
          'Permanently delete the item when true. Omitted or false uses soft deletion where supported.'
        )
    })
  )
  .output(
    z.object({
      workspaceId: z.string(),
      itemId: z.string(),
      result: z.unknown().describe('Complete provider response, when present.'),
      operation: operationSchema
    })
  )
  .handleInvocation(async ctx => ({
    output: {
      workspaceId: ctx.input.workspaceId,
      itemId: ctx.input.itemId,
      ...(await createFabricClient(ctx).deleteItem(ctx.input))
    },
    message: `Fabric accepted deletion of item **${ctx.input.itemId}**.`
  }))
  .build();

export let coreGetOperationState = SlateTool.create(spec, {
  name: 'Core Get Operation State',
  key: 'core_get_operation_state',
  description:
    'Check a Fabric long-running operation using the x-ms-operation-id returned by creation or query execution. Respect Retry-After before polling.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({ operationId: z.string().describe('Operation ID from x-ms-operation-id.') })
  )
  .output(
    z.object({
      operationId: z.string(),
      state: z
        .unknown()
        .describe('Complete operation state, progress and provider failure details.'),
      operation: operationSchema
    })
  )
  .handleInvocation(async ctx => ({
    output: {
      operationId: ctx.input.operationId,
      ...(await createFabricClient(ctx).getOperationState(ctx.input.operationId))
    },
    message: `Returned state for Fabric operation **${ctx.input.operationId}**.`
  }))
  .build();

export let coreGetItemJob = SlateTool.create(spec, {
  name: 'Core Get Item Job',
  key: 'core_get_item_job',
  description:
    'Check an item job started by datafactory_run_pipeline. Respect Retry-After before polling; discover workspace and item IDs with core_list_workspaces and core_list_items.',
  tags: { readOnly: true, destructive: false }
})
  .input(z.object(jobReferenceSchema))
  .output(
    z.object({
      workspaceId: z.string(),
      itemId: z.string(),
      jobInstanceId: z.string(),
      job: z.unknown().describe('Complete job status, timing and failure details.'),
      operation: operationSchema
    })
  )
  .handleInvocation(async ctx => ({
    output: { ...ctx.input, ...(await createFabricClient(ctx).getItemJob(ctx.input)) },
    message: `Returned Fabric job **${ctx.input.jobInstanceId}**.`
  }))
  .build();

export let coreCancelItemJob = SlateTool.create(spec, {
  name: 'Core Cancel Item Job',
  key: 'core_cancel_item_job',
  description:
    'Request cancellation of a running Fabric item job. Use core_get_item_job to confirm its eventual state; discover workspace and item IDs with core_list_workspaces and core_list_items.',
  tags: { readOnly: false, destructive: true }
})
  .input(z.object(jobReferenceSchema))
  .output(
    z.object({
      workspaceId: z.string(),
      itemId: z.string(),
      jobInstanceId: z.string(),
      result: z.unknown().describe('Complete cancellation response, when present.'),
      operation: operationSchema
    })
  )
  .handleInvocation(async ctx => ({
    output: { ...ctx.input, ...(await createFabricClient(ctx).cancelItemJob(ctx.input)) },
    message: `Requested cancellation of Fabric job **${ctx.input.jobInstanceId}**.`
  }))
  .build();
