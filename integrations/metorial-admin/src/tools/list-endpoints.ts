import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { resolveMetorialRuntimeConfig } from '../config';
import { MetorialClient } from '../lib/client';
import { listMetorialEndpoints, METORIAL_METHODS } from '../lib/endpoints';
import { spec } from '../spec';

let methodSchema = z.enum(METORIAL_METHODS);
let endpointRecordSchema = z.record(z.string(), z.unknown());

export let listEndpoints = SlateTool.create(spec, {
  name: 'List Endpoints',
  key: 'list_endpoints',
  description:
    'List callable Metorial dashboard instance API endpoints from runtime introspection. Hidden, deprecated, confidential, and non-instance endpoints are excluded.',
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      search: z
        .string()
        .optional()
        .describe(
          'Case-insensitive search across endpoint path, method, name, and description.'
        ),
      method: methodSchema.optional().describe('Filter endpoints by HTTP method.'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(200)
        .optional()
        .describe('Maximum endpoints to return.'),
      offset: z.number().int().min(0).optional().describe('Zero-based pagination offset.'),
      includeSchemas: z
        .boolean()
        .optional()
        .describe('Include full query and body schema metadata. Defaults to false.')
    })
  )
  .output(
    z.object({
      endpoints: z.array(endpointRecordSchema).describe('Filtered endpoint metadata.'),
      total: z.number().describe('Total matching endpoints before pagination.'),
      limit: z.number().describe('Applied result limit.'),
      offset: z.number().describe('Applied result offset.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MetorialClient(resolveMetorialRuntimeConfig(ctx.config, ctx.auth));
    let docs = await client.introspectEndpoints();
    let result = listMetorialEndpoints(docs, {
      search: ctx.input.search,
      method: ctx.input.method,
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      includeSchemas: ctx.input.includeSchemas
    });

    return {
      output: result,
      message: `Found **${result.total}** Metorial endpoint(s); returning **${result.endpoints.length}**.`
    };
  })
  .build();
