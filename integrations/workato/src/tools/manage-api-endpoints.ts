import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/create-client';
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
      endpointId: z.string().optional().describe('Endpoint ID (required for enable/disable)')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation succeeded'),
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
    let client = createClient(ctx);
    let { action, collectionId, endpointId } = ctx.input;

    if (action === 'list_collections') {
      let result = await client.listApiCollections();
      let items = Array.isArray(result) ? result : (result.items ?? result.data ?? []);
      return {
        output: { success: true, collections: items },
        message: `Found **${items.length}** API collections.`
      };
    }

    if (action === 'list_endpoints') {
      let result = await client.listApiEndpoints(collectionId);
      let items = Array.isArray(result) ? result : (result.items ?? result.data ?? []);
      return {
        output: { success: true, endpoints: items },
        message: `Found **${items.length}** API endpoints.`
      };
    }

    if (!endpointId) throw new Error('Endpoint ID is required for enable/disable');

    if (action === 'enable_endpoint') {
      await client.enableApiEndpoint(endpointId);
      return {
        output: { success: true },
        message: `Enabled API endpoint **${endpointId}**.`
      };
    }

    // disable_endpoint
    await client.disableApiEndpoint(endpointId);
    return {
      output: { success: true },
      message: `Disabled API endpoint **${endpointId}**.`
    };
  });
