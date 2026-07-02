import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createEndpoint = SlateTool.create(spec, {
  name: 'Create Endpoint',
  key: 'create_endpoint',
  description: `Create a new webhook endpoint for an application. Endpoints are target URLs that receive webhook messages. Configure event type filtering, channels, and custom headers.`,
  instructions: [
    'filterTypes lets the endpoint subscribe only to specific event types instead of all events.',
    'channels provide additional filtering orthogonal to event types.'
  ]
})
  .input(
    z.object({
      applicationId: z.string().describe('Application ID or UID'),
      url: z.string().describe('Target URL for the webhook endpoint'),
      description: z.string().optional().describe('Description of the endpoint'),
      uid: z.string().optional().describe('Custom UID for the endpoint'),
      version: z.number().optional().describe('Endpoint version (default 1)'),
      filterTypes: z
        .array(z.string())
        .optional()
        .describe('Event types to subscribe to (empty = all events)'),
      channels: z.array(z.string()).optional().describe('Channels the endpoint subscribes to'),
      headers: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom HTTP headers sent with webhook deliveries'),
      secret: z
        .string()
        .optional()
        .describe('Signing secret for the endpoint (auto-generated if not set)'),
      rateLimit: z.number().optional().describe('Deprecated. Use throttleRate instead.'),
      throttleRate: z
        .number()
        .optional()
        .describe('Maximum messages per second to send to this endpoint'),
      disabled: z.boolean().optional().describe('Whether the endpoint starts disabled'),
      metadata: z.record(z.string(), z.string()).optional().describe('Endpoint metadata')
    })
  )
  .output(
    z.object({
      endpointId: z.string().describe('Svix endpoint ID'),
      url: z.string().describe('Endpoint URL'),
      uid: z.string().optional().describe('Custom UID'),
      throttleRate: z.number().optional().describe('Message throttle rate'),
      disabled: z.boolean().describe('Whether the endpoint is disabled'),
      createdAt: z.string().describe('When the endpoint was created')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region || 'us'
    });

    ctx.progress('Creating endpoint...');
    let ep = await client.createEndpoint(ctx.input.applicationId, {
      url: ctx.input.url,
      description: ctx.input.description,
      uid: ctx.input.uid,
      version: ctx.input.version,
      filterTypes: ctx.input.filterTypes,
      channels: ctx.input.channels,
      headers: ctx.input.headers,
      secret: ctx.input.secret,
      rateLimit: ctx.input.rateLimit,
      throttleRate: ctx.input.throttleRate,
      disabled: ctx.input.disabled,
      metadata: ctx.input.metadata
    });

    return {
      output: {
        endpointId: ep.id,
        url: ep.url,
        uid: ep.uid ?? undefined,
        throttleRate: ep.throttleRate ?? undefined,
        disabled: ep.disabled ?? false,
        createdAt: ep.createdAt
      },
      message: `Created endpoint \`${ep.id}\` pointing to **${ep.url}** for application \`${ctx.input.applicationId}\`.`
    };
  })
  .build();

export let listEndpoints = SlateTool.create(spec, {
  name: 'List Endpoints',
  key: 'list_endpoints',
  description: `List all webhook endpoints for a specific application. Returns endpoint URLs, filtering configuration, and status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      applicationId: z.string().describe('Application ID or UID'),
      limit: z.number().optional().describe('Maximum number of endpoints to return'),
      iterator: z.string().optional().describe('Pagination cursor'),
      order: z
        .enum(['ascending', 'descending'])
        .optional()
        .describe('Sort order for returned endpoints')
    })
  )
  .output(
    z.object({
      endpoints: z.array(
        z.object({
          endpointId: z.string().describe('Svix endpoint ID'),
          url: z.string().describe('Target URL'),
          description: z.string().describe('Endpoint description'),
          uid: z.string().optional().describe('Custom UID'),
          filterTypes: z.array(z.string()).optional().describe('Subscribed event types'),
          channels: z.array(z.string()).optional().describe('Subscribed channels'),
          disabled: z.boolean().describe('Whether the endpoint is disabled'),
          rateLimit: z.number().optional().describe('Rate limit'),
          throttleRate: z.number().optional().describe('Message throttle rate'),
          metadata: z.record(z.string(), z.string()).describe('Endpoint metadata'),
          createdAt: z.string().describe('When the endpoint was created'),
          updatedAt: z.string().describe('When the endpoint was last updated')
        })
      ),
      hasMore: z.boolean().describe('Whether more results exist'),
      iterator: z.string().optional().describe('Cursor for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region || 'us'
    });

    ctx.progress('Fetching endpoints...');
    let result = await client.listEndpoints(ctx.input.applicationId, {
      limit: ctx.input.limit,
      iterator: ctx.input.iterator,
      order: ctx.input.order
    });

    let endpoints = result.data.map(ep => ({
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
    }));

    return {
      output: {
        endpoints,
        hasMore: !result.done,
        iterator: result.iterator ?? undefined
      },
      message: `Found **${endpoints.length}** endpoint(s) for application \`${ctx.input.applicationId}\`.${endpoints.length > 0 ? `\n${endpoints.map(e => `- **${e.url}**${e.disabled ? ' (disabled)' : ''}`).join('\n')}` : ''}`
    };
  })
  .build();

