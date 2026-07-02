import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listWebhookEndpoints = SlateTool.create(spec, {
  name: 'List Webhook Endpoints',
  key: 'list_webhook_endpoints',
  description: `List all configured webhook endpoints in FullStory. Shows each endpoint's URL, subscribed event types, and enabled status.`,
  constraints: ['Requires an Admin or Architect API key.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z
        .number()
        .optional()
        .describe('Maximum number of endpoints to return (default 100)'),
      paginationToken: z.string().optional().describe('Token for retrieving the next page')
    })
  )
  .output(
    z.object({
      endpoints: z.array(
        z.object({
          endpointId: z.string().describe('Webhook endpoint ID'),
          url: z.string().describe('Destination URL'),
          enabled: z.boolean().describe('Whether the endpoint is enabled'),
          eventTypes: z
            .array(
              z.object({
                eventName: z.string().describe('Event type name'),
                subcategory: z.string().optional().describe('Event subcategory')
              })
            )
            .describe('Subscribed event types'),
          created: z.string().describe('When the endpoint was created'),
          modified: z.string().describe('When the endpoint was last modified')
        })
      ),
      nextPaginationToken: z
        .string()
        .optional()
        .describe('Token for the next page, absent if no more results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listWebhookEndpoints({
      limit: ctx.input.limit,
      paginationToken: ctx.input.paginationToken
    });

    return {
      output: {
        endpoints: result.endpoints,
        nextPaginationToken: result.nextPaginationToken
      },
      message: `Found **${result.endpoints.length}** webhook endpoints.${result.nextPaginationToken ? ' More results available.' : ''}`
    };
  })
  .build();
