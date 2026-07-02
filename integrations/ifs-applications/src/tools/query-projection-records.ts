import { SlateTool } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';
import {
  createIfsClient,
  entitySetSchema,
  projectionEndpointSchema,
  projectionNameSchema,
  skipTokenSchema,
  topSchema
} from './common';

export let queryProjectionRecords = SlateTool.create(spec, {
  name: 'Query Projection Records',
  key: 'query_projection_records',
  description:
    'Query a bounded page of records from one entity set in an enabled IFS OData projection.',
  instructions: [
    'Use list_api_projections and export_projection_openapi first to confirm the projection name, entity set, and fields.',
    'This tool blocks arbitrary URL paths; projectionName and entitySet must be simple identifiers.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectionName: projectionNameSchema,
      projectionEndpoint: projectionEndpointSchema,
      entitySet: entitySetSchema,
      select: z
        .array(z.string().min(1).max(128).describe('Field name to include in OData $select.'))
        .max(50)
        .optional()
        .describe('Optional list of field names for OData $select.'),
      filter: z
        .string()
        .max(1000)
        .optional()
        .describe('Optional OData $filter expression for the selected entity set.'),
      orderBy: z
        .string()
        .max(500)
        .optional()
        .describe('Optional OData $orderby expression for the selected entity set.'),
      top: topSchema,
      skipToken: skipTokenSchema,
      includeCount: z
        .boolean()
        .optional()
        .describe('Set true to request an OData count when the projection supports it.')
    })
  )
  .output(
    z.object({
      projectionName: z.string(),
      entitySet: z.string(),
      records: z.array(z.record(z.string(), z.unknown())),
      count: z.number().optional(),
      returnedCount: z.number(),
      nextPageToken: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createIfsClient(ctx);
    let result = await client.queryProjectionRecords(ctx.input);

    return {
      output: {
        projectionName: ctx.input.projectionName,
        entitySet: ctx.input.entitySet,
        records: result.records,
        count: result.count,
        returnedCount: result.records.length,
        nextPageToken: result.nextPageToken
      },
      message: `Returned **${result.records.length}** record(s) from **${ctx.input.projectionName}.${ctx.input.entitySet}**.`
    };
  })
  .build();
