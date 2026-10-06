import { SlateTool } from 'slates';
import { z } from 'zod';
import { workspaceClient } from '../lib/client';
import { pageMetadata, paginationInput, paginationOutput, workspaceId } from '../lib/schemas';
import { spec } from '../spec';

const columns = z.array(z.object({ name: z.string(), type: z.string() })).optional();
export const listSourceObjects = SlateTool.create(spec, {
  name: 'List Source Objects',
  key: 'list_source_objects',
  description:
    'Discovers tables, models and segments for a source connection, including names, IDs and columns needed to configure a sync. Metadata discovery may query the warehouse.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      workspaceId,
      sourceConnectionId: z.number().describe('Source ID from list_connections.'),
      ...paginationInput
    })
  )
  .output(
    z.object({
      objects: z.array(
        z.object({
          type: z.string(),
          objectId: z.number().optional(),
          name: z.string().optional(),
          tableCatalog: z.string().optional(),
          tableSchema: z.string().optional(),
          tableName: z.string().optional(),
          datasetId: z.number().nullish(),
          columns
        })
      ),
      ...paginationOutput
    })
  )
  .handleInvocation(async ctx => {
    const result = await (await workspaceClient(ctx)).listSourceObjects(
      ctx.input.sourceConnectionId,
      ctx.input
    );
    return {
      output: {
        objects: result.objects,
        ...pageMetadata(result.objects.length, result.pagination)
      },
      message: `Retrieved ${result.objects.length} source object(s).`
    };
  })
  .build();
export const listDestinationObjects = SlateTool.create(spec, {
  name: 'List Destination Objects',
  key: 'list_destination_objects',
  description:
    'Discovers destination object names, supported operations, fields and per-operation primary identifier requirements for configuring a sync.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      workspaceId,
      destinationConnectionId: z.number().describe('Destination ID from list_connections.'),
      ...paginationInput
    })
  )
  .output(
    z.object({
      objects: z.array(
        z.object({
          fullName: z.string(),
          label: z.string().optional(),
          supportedOperations: z.array(z.string()).optional(),
          primaryIdentifierRequirements: z
            .record(
              z.string(),
              z.object({
                required: z.boolean().optional(),
                hide_destination_key: z.boolean().optional(),
                notes: z.string().nullish()
              })
            )
            .optional(),
          fields: z
            .array(
              z.object({
                fullName: z.string(),
                label: z.string().optional(),
                type: z.string().optional(),
                requiredForMapping: z.boolean().optional(),
                canBeUpsertKey: z.boolean().optional(),
                canBeUpdateKey: z.boolean().optional(),
                canBeInsertKey: z.boolean().optional()
              })
            )
            .optional()
        })
      ),
      ...paginationOutput
    })
  )
  .handleInvocation(async ctx => {
    const result = await (await workspaceClient(ctx)).listDestinationObjects(
      ctx.input.destinationConnectionId,
      ctx.input
    );
    return {
      output: {
        objects: result.objects,
        ...pageMetadata(result.objects.length, result.pagination)
      },
      message: `Retrieved ${result.objects.length} destination object(s).`
    };
  })
  .build();
export const listDatasets = SlateTool.create(spec, {
  name: 'List Datasets',
  key: 'list_datasets',
  description:
    'Lists current SQL dataset metadata, source IDs and columns. It does not retrieve records or use the separate legacy record-access API.',
  tags: { readOnly: true }
})
  .input(z.object({ workspaceId, ...paginationInput }))
  .output(
    z.object({
      datasets: z.array(
        z.object({
          datasetId: z.number(),
          name: z.string(),
          type: z.string(),
          resourceIdentifier: z.string(),
          sourceConnectionId: z.number().optional(),
          createdAt: z.string().nullish(),
          updatedAt: z.string().nullish(),
          cachedRecordCount: z.number().nullish(),
          columns: z
            .array(
              z.object({ name: z.string(), dataType: z.string(), canBeUpsertKey: z.boolean() })
            )
            .optional()
        })
      ),
      ...paginationOutput
    })
  )
  .handleInvocation(async ctx => {
    const result = await (await workspaceClient(ctx)).listSqlDatasets(ctx.input);
    return {
      output: {
        datasets: result.datasets,
        ...pageMetadata(result.datasets.length, result.pagination)
      },
      message: `Retrieved ${result.datasets.length} SQL dataset(s).`
    };
  })
  .build();
