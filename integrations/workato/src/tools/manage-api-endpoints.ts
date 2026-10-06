import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/create-client';
import { numericId, records } from '../lib/validation';
import { spec } from '../spec';

export let manageApiEndpointsTool = SlateTool.create(spec, {
  name: 'Manage API Endpoints',
  key: 'manage_api_endpoints',
  description: `List API collections and endpoints in the Workato API Platform. Enable or disable individual API endpoints. Use to manage the lifecycle of APIs built on Workato.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z
        .enum(['list_collections', 'list_endpoints', 'enable_endpoint', 'disable_endpoint'])
        .describe('Action to perform'),
      collectionId: z
        .string()
        .optional()
        .describe('API collection ID (for list_endpoints filter)'),
      page: z
        .number()
        .optional()
        .describe('Native page number for collection/endpoint lists.'),
      perPage: z.number().optional().describe('Native page size, at most 100.'),
      endpointId: z.string().optional().describe('Endpoint ID (required for enable/disable)')
    })
  )
  .output(
    z.object({
      success: z.boolean().optional().describe('Whether the operation succeeded'),
      collections: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('API collections'),
      endpoints: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('API endpoints')
    })
  )
  .handleInvocation(async ctx => {
    const client = createClient(ctx);
    const { action, collectionId, endpointId } = ctx.input;
    if (action === 'list_collections') {
      const result = await client.listApiCollections(ctx.input);
      const collections = records(result.items);
      return {
        output: { success: true, collections },
        message: `Returned ${collections.length} collections from this page.`
      };
    }
    if (action === 'list_endpoints') {
      const result = await client.listApiEndpoints(collectionId, ctx.input);
      const endpoints = records(result.items);
      return {
        output: { success: true, endpoints },
        message: `Returned ${endpoints.length} endpoints from this page.`
      };
    }
    const id = numericId(endpointId, 'endpointId');
    if (action === 'enable_endpoint') await client.enableApiEndpoint(id);
    else await client.disableApiEndpoint(id);
    return {
      output: { success: true },
      message: `Endpoint ${action} accepted. Existing requests and external effects are retained.`
    };
  });
