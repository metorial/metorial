import { SlateTool } from 'slates';
import { z } from 'zod';
import { FaradayClient } from '../lib/client';
import { spec } from '../spec';

let targetSchema = z.object({
  targetId: z.string().describe('Unique identifier of the target'),
  name: z.string().describe('Human-readable name of the target'),
  status: z
    .string()
    .optional()
    .describe('Current status: new, starting, running, ready, or error'),
  scopeId: z.string().optional().describe('UUID of the associated scope'),
  connectionId: z
    .string()
    .optional()
    .describe('UUID of the associated connection (for replication targets)'),
  representation: z
    .record(z.string(), z.any())
    .optional()
    .describe('Output format configuration'),
  options: z.record(z.string(), z.any()).optional().describe('Target type configuration'),
  createdAt: z.string().optional().describe('Timestamp when the target was created'),
  updatedAt: z.string().optional().describe('Timestamp when the target was last updated')
});

export let listTargets = SlateTool.create(spec, {
  name: 'List Targets',
  key: 'list_targets',
  description: `Retrieve all targets in your Faraday account. Targets define how and where predictions from a scope are delivered — via Lookup API, pipeline export, or CSV download.`,
  tags: { readOnly: true, destructive: false }
})
  .input(z.object({}))
  .output(
    z.object({
      targets: z.array(targetSchema).describe('List of all targets')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FaradayClient({ token: ctx.auth.token });
    let targets = await client.listTargets();

    let mapped = targets.map((t: any) => ({
      targetId: t.id,
      name: t.name,
      status: t.status,
      scopeId: t.scope_id,
      connectionId: t.connection_id,
      representation: t.representation,
      options: t.options,
      createdAt: t.created_at,
      updatedAt: t.updated_at
    }));

    return {
      output: { targets: mapped },
      message: `Found **${mapped.length}** target(s).`
    };
  })
  .build();

export let getTarget = SlateTool.create(spec, {
  name: 'Get Target',
  key: 'get_target',
  description: `Retrieve detailed information about a specific target, including its scope, connection, representation mode, and processing status.`,
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      targetId: z.string().describe('UUID of the target to retrieve')
    })
  )
  .output(targetSchema)
  .handleInvocation(async ctx => {
    let client = new FaradayClient({ token: ctx.auth.token });
    let t = await client.getTarget(ctx.input.targetId);

    return {
      output: {
        targetId: t.id,
        name: t.name,
        status: t.status,
        scopeId: t.scope_id,
        connectionId: t.connection_id,
        representation: t.representation,
        options: t.options,
        createdAt: t.created_at,
        updatedAt: t.updated_at
      },
      message: `Target **${t.name}** is **${t.status}**.`
    };
  })
  .build();

export let createTarget = SlateTool.create(spec, {
  name: 'Create Target',
  key: 'create_target',
  description: `Create a new target to configure how predictions are exported. Supports three types:
- **Lookup API**: Real-time API for retrieving predictions about individuals. Set options type to \`lookup_api\`.
- **Replication**: Export to external connections (databases, warehouses, etc.). Requires a connection ID.
- **Hosted CSV**: Faraday-hosted CSV download. Set options type to \`hosted_csv\`.`,
  instructions: [
    'For Lookup API targets, set options to { "type": "lookup_api" } and representation to { "mode": "identified", "aggregate": "person" }.',
    'For replication targets, you must provide a valid connectionId and matching options for the connection type.'
  ],
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({
      name: z.string().describe('Human-readable name for the target'),
      scopeId: z.string().describe('UUID of the scope providing prediction data'),
      representation: z
        .object({
          mode: z
            .enum(['hashed', 'referenced', 'identified', 'aggregated'])
            .describe('Output format mode'),
          aggregate: z
            .string()
            .optional()
            .describe('Aggregation level (e.g., "person", "residence")')
        })
        .describe('Output format configuration'),
      options: z
        .record(z.string(), z.any())
        .describe(
          'Target type configuration (must include "type" field, e.g., "lookup_api", "hosted_csv")'
        ),
      connectionId: z
        .string()
        .optional()
        .describe('UUID of the connection for replication targets'),
      filter: z
        .record(z.string(), z.any())
        .optional()
        .describe('Filter configuration to restrict exported rows'),
      limit: z
        .record(z.string(), z.any())
        .optional()
        .describe('Row count or percentile-based limit configuration'),
      humanReadable: z
        .boolean()
        .optional()
        .describe('Replace machine IDs with readable names in output')
    })
  )
  .output(targetSchema)
  .handleInvocation(async ctx => {
    let client = new FaradayClient({ token: ctx.auth.token });

    let body: Record<string, any> = {
      name: ctx.input.name,
      scope_id: ctx.input.scopeId,
      representation: ctx.input.representation,
      options: ctx.input.options
    };
    if (ctx.input.connectionId) body.connection_id = ctx.input.connectionId;
    if (ctx.input.filter) body.filter = ctx.input.filter;
    if (ctx.input.limit) body.limit = ctx.input.limit;
    if (ctx.input.humanReadable !== undefined) body.human_readable = ctx.input.humanReadable;

    let t = await client.createTarget(body);

    return {
      output: {
        targetId: t.id,
        name: t.name,
        status: t.status,
        scopeId: t.scope_id,
        connectionId: t.connection_id,
        representation: t.representation,
        options: t.options,
        createdAt: t.created_at,
        updatedAt: t.updated_at
      },
      message: `Created target **${t.name}** (${t.id}). Status: **${t.status}**.`
    };
  })
  .build();
