import { SlateTool } from 'slates';
import { z } from 'zod';
import { NgrokClient } from '../lib/client';
import { spec } from '../spec';

let refSchema = z.object({
  id: z.string(),
  uri: z.string()
});

let sourceSchema = z.object({
  type: z
    .string()
    .describe('Event source type (e.g., "api_key_created.v0", "http_request_complete.v0")')
});

let subscriptionOutputSchema = z.object({
  subscriptionId: z.string().describe('Event subscription ID'),
  uri: z.string().describe('API resource URI'),
  createdAt: z.string().describe('Creation timestamp'),
  description: z.string().describe('Description'),
  metadata: z.string().describe('Metadata'),
  sources: z.array(sourceSchema).describe('Event sources being captured'),
  destinations: z.array(refSchema).describe('Destinations where events are sent')
});

let mapSubscription = (s: any) => ({
  subscriptionId: s.id,
  uri: s.uri || '',
  createdAt: s.created_at || '',
  description: s.description || '',
  metadata: s.metadata || '',
  sources: (s.sources || []).map((src: any) => ({ type: src.type })),
  destinations: (s.destinations || []).map((d: any) => ({ id: d.id, uri: d.uri }))
});

let destinationOutputSchema = z.object({
  destinationId: z.string().describe('Event destination ID'),
  uri: z.string().describe('API resource URI'),
  createdAt: z.string().describe('Creation timestamp'),
  description: z.string().describe('Description'),
  metadata: z.string().describe('Metadata'),
  format: z.string().describe('Event format (e.g., "json")'),
  target: z
    .any()
    .describe(
      'Target configuration (kinesis, firehose, cloudwatch_logs, datadog, or azure_logs_ingestion)'
    )
});

let mapDestination = (d: any) => ({
  destinationId: d.id,
  uri: d.uri || '',
  createdAt: d.created_at || '',
  description: d.description || '',
  metadata: d.metadata || '',
  format: d.format || 'json',
  target: d.target || null
});

export let listEventSubscriptions = SlateTool.create(spec, {
  name: 'List Event Subscriptions',
  key: 'list_event_subscriptions',
  description: `List all event subscriptions. Event subscriptions capture audit and traffic events and publish them to configured destinations (CloudWatch, Kinesis, Firehose, Datadog, or Azure Logs).`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      beforeId: z.string().optional().describe('Pagination cursor'),
      limit: z.number().optional().describe('Max results per page')
    })
  )
  .output(
    z.object({
      subscriptions: z.array(subscriptionOutputSchema),
      nextPageUri: z.string().optional().nullable()
    })
  )
  .handleInvocation(async ctx => {
    let client = new NgrokClient(ctx.auth.token);
    let result = await client.listEventSubscriptions({
      beforeId: ctx.input.beforeId,
      limit: ctx.input.limit
    });
    let subscriptions = (result.event_subscriptions || []).map(mapSubscription);
    return {
      output: { subscriptions, nextPageUri: result.next_page_uri || null },
      message: `Found **${subscriptions.length}** event subscription(s).`
    };
  })
  .build();

export let getEventSubscription = SlateTool.create(spec, {
  name: 'Get Event Subscription',
  key: 'get_event_subscription',
  description: `Retrieve details of a specific event subscription including its sources and destinations.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      subscriptionId: z.string().describe('Event subscription ID (e.g., esb_xxx)')
    })
  )
  .output(subscriptionOutputSchema)
  .handleInvocation(async ctx => {
    let client = new NgrokClient(ctx.auth.token);
    let s = await client.getEventSubscription(ctx.input.subscriptionId);
    return {
      output: mapSubscription(s),
      message: `Retrieved event subscription **${s.id}** with ${(s.sources || []).length} source(s).`
    };
  })
  .build();

export let createEventSubscription = SlateTool.create(spec, {
  name: 'Create Event Subscription',
  key: 'create_event_subscription',
  description: `Create an event subscription to capture audit or traffic events. Specify which event types to capture (sources) and where to send them (destination IDs). Create event destinations first using the "Create Event Destination" tool.

Common audit event types: \`api_key_created.v0\`, \`ip_policy_created.v0\`, \`ip_policy_updated.v0\`
Common traffic event types: \`http_request_complete.v0\`, \`tcp_connection_closed.v0\``,
  tags: { destructive: false }
})
  .input(
    z.object({
      sources: z
        .array(
          z.object({
            type: z.string().describe('Event type (e.g., "http_request_complete.v0")')
          })
        )
        .describe('Event sources to capture'),
      destinationIds: z.array(z.string()).describe('Event destination IDs to publish to'),
      description: z.string().optional().describe('Description (max 255 bytes)'),
      metadata: z.string().optional().describe('Metadata (max 4096 bytes)')
    })
  )
  .output(subscriptionOutputSchema)
  .handleInvocation(async ctx => {
    let client = new NgrokClient(ctx.auth.token);
    let s = await client.createEventSubscription({
      sources: ctx.input.sources,
      destinationIds: ctx.input.destinationIds,
      description: ctx.input.description,
      metadata: ctx.input.metadata
    });
    return {
      output: mapSubscription(s),
      message: `Created event subscription **${s.id}** with ${(s.sources || []).length} source(s).`
    };
  })
  .build();

