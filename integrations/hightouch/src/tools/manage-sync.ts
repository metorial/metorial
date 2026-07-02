import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let scheduleSchema = z
  .object({
    type: z.string().describe('Schedule type (e.g. interval, cron, visual_cron, dbt_cloud)'),
    schedule: z.record(z.string(), z.any()).describe('Schedule configuration (varies by type)')
  })
  .optional()
  .nullable();

let syncSchema = z.object({
  syncId: z.number().describe('Unique ID of the sync'),
  slug: z.string().describe('URL-friendly slug for the sync'),
  destinationId: z.number().describe('ID of the destination'),
  modelId: z.number().describe('ID of the model'),
  configuration: z
    .record(z.string(), z.any())
    .describe('Sync configuration including field mappings'),
  disabled: z.boolean().describe('Whether the sync is disabled'),
  status: z.string().describe('Current sync status'),
  primaryKey: z.string().describe('Primary key used for identifying source data'),
  referencedColumns: z.array(z.string()).describe('Source columns the sync depends on'),
  schedule: scheduleSchema.describe('Sync schedule configuration'),
  lastRunAt: z.string().nullable().optional().describe('ISO timestamp of the last sync run'),
  workspaceId: z.number().describe('ID of the workspace'),
  createdAt: z.string().describe('ISO timestamp when the sync was created'),
  updatedAt: z.string().describe('ISO timestamp when the sync was last updated')
});

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
      hasMore: z.boolean().describe('Whether more results are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listSyncs(ctx.input);

    return {
      output: {
        syncs: result.data,
        hasMore: result.hasMore
      },
      message: `Found **${result.data.length}** sync(s).${result.hasMore ? ' More results available.' : ''}`
    };
  })
  .build();

export let getSync = SlateTool.create(spec, {
  name: 'Get Sync',
  key: 'get_sync',
  description: `Retrieve details of a specific sync by its ID, including field mappings, schedule, status, and associated model and destination.`,
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
  description: `Create a new sync that moves data from a model to a destination. Configure field mappings, sync mode (upsert, insert, update, mirror), and scheduling.`,
  instructions: [
    'The configuration field specifies how source columns map to destination fields. Its schema varies by destination type.',
    'Schedule types include "interval" (with quantity and unit), "cron" (with expression), "visual_cron", and "dbt_cloud".'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      slug: z.string().describe('URL-friendly slug for the sync'),
      destinationId: z.number().describe('ID of the destination to sync data to'),
      modelId: z.number().describe('ID of the model to sync data from'),
      configuration: z
        .record(z.string(), z.any())
        .describe('Sync configuration including field mappings (varies by destination type)'),
      disabled: z
        .boolean()
        .optional()
        .default(false)
        .describe('Whether the sync should be created in a disabled state'),
      schedule: z
        .object({
          type: z.string().describe('Schedule type (interval, cron, visual_cron, dbt_cloud)'),
          schedule: z.record(z.string(), z.any()).describe('Schedule configuration')
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
    destructive: false
  }
})
  .input(
    z.object({
      syncId: z.number().describe('ID of the sync to update'),
      configuration: z
        .record(z.string(), z.any())
        .optional()
        .describe('Updated sync configuration'),
      disabled: z.boolean().optional().describe('Enable or disable the sync'),
      schedule: z
        .object({
          type: z.string().describe('Schedule type'),
          schedule: z.record(z.string(), z.any()).describe('Schedule configuration')
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
