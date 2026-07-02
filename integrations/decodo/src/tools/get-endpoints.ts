import { SlateTool } from 'slates';
import { z } from 'zod';
import { PublicApiClient } from '../lib/public-api-client';
import { spec } from '../spec';

export let getProxyEndpoints = SlateTool.create(spec, {
  name: 'Get Proxy Endpoints',
  key: 'get_proxy_endpoints',
  description: `Retrieve available proxy endpoint types (random, sticky) with their available geo-locations. Optionally filter by endpoint type to get details for a specific configuration.`,
  constraints: ['Requires API Key authentication (Public API).'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      endpointType: z
        .enum(['random', 'sticky'])
        .optional()
        .describe('Filter by endpoint type. Omit to list all types.')
    })
  )
  .output(
    z.object({
      endpoints: z
        .array(
          z.object({
            type: z.string().describe('Endpoint type (random or sticky)'),
            availableLocations: z.array(z.any()).describe('Available geo-targeting locations'),
            url: z.string().describe('Endpoint URL')
          })
        )
        .describe('Available proxy endpoints')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PublicApiClient(ctx.auth.token);

    let endpoints: any;
    if (ctx.input.endpointType) {
      let endpoint = await client.getEndpointsByType(ctx.input.endpointType);
      endpoints = [endpoint];
    } else {
      endpoints = await client.getEndpoints();
    }

    return {
      output: { endpoints },
      message: `Found **${endpoints.length}** endpoint type(s): ${endpoints.map((e: any) => e.type).join(', ')}.`
    };
  })
  .build();
