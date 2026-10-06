import { SlateTool } from 'slates';
import { z } from 'zod';
import { FivetranClient } from '../lib/client';
import { transformationId } from '../lib/schemas';
import { spec } from '../spec';

let transformationOutputSchema = z.object({
  transformationId: transformationId,
  status: z.string().optional().describe('Current status of the transformation'),
  type: z.string().optional().describe('DBT_CORE or QUICKSTART'),
  paused: z.boolean().optional().describe('Whether execution is paused'),
  name: z.string().optional().describe('Transformation name'),
  projectId: z.string().optional().describe('dbt Core project identifier'),
  outputModelNames: z.array(z.string()).optional().describe('All output model names'),
  schedule: z.record(z.string(), z.any()).optional().describe('Schedule configuration'),
  config: z
    .record(z.string(), z.any())
    .optional()
    .describe('Stored configuration is omitted to protect commands and credential values'),
  createdAt: z.string().optional().describe('Timestamp when the transformation was created'),
  outputModelName: z.string().optional().describe('Name of the output model'),
  connectionIds: z
    .array(z.string())
    .optional()
    .describe('Connected connection IDs for integrated scheduling')
});

let mapTransformation = (t: any) => ({
  transformationId: t.id,
  status: t.status,
  schedule: t.schedule,
  createdAt: t.created_at,
  outputModelName: t.output_model_names?.[0],
  outputModelNames: t.output_model_names,
  type: t.type,
  paused: t.paused,
  name: t.transformation_config?.name,
  projectId: t.transformation_config?.project_id,
  connectionIds:
    t.type === 'QUICKSTART'
      ? t.transformation_config?.connection_ids
      : t.schedule.connection_ids
});

export let listTransformations = SlateTool.create(spec, {
  name: 'List Transformations',
  key: 'list_transformations',
  description: `List all transformations in the Fivetran account. Transformations reshape synced data using dbt Core or Quickstart packages.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      transformations: z.array(transformationOutputSchema).describe('List of transformations')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FivetranClient(ctx.auth.token);
    let items = await client.listTransformations();

    let transformations = items.map(mapTransformation);

    return {
      output: { transformations },
      message: `Found **${transformations.length}** transformation(s).`
    };
  })
  .build();

export let getTransformation = SlateTool.create(spec, {
  name: 'Get Transformation',
  key: 'get_transformation',
  description: `Read a transformation's safe metadata, dependencies, schedule and status. Commands and stored configuration values are omitted.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      transformationId: transformationId
    })
  )
  .output(transformationOutputSchema)
  .handleInvocation(async ctx => {
    let client = new FivetranClient(ctx.auth.token);
    let t = await client.getTransformation(ctx.input.transformationId);

    return {
      output: mapTransformation(t),
      message: `Retrieved transformation **${t.id}**.`
    };
  })
  .build();

export let createTransformation = SlateTool.create(spec, {
  name: 'Create Transformation',
  key: 'create_transformation',
  description: `Create a new transformation. Transformations can be scheduled to run after connection syncs (integrated), at custom intervals, or on a cron schedule.`,
  instructions: [
    'Schedule types: "integrated" (after sync), "interval" (custom interval), "cron" (cron expression), or "time_of_day".',
    'For integrated scheduling, provide connection IDs that trigger the transformation.'
  ]
})
  .input(
    z.object({
      type: z
        .enum(['DBT_CORE', 'QUICKSTART'])
        .optional()
        .describe('Transformation type; inferred from config when unambiguous'),
      config: z
        .record(z.string(), z.any())
        .describe(
          'Transformation configuration (dbt Core: project_id, name, steps; Quickstart: package_name and connection_ids)'
        ),
      schedule: z
        .record(z.string(), z.any())
        .optional()
        .describe(
          'Schedule configuration with schedule_type INTEGRATED, INTERVAL, CRON or TIME_OF_DAY and related fields'
        ),
      connectionIds: z
        .array(z.string())
        .optional()
        .describe('Connection IDs for integrated scheduling'),
      paused: z
        .boolean()
        .optional()
        .describe('Whether to create the transformation in a paused state')
    })
  )
  .output(transformationOutputSchema)
  .handleInvocation(async ctx => {
    let client = new FivetranClient(ctx.auth.token);

    let body: Record<string, any> = {
      config: ctx.input.config,
      type: ctx.input.type
    };
    if (ctx.input.schedule !== undefined) body.schedule = ctx.input.schedule;
    if (ctx.input.connectionIds !== undefined) body.connection_ids = ctx.input.connectionIds;
    if (ctx.input.paused !== undefined) body.paused = ctx.input.paused;

    let t = await client.createTransformation(body);

    return {
      output: mapTransformation(t),
      message: `Created transformation **${t.id}**.`
    };
  })
  .build();

export let updateTransformation = SlateTool.create(spec, {
  name: 'Update Transformation',
  key: 'update_transformation',
  description: `Update an existing transformation's configuration, schedule, or connected connections.`
})
  .input(
    z.object({
      transformationId: transformationId,
      config: z
        .record(z.string(), z.any())
        .optional()
        .describe('Updated transformation configuration'),
      schedule: z
        .record(z.string(), z.any())
        .optional()
        .describe('Updated schedule configuration'),
      connectionIds: z
        .array(z.string())
        .optional()
        .describe('Updated connection IDs for integrated scheduling'),
      paused: z.boolean().optional().describe('Pause or unpause the transformation')
    })
  )
  .output(transformationOutputSchema)
  .handleInvocation(async ctx => {
    let client = new FivetranClient(ctx.auth.token);

    let body: Record<string, any> = {};
    if (ctx.input.config !== undefined) body.config = ctx.input.config;
    if (ctx.input.schedule !== undefined) body.schedule = ctx.input.schedule;
    if (ctx.input.connectionIds !== undefined) body.connection_ids = ctx.input.connectionIds;
    if (ctx.input.paused !== undefined) body.paused = ctx.input.paused;

    let t = await client.updateTransformation(ctx.input.transformationId, body);

    return {
      output: mapTransformation(t),
      message: `Updated transformation **${t.id}**.`
    };
  })
  .build();

export let deleteTransformation = SlateTool.create(spec, {
  name: 'Delete Transformation',
  key: 'delete_transformation',
  description: `Delete a transformation. This stops all future runs and removes the configuration.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      transformationId: transformationId
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FivetranClient(ctx.auth.token);
    await client.deleteTransformation(ctx.input.transformationId);

    return {
      output: { success: true },
      message: `Deleted transformation ${ctx.input.transformationId}.`
    };
  })
  .build();

export let runTransformation = SlateTool.create(spec, {
  name: 'Run Transformation',
  key: 'run_transformation',
  description: `Manually trigger a transformation run. The transformation will execute immediately regardless of its schedule.`
})
  .input(
    z.object({
      transformationId: transformationId
    })
  )
  .output(
    z.object({
      message: z.string().describe('Status message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FivetranClient(ctx.auth.token);
    await client.runTransformation(ctx.input.transformationId);

    return {
      output: { message: 'Transformation run request accepted.' },
      message: `Triggered run for transformation ${ctx.input.transformationId}.`
    };
  })
  .build();
