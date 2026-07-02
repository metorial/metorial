import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getEndpoint = SlateTool.create(spec, {
  name: 'Get Endpoint',
  key: 'get_endpoint',
  description: `Retrieve a webhook endpoint's URL, filtering, throttle, status, metadata, and timestamps by ID or UID.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      applicationId: z.string().describe('Application ID or UID'),
      endpointId: z.string().describe('Endpoint ID or UID')
    })
  )
  .output(
    z.object({
      endpointId: z.string().describe('Svix endpoint ID'),
      url: z.string().describe('Target URL'),
      description: z.string().describe('Endpoint description'),
      uid: z.string().optional().describe('Custom UID'),
      filterTypes: z.array(z.string()).optional().describe('Subscribed event types'),
      channels: z.array(z.string()).optional().describe('Subscribed channels'),
      disabled: z.boolean().describe('Whether the endpoint is disabled'),
      rateLimit: z.number().optional().describe('Deprecated rate limit'),
      throttleRate: z.number().optional().describe('Message throttle rate'),
      metadata: z.record(z.string(), z.string()).describe('Endpoint metadata'),
      createdAt: z.string().describe('When the endpoint was created'),
      updatedAt: z.string().describe('When the endpoint was last updated')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region || 'us'
    });

    ctx.progress('Fetching endpoint...');
    let ep = await client.getEndpoint(ctx.input.applicationId, ctx.input.endpointId);

    return {
      output: {
        endpointId: ep.id,
        url: ep.url,
        description: ep.description,
        uid: ep.uid ?? undefined,
        filterTypes: ep.filterTypes ?? undefined,
        channels: ep.channels ?? undefined,
        disabled: ep.disabled ?? false,
        rateLimit: ep.rateLimit ?? undefined,
        throttleRate: ep.throttleRate ?? undefined,
        metadata: ep.metadata || {},
        createdAt: ep.createdAt,
        updatedAt: ep.updatedAt
      },
      message: `Endpoint \`${ep.id}\` points to **${ep.url}**${ep.disabled ? ' and is disabled' : ''}.`
    };
  })
  .build();