export let updateEventSubscription = SlateTool.create(spec, {
  name: 'Update Event Subscription',
  key: 'update_event_subscription',
  description: `Update an event subscription's sources, destinations, description, or metadata.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      subscriptionId: z.string().describe('Event subscription ID to update'),
      sources: z
        .array(
          z.object({
            type: z.string()
          })
        )
        .optional()
        .describe('New event sources'),
      destinationIds: z.array(z.string()).optional().describe('New destination IDs'),
      description: z.string().optional().describe('New description'),
      metadata: z.string().optional().describe('New metadata')
    })
  )
  .output(subscriptionOutputSchema)
  .handleInvocation(async ctx => {
    let client = new NgrokClient(ctx.auth.token);
    let s = await client.updateEventSubscription(ctx.input.subscriptionId, {
      sources: ctx.input.sources,
      destinationIds: ctx.input.destinationIds,
      description: ctx.input.description,
      metadata: ctx.input.metadata
    });
    return {
      output: mapSubscription(s),
      message: `Updated event subscription **${s.id}**.`
    };
  })
  .build();

export let deleteEventSubscription = SlateTool.create(spec, {
  name: 'Delete Event Subscription',
  key: 'delete_event_subscription',
  description: `Delete an event subscription. Events will no longer be captured and published.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      subscriptionId: z.string().describe('Event subscription ID to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new NgrokClient(ctx.auth.token);
    await client.deleteEventSubscription(ctx.input.subscriptionId);
    return {
      output: { success: true },
      message: `Deleted event subscription **${ctx.input.subscriptionId}**.`
    };
  })
  .build();

export let listEventDestinations = SlateTool.create(spec, {
  name: 'List Event Destinations',
  key: 'list_event_destinations',
  description: `List all event destinations. Destinations define where captured events are published (CloudWatch Logs, Kinesis, Firehose, Datadog, or Azure Logs Ingestion).`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      beforeId: z.string().optional().describe('Pagination cursor'),
      limit: z.number().optional().describe('Max results per page')
    })
  )
  .output(
    z.object({
      destinations: z.array(destinationOutputSchema),
      nextPageUri: z.string().optional().nullable()
    })
  )
  .handleInvocation(async ctx => {
    let client = new NgrokClient(ctx.auth.token);
    let result = await client.listEventDestinations({
      beforeId: ctx.input.beforeId,
      limit: ctx.input.limit
    });
    let destinations = (result.event_destinations || []).map(mapDestination);
    return {
      output: { destinations, nextPageUri: result.next_page_uri || null },
      message: `Found **${destinations.length}** event destination(s).`
    };
  })
  .build();

export let createEventDestination = SlateTool.create(spec, {
  name: 'Create Event Destination',
  key: 'create_event_destination',
  description: `Create an event destination for publishing captured events. The target must be exactly one of: **kinesis**, **firehose**, **cloudwatch_logs**, **datadog**, or **azure_logs_ingestion**. Each target type has its own configuration format.`,
  instructions: [
    'For Kinesis: target = { "kinesis": { "stream_arn": "...", "auth": { "role": { "role_arn": "..." } } } }',
    'For Firehose: target = { "firehose": { "delivery_stream_arn": "...", "auth": { "role": { "role_arn": "..." } } } }',
    'For CloudWatch: target = { "cloudwatch_logs": { "log_group_arn": "...", "auth": { "role": { "role_arn": "..." } } } }',
    'For Datadog: target = { "datadog": { "api_key": "...", "ddtags": "...", "service": "...", "ddsite": "..." } }',
    'For Azure: target = { "azure_logs_ingestion": { "tenant_id": "...", "client_id": "...", "client_secret": "...", ... } }'
  ],
  tags: { destructive: false }
})
  .input(
    z.object({
      target: z
        .any()
        .describe('Target configuration object with exactly one destination type'),
      format: z.string().optional().describe('Event format (default "json")'),
      description: z.string().optional().describe('Description (max 255 bytes)'),
      metadata: z.string().optional().describe('Metadata (max 4096 bytes)')
    })
  )
  .output(destinationOutputSchema)
  .handleInvocation(async ctx => {
    let client = new NgrokClient(ctx.auth.token);
    let d = await client.createEventDestination({
      target: ctx.input.target,
      format: ctx.input.format,
      description: ctx.input.description,
      metadata: ctx.input.metadata
    });
    return {
      output: mapDestination(d),
      message: `Created event destination **${d.id}**.`
    };
  })
  .build();

export let deleteEventDestination = SlateTool.create(spec, {
  name: 'Delete Event Destination',
  key: 'delete_event_destination',
  description: `Delete an event destination. It must not be referenced by any event subscription.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      destinationId: z.string().describe('Event destination ID to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new NgrokClient(ctx.auth.token);
    await client.deleteEventDestination(ctx.input.destinationId);
    return {
      output: { success: true },
      message: `Deleted event destination **${ctx.input.destinationId}**.`
    };
  })
  .build();
