import { SlateTool } from '@slates/provider';
import { z } from 'zod';
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
      workspaceId: z.string().describe('Fabric workspace ID where the item will be created.'),
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
