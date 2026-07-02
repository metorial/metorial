import { SlateTool } from 'slates';
import { z } from 'zod';
import { FivetranClient } from '../lib/client';
import { spec } from '../spec';

let connectionOutputSchema = z.object({
  connectionId: z.string().describe('Unique identifier of the connection'),
  groupId: z.string().describe('Group this connection belongs to'),
  service: z.string().describe('Connector service type'),
  schema: z.string().optional().describe('Schema name in the destination'),
  paused: z.boolean().optional().describe('Whether the connection is paused'),
  setupState: z.string().optional().describe('Setup state: incomplete, connected, or broken'),
  syncState: z
    .string()
    .optional()
    .describe('Sync state: scheduled, syncing, paused, or rescheduled'),
  syncFrequency: z.number().optional().describe('Sync frequency in minutes'),
  scheduleType: z.string().optional().describe('Schedule type: auto or manual'),
  dailySyncTime: z.string().optional().describe('Daily sync time if applicable'),
  succeededAt: z.string().optional().nullable().describe('Last successful sync timestamp'),
  failedAt: z.string().optional().nullable().describe('Last failed sync timestamp'),
  createdAt: z.string().optional().describe('Timestamp when the connection was created'),
  config: z.record(z.string(), z.any()).optional().describe('Service-specific configuration'),
  setupTests: z.array(z.record(z.string(), z.any())).optional().describe('Setup test results')
});

let mapConnection = (c: any) => ({
  connectionId: c.id,
  groupId: c.group_id,
  service: c.service,
  schema: c.schema,
  paused: c.paused,
  setupState: c.setup_state,
  syncState: c.sync_state,
  syncFrequency: c.sync_frequency,
  scheduleType: c.schedule_type,
  dailySyncTime: c.daily_sync_time,
  succeededAt: c.succeeded_at,
  failedAt: c.failed_at,
  createdAt: c.created_at,
  config: c.config,
  setupTests: c.setup_tests
});

