import { SlateTool } from 'slates';
import { z } from 'zod';
import { FivetranClient } from '../lib/client';
import { destinationId, groupId } from '../lib/schemas';
import { spec } from '../spec';

let destinationOutputSchema = z.object({
  destinationId: destinationId,
  groupId: groupId,
  service: z.string().describe('Destination service type (e.g., "snowflake", "big_query")'),
  region: z.string().optional().describe('Data processing region'),
  networkingMethod: z.string().optional().describe('Networking method for connectivity'),
  setupStatus: z.string().optional().describe('Setup status of the destination'),
  timeZoneOffset: z.string().optional().describe('Time zone offset'),
  daylightSavingTimeEnabled: z.boolean().optional().describe('Whether DST is enabled'),
  config: z
    .record(z.string(), z.any())
    .optional()
    .describe('Stored configuration is omitted to protect destination credentials'),
  setupTests: z
    .array(z.record(z.string(), z.any()))
    .optional()
    .describe('Setup test statuses; diagnostic messages and details are omitted')
});

let mapDestination = (d: any) => ({
  destinationId: d.id,
  groupId: d.group_id,
  service: d.service,
  region: d.region,
  networkingMethod: d.networking_method,
  setupStatus: d.setup_status,
  timeZoneOffset: d.time_zone_offset,
  daylightSavingTimeEnabled: d.daylight_saving_time_enabled,
  setupTests: d.setup_tests
});

export let listDestinations = SlateTool.create(spec, {
  name: 'List Destinations',
  key: 'list_destinations',
  description: `List all destinations in the Fivetran account. Each destination is a data warehouse or storage service that receives synced data from connections.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      destinations: z.array(destinationOutputSchema).describe('List of destinations')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FivetranClient(ctx.auth.token);
    let items = await client.listDestinations();

    let destinations = items.map(mapDestination);

    return {
      output: { destinations },
      message: `Found **${destinations.length}** destination(s).`
    };
  })
  .build();

export let getDestination = SlateTool.create(spec, {
  name: 'Get Destination',
  key: 'get_destination',
  description: `Retrieve full details of a specific destination, including its status and safe setup-test results. Stored destination credentials are omitted.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      destinationId: destinationId
    })
  )
  .output(destinationOutputSchema)
  .handleInvocation(async ctx => {
    let client = new FivetranClient(ctx.auth.token);
    let d = await client.getDestination(ctx.input.destinationId);

    return {
      output: mapDestination(d),
      message: `Retrieved destination **${d.id}** (service: ${d.service}).`
    };
  })
  .build();

export let createDestination = SlateTool.create(spec, {
  name: 'Create Destination',
  key: 'create_destination',
  description: `Create a new destination within a group. Groups and destinations are mapped 1:1. Specify the service type and service-specific configuration.`,
  instructions: [
    'Each group can only have one destination.',
    'The config object varies per destination service (e.g., Snowflake, BigQuery, Redshift).'
  ]
})
  .input(
    z.object({
      groupId: groupId,
      service: z
        .string()
        .describe('Destination service type (e.g., "snowflake", "big_query", "redshift")'),
      region: z
        .string()
        .optional()
        .describe('Data processing region (e.g., "GCP_US_EAST4", "AWS_US_EAST_1")'),
      timeZoneOffset: z
        .string()
        .optional()
        .describe('Time zone offset required for creation (e.g., "0", "-5")'),
      daylightSavingTimeEnabled: z
        .boolean()
        .optional()
        .describe('Enable daylight saving time adjustment'),
      config: z
        .record(z.string(), z.any())
        .optional()
        .describe('Service-specific destination configuration'),
      trustCertificates: z.boolean().optional().describe('Auto-approve TLS certificates'),
      trustFingerprints: z.boolean().optional().describe('Auto-approve SSH fingerprints'),
      runSetupTests: z.boolean().optional().describe('Run setup tests after creation')
    })
  )
  .output(destinationOutputSchema)
  .handleInvocation(async ctx => {
    let client = new FivetranClient(ctx.auth.token);

    let body: Record<string, any> = {
      group_id: ctx.input.groupId,
      service: ctx.input.service
    };
    if (ctx.input.region !== undefined) body.region = ctx.input.region;
    if (ctx.input.timeZoneOffset !== undefined)
      body.time_zone_offset = ctx.input.timeZoneOffset;
    if (ctx.input.daylightSavingTimeEnabled !== undefined)
      body.daylight_saving_time_enabled = ctx.input.daylightSavingTimeEnabled;
    if (ctx.input.config !== undefined) body.config = ctx.input.config;
    if (ctx.input.trustCertificates !== undefined)
      body.trust_certificates = ctx.input.trustCertificates;
    if (ctx.input.trustFingerprints !== undefined)
      body.trust_fingerprints = ctx.input.trustFingerprints;
    if (ctx.input.runSetupTests !== undefined) body.run_setup_tests = ctx.input.runSetupTests;

    let d = await client.createDestination(body);

    return {
      output: mapDestination(d),
      message: `Created destination **${d.id}** (service: ${d.service}) in group ${d.group_id}.`
    };
  })
  .build();

export let updateDestination = SlateTool.create(spec, {
  name: 'Update Destination',
  key: 'update_destination',
  description: `Update an existing destination's configuration. Only provided fields will be updated.`
})
  .input(
    z.object({
      destinationId: destinationId,
      region: z.string().optional().describe('Data processing region'),
      timeZoneOffset: z.string().optional().describe('Time zone offset'),
      daylightSavingTimeEnabled: z
        .boolean()
        .optional()
        .describe('Enable daylight saving time adjustment'),
      config: z
        .record(z.string(), z.any())
        .optional()
        .describe('Updated service-specific configuration'),
      trustCertificates: z.boolean().optional().describe('Auto-approve TLS certificates'),
      trustFingerprints: z.boolean().optional().describe('Auto-approve SSH fingerprints')
    })
  )
  .output(destinationOutputSchema)
  .handleInvocation(async ctx => {
    let client = new FivetranClient(ctx.auth.token);

    let body: Record<string, any> = {};
    if (ctx.input.region !== undefined) body.region = ctx.input.region;
    if (ctx.input.timeZoneOffset !== undefined)
      body.time_zone_offset = ctx.input.timeZoneOffset;
    if (ctx.input.daylightSavingTimeEnabled !== undefined)
      body.daylight_saving_time_enabled = ctx.input.daylightSavingTimeEnabled;
    if (ctx.input.config !== undefined) body.config = ctx.input.config;
    if (ctx.input.trustCertificates !== undefined)
      body.trust_certificates = ctx.input.trustCertificates;
    if (ctx.input.trustFingerprints !== undefined)
      body.trust_fingerprints = ctx.input.trustFingerprints;

    let d = await client.updateDestination(ctx.input.destinationId, body);

    return {
      output: mapDestination(d),
      message: `Updated destination **${d.id}**.`
    };
  })
  .build();

export let deleteDestination = SlateTool.create(spec, {
  name: 'Delete Destination',
  key: 'delete_destination',
  description: `Delete a destination. This action is irreversible.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      destinationId: destinationId
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FivetranClient(ctx.auth.token);
    await client.deleteDestination(ctx.input.destinationId);

    return {
      output: { success: true },
      message: `Deleted destination ${ctx.input.destinationId}.`
    };
  })
  .build();
