import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { syncSchema } from '../lib/schemas';
import { spec } from '../spec';

export let listSyncs = SlateTool.create(spec, {
  name: 'List Syncs',
  key: 'list_syncs',
  description: `List syncs in your Hightouch workspace. Syncs move data from models to destinations with configurable field mappings and scheduling. Supports filtering by model ID or slug and pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Max number of syncs to return (default 100)'),
      offset: z.number().optional().describe('Offset for pagination (default 0)'),
      orderBy: z
        .enum(['id', 'name', 'slug', 'createdAt', 'updatedAt'])
        .optional()
        .describe('Field to sort results by'),
      modelId: z.number().optional().describe('Filter syncs by model ID'),
      slug: z.string().optional().describe('Filter syncs by slug'),
      after: z.string().optional().describe('Filter syncs run after this ISO timestamp'),
      before: z.string().optional().describe('Filter syncs run before this ISO timestamp')
    })
  )
  .output(
    z.object({
      syncs: z.array(syncSchema).describe('List of syncs'),
      hasMore: z.boolean().describe('Whether more results are available'),
      nextOffset: z.number().optional().describe('Offset for the next page, when available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listSyncs(ctx.input);

    return {
      output: {
        syncs: result.data,
        hasMore: result.hasMore,
        nextOffset: result.nextOffset
      },
      message: `Found **${result.data.length}** sync(s).${result.hasMore ? ' More results available.' : ''}`
    };
  })
  .build();

export let getSync = SlateTool.create(spec, {
  name: 'Get Sync',
  key: 'get_sync',
  description: `Retrieve details of a specific sync by its ID, including schedule, status, and associated model and destination. Opaque configuration is omitted to protect credentials.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      syncId: z.number().describe('ID of the sync to retrieve')
    })
  )
  .output(syncSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let sync = await client.getSync(ctx.input.syncId);

    return {
      output: sync,
      message: `Retrieved sync **${sync.slug}** (status: ${sync.status}, model: ${sync.modelId} → destination: ${sync.destinationId}).`
    };
  })
  .build();

export let createSync = SlateTool.create(spec, {
  name: 'Create Sync',
  key: 'create_sync',
  description: `Create a new sync that moves data from a model to a destination. Configure field mappings, sync mode, and scheduling. Enabled scheduled syncs can query the source, incur charges and modify destination data; use disabled=true for setup without scheduled execution.`,
  instructions: [
    'The configuration field specifies how source columns map to destination fields. Its schema varies by destination type.',
    'Omitting schedule creates a manual schedule.',
    'Schedule types include "interval" (with quantity and unit), "cron" (with expression), "visual_cron", and "dbt_cloud".'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      slug: z.string().describe('URL-friendly slug for the sync'),
      destinationId: z.number().describe('ID of the destination to sync data to'),
      modelId: z.number().describe('ID of the model to sync data from'),
      configuration: z
        .record(z.string(), z.unknown())
        .describe('Sync configuration including field mappings (varies by destination type)'),
      disabled: z
        .boolean()
        .optional()
        .default(false)
        .describe('Whether the sync should be created in a disabled state'),
      schedule: z
        .object({
          type: z.string().describe('Schedule type (interval, cron, visual_cron, dbt_cloud)'),
          schedule: z
            .record(z.string(), z.unknown())
            .optional()
            .describe('Schedule configuration; omitted for match_booster')
        })
        .optional()
        .describe('Optional schedule configuration')
    })
  )
  .output(syncSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let sync = await client.createSync({
      ...ctx.input,
      disabled: ctx.input.disabled ?? false
    });

    return {
      output: sync,
      message: `Created sync **${sync.slug}** (ID: ${sync.syncId}, model: ${sync.modelId} → destination: ${sync.destinationId}).`
    };
  })
  .build();

export let updateSync = SlateTool.create(spec, {
  name: 'Update Sync',
  key: 'update_sync',
  description: `Update an existing sync's configuration, schedule, or enabled/disabled state.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      syncId: z.number().describe('ID of the sync to update'),
      clearSchedule: z
        .boolean()
        .optional()
        .describe(
          'Remove the schedule and use manual triggering. Cannot be combined with schedule.'
        ),
      configuration: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Updated sync configuration'),
      disabled: z.boolean().optional().describe('Enable or disable the sync'),
      schedule: z
        .object({
          type: z.string().describe('Schedule type'),
          schedule: z
            .record(z.string(), z.unknown())
            .optional()
            .describe('Schedule configuration; omitted for match_booster')
        })
        .optional()
        .describe('Updated schedule configuration')
    })
  )
  .output(syncSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { syncId, ...updateData } = ctx.input;
    let sync = await client.updateSync(syncId, updateData);

    return {
      output: sync,
      message: `Updated sync **${sync.slug}** (ID: ${syncId}).`
    };
  })
  .build();