export let getConnection = SlateTool.create(spec, {
  name: 'Get Connection',
  key: 'get_connection',
  description: `Retrieve full details of a specific connection (connector), including its configuration, status, and setup test results.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      connectionId: z.string().describe('ID of the connection to retrieve')
    })
  )
  .output(connectionOutputSchema)
  .handleInvocation(async ctx => {
    let client = new FivetranClient(ctx.auth.token);
    let c = await client.getConnection(ctx.input.connectionId);

    return {
      output: mapConnection(c),
      message: `Retrieved connection **${c.schema || c.id}** (service: ${c.service}, state: ${c.sync_state}).`
    };
  })
  .build();

export let createConnection = SlateTool.create(spec, {
  name: 'Create Connection',
  key: 'create_connection',
  description: `Create a new connection (connector) in a group. Specify the service type and service-specific configuration. Use the **List Connector Types** tool to discover available services and their config requirements.`,
  instructions: [
    'The "service" field must match a valid Fivetran connector type ID (e.g., "github", "salesforce", "google_sheets").',
    'The "config" object varies per service — use the connector metadata tool to discover required fields.'
  ]
})
  .input(
    z.object({
      groupId: z.string().describe('ID of the group to create the connection in'),
      service: z
        .string()
        .describe('Connector service type identifier (e.g., "github", "salesforce")'),
      config: z
        .record(z.string(), z.any())
        .optional()
        .describe('Service-specific configuration object'),
      paused: z
        .boolean()
        .optional()
        .describe('Whether to create the connection in a paused state'),
      syncFrequency: z
        .number()
        .optional()
        .describe('Sync frequency in minutes (e.g., 60, 360, 720, 1440)'),
      scheduleType: z.enum(['auto', 'manual']).optional().describe('Schedule type'),
      dailySyncTime: z
        .string()
        .optional()
        .describe('Daily sync time (HH:MM format, for daily schedule)'),
      trustCertificates: z
        .boolean()
        .optional()
        .describe('Whether to auto-approve TLS certificates'),
      trustFingerprints: z
        .boolean()
        .optional()
        .describe('Whether to auto-approve SSH fingerprints'),
      runSetupTests: z
        .boolean()
        .optional()
        .describe('Whether to run setup tests after creation')
    })
  )
  .output(connectionOutputSchema)
  .handleInvocation(async ctx => {
    let client = new FivetranClient(ctx.auth.token);

    let body: Record<string, any> = {
      group_id: ctx.input.groupId,
      service: ctx.input.service
    };
    if (ctx.input.config) body.config = ctx.input.config;
    if (ctx.input.paused !== undefined) body.paused = ctx.input.paused;
    if (ctx.input.syncFrequency !== undefined) body.sync_frequency = ctx.input.syncFrequency;
    if (ctx.input.scheduleType) body.schedule_type = ctx.input.scheduleType;
    if (ctx.input.dailySyncTime) body.daily_sync_time = ctx.input.dailySyncTime;
    if (ctx.input.trustCertificates !== undefined)
      body.trust_certificates = ctx.input.trustCertificates;
    if (ctx.input.trustFingerprints !== undefined)
      body.trust_fingerprints = ctx.input.trustFingerprints;
    if (ctx.input.runSetupTests !== undefined) body.run_setup_tests = ctx.input.runSetupTests;

    let c = await client.createConnection(body);

    return {
      output: mapConnection(c),
      message: `Created connection **${c.schema || c.id}** (service: ${c.service}) in group ${c.group_id}.`
    };
  })
  .build();

export let updateConnection = SlateTool.create(spec, {
  name: 'Update Connection',
  key: 'update_connection',
  description: `Update an existing connection's configuration, sync settings, or paused state. Only provided fields will be updated.`
})
  .input(
    z.object({
      connectionId: z.string().describe('ID of the connection to update'),
      config: z
        .record(z.string(), z.any())
        .optional()
        .describe('Updated service-specific configuration'),
      paused: z.boolean().optional().describe('Pause or resume the connection'),
      syncFrequency: z.number().optional().describe('New sync frequency in minutes'),
      scheduleType: z.enum(['auto', 'manual']).optional().describe('Schedule type'),
      dailySyncTime: z.string().optional().describe('Daily sync time (HH:MM format)'),
      trustCertificates: z
        .boolean()
        .optional()
        .describe('Whether to auto-approve TLS certificates'),
      trustFingerprints: z
        .boolean()
        .optional()
        .describe('Whether to auto-approve SSH fingerprints')
    })
  )
  .output(connectionOutputSchema)
  .handleInvocation(async ctx => {
    let client = new FivetranClient(ctx.auth.token);

    let body: Record<string, any> = {};
    if (ctx.input.config) body.config = ctx.input.config;
    if (ctx.input.paused !== undefined) body.paused = ctx.input.paused;
    if (ctx.input.syncFrequency !== undefined) body.sync_frequency = ctx.input.syncFrequency;
    if (ctx.input.scheduleType) body.schedule_type = ctx.input.scheduleType;
    if (ctx.input.dailySyncTime) body.daily_sync_time = ctx.input.dailySyncTime;
    if (ctx.input.trustCertificates !== undefined)
      body.trust_certificates = ctx.input.trustCertificates;
    if (ctx.input.trustFingerprints !== undefined)
      body.trust_fingerprints = ctx.input.trustFingerprints;

    let c = await client.updateConnection(ctx.input.connectionId, body);

    return {
      output: mapConnection(c),
      message: `Updated connection **${c.schema || c.id}**.`
    };
  })
  .build();

export let deleteConnection = SlateTool.create(spec, {
  name: 'Delete Connection',
  key: 'delete_connection',
  description: `Delete a connection (connector) and all its synced data. This action is irreversible.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      connectionId: z.string().describe('ID of the connection to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FivetranClient(ctx.auth.token);
    await client.deleteConnection(ctx.input.connectionId);

    return {
      output: { success: true },
      message: `Deleted connection ${ctx.input.connectionId}.`
    };
  })
  .build();