export let updateEndpoint = SlateTool.create(spec, {
  name: 'Update Endpoint',
  key: 'update_endpoint',
  description: `Update an existing webhook endpoint's URL, event type filters, channels, rate limit, or other configuration.`
})
  .input(
    z.object({
      applicationId: z.string().describe('Application ID or UID'),
      endpointId: z.string().describe('Endpoint ID or UID to update'),
      url: z.string().describe('Updated target URL'),
      description: z.string().optional().describe('Updated description'),
      filterTypes: z
        .array(z.string())
        .optional()
        .describe('Updated event types to subscribe to'),
      channels: z.array(z.string()).optional().describe('Updated channels'),
      rateLimit: z.number().optional().describe('Deprecated. Use throttleRate instead.'),
      throttleRate: z
        .number()
        .optional()
        .describe('Updated maximum messages per second for this endpoint'),
      disabled: z.boolean().optional().describe('Whether to disable or enable the endpoint'),
      metadata: z.record(z.string(), z.string()).optional().describe('Updated metadata'),
      uid: z.string().optional().describe('Updated custom UID'),
      version: z.number().optional().describe('Updated version')
    })
  )
  .output(
    z.object({
      endpointId: z.string().describe('Svix endpoint ID'),
      url: z.string().describe('Updated URL'),
      throttleRate: z.number().optional().describe('Message throttle rate'),
      disabled: z.boolean().describe('Whether the endpoint is disabled'),
      updatedAt: z.string().describe('When the endpoint was updated')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region || 'us'
    });

    ctx.progress('Updating endpoint...');
    let ep = await client.updateEndpoint(ctx.input.applicationId, ctx.input.endpointId, {
      url: ctx.input.url,
      description: ctx.input.description,
      filterTypes: ctx.input.filterTypes,
      channels: ctx.input.channels,
      rateLimit: ctx.input.rateLimit,
      throttleRate: ctx.input.throttleRate,
      disabled: ctx.input.disabled,
      metadata: ctx.input.metadata,
      uid: ctx.input.uid,
      version: ctx.input.version
    });

    return {
      output: {
        endpointId: ep.id,
        url: ep.url,
        throttleRate: ep.throttleRate ?? undefined,
        disabled: ep.disabled ?? false,
        updatedAt: ep.updatedAt
      },
      message: `Updated endpoint \`${ep.id}\` → **${ep.url}**.`
    };
  })
  .build();

export let deleteEndpoint = SlateTool.create(spec, {
  name: 'Delete Endpoint',
  key: 'delete_endpoint',
  description: `Permanently delete a webhook endpoint from an application. The endpoint will no longer receive messages.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      applicationId: z.string().describe('Application ID or UID'),
      endpointId: z.string().describe('Endpoint ID or UID to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the endpoint was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region || 'us'
    });

    ctx.progress('Deleting endpoint...');
    await client.deleteEndpoint(ctx.input.applicationId, ctx.input.endpointId);

    return {
      output: { deleted: true },
      message: `Deleted endpoint \`${ctx.input.endpointId}\` from application \`${ctx.input.applicationId}\`.`
    };
  })
  .build();
