import { SlateTool } from 'slates';
import { z } from 'zod';
import { NgrokClient } from '../lib/client';
import { spec } from '../spec';

let refSchema = z
  .object({
    id: z.string(),
    uri: z.string()
  })
  .optional()
  .nullable();

let endpointOutputSchema = z.object({
  endpointId: z.string().describe('Endpoint ID'),
  createdAt: z.string().describe('Creation timestamp'),
  updatedAt: z.string().describe('Last update timestamp'),
  publicUrl: z.string().describe('Public URL'),
  proto: z.string().describe('Protocol (http, https, tcp, tls)'),
  hostport: z.string().describe('Host and port combination'),
  host: z.string().describe('Hostname'),
  port: z.number().describe('Port number'),
  type: z.string().describe('Endpoint type (ephemeral, edge, cloud)'),
  description: z.string().describe('Description'),
  metadata: z.string().describe('Metadata'),
  url: z.string().describe('URL'),
  trafficPolicy: z.string().describe('Traffic policy configuration'),
  bindings: z.array(z.string()).describe('Endpoint bindings'),
  domain: refSchema.describe('Associated domain reference'),
  tunnel: refSchema.describe('Associated tunnel reference'),
  tunnelSession: refSchema.describe('Associated tunnel session reference')
});

let mapEndpoint = (e: any) => ({
  endpointId: e.id,
  createdAt: e.created_at || '',
  updatedAt: e.updated_at || '',
  publicUrl: e.public_url || '',
  proto: e.proto || '',
  hostport: e.hostport || '',
  host: e.host || '',
  port: e.port || 0,
  type: e.type || '',
  description: e.description || '',
  metadata: e.metadata || '',
  url: e.url || '',
  trafficPolicy: e.traffic_policy || '',
  bindings: e.bindings || [],
  domain: e.domain?.id ? { id: e.domain.id, uri: e.domain.uri } : null,
  tunnel: e.tunnel?.id ? { id: e.tunnel.id, uri: e.tunnel.uri } : null,
  tunnelSession: e.tunnel_session?.id
    ? { id: e.tunnel_session.id, uri: e.tunnel_session.uri }
    : null
});

export let listEndpoints = SlateTool.create(spec, {
  name: 'List Endpoints',
  key: 'list_endpoints',
  description: `List all active endpoints. Endpoints define how traffic is routed to your services. Only active endpoints associated with a tunnel or backend are returned.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      beforeId: z.string().optional().describe('Pagination cursor'),
      limit: z.number().optional().describe('Max results per page (max 100)')
    })
  )
  .output(
    z.object({
      endpoints: z.array(endpointOutputSchema),
      nextPageUri: z.string().optional().nullable()
    })
  )
  .handleInvocation(async ctx => {
    let client = new NgrokClient(ctx.auth.token);
    let result = await client.listEndpoints({
      beforeId: ctx.input.beforeId,
      limit: ctx.input.limit
    });
    let endpoints = (result.endpoints || []).map(mapEndpoint);
    return {
      output: { endpoints, nextPageUri: result.next_page_uri || null },
      message: `Found **${endpoints.length}** endpoint(s).`
    };
  })
  .build();

export let getEndpoint = SlateTool.create(spec, {
  name: 'Get Endpoint',
  key: 'get_endpoint',
  description: `Retrieve details of a specific endpoint by ID, including its traffic routing configuration and associated tunnel or domain.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      endpointId: z.string().describe('Endpoint ID (e.g., ep_xxx)')
    })
  )
  .output(endpointOutputSchema)
  .handleInvocation(async ctx => {
    let client = new NgrokClient(ctx.auth.token);
    let e = await client.getEndpoint(ctx.input.endpointId);
    return {
      output: mapEndpoint(e),
      message: `Retrieved endpoint **${e.id}** (${e.url || e.hostport}).`
    };
  })
  .build();

export let createEndpoint = SlateTool.create(spec, {
  name: 'Create Cloud Endpoint',
  key: 'create_endpoint',
  description: `Create a new cloud endpoint with a URL and optional traffic policy. Cloud endpoints allow you to route traffic without running an ngrok agent.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      url: z.string().describe('URL for the endpoint (e.g., https://example.ngrok.app)'),
      trafficPolicy: z
        .string()
        .optional()
        .describe('Traffic policy YAML or JSON configuration'),
      description: z.string().optional().describe('Description (max 255 bytes)'),
      metadata: z.string().optional().describe('Metadata (max 4096 bytes)'),
      bindings: z.array(z.string()).optional().describe('Endpoint bindings (e.g., ["public"])')
    })
  )
  .output(endpointOutputSchema)
  .handleInvocation(async ctx => {
    let client = new NgrokClient(ctx.auth.token);
    let e = await client.createEndpoint({
      url: ctx.input.url,
      type: 'cloud',
      trafficPolicy: ctx.input.trafficPolicy,
      description: ctx.input.description,
      metadata: ctx.input.metadata,
      bindings: ctx.input.bindings
    });
    return {
      output: mapEndpoint(e),
      message: `Created cloud endpoint **${e.id}** at ${e.url || e.hostport}.`
    };
  })
  .build();

export let updateEndpoint = SlateTool.create(spec, {
  name: 'Update Endpoint',
  key: 'update_endpoint',
  description: `Update an existing endpoint's URL, traffic policy, description, metadata, or bindings.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      endpointId: z.string().describe('Endpoint ID to update'),
      url: z.string().optional().describe('New URL'),
      trafficPolicy: z.string().optional().describe('New traffic policy'),
      description: z.string().optional().describe('New description'),
      metadata: z.string().optional().describe('New metadata'),
      bindings: z.array(z.string()).optional().describe('New bindings')
    })
  )
  .output(endpointOutputSchema)
  .handleInvocation(async ctx => {
    let client = new NgrokClient(ctx.auth.token);
    let e = await client.updateEndpoint(ctx.input.endpointId, {
      url: ctx.input.url,
      trafficPolicy: ctx.input.trafficPolicy,
      description: ctx.input.description,
      metadata: ctx.input.metadata,
      bindings: ctx.input.bindings
    });
    return {
      output: mapEndpoint(e),
      message: `Updated endpoint **${e.id}**.`
    };
  })
  .build();

export let deleteEndpoint = SlateTool.create(spec, {
  name: 'Delete Endpoint',
  key: 'delete_endpoint',
  description: `Delete a cloud endpoint. This will stop routing traffic to this endpoint.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      endpointId: z.string().describe('Endpoint ID to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new NgrokClient(ctx.auth.token);
    await client.deleteEndpoint(ctx.input.endpointId);
    return {
      output: { success: true },
      message: `Deleted endpoint **${ctx.input.endpointId}**.`
    };
  })
  .build();
