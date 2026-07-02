import { SlateTool } from 'slates';
import { z } from 'zod';
import { FivetranClient } from '../lib/client';
import { spec } from '../spec';

let transformationOutputSchema = z.object({
  transformationId: z.string().describe('Unique identifier of the transformation'),
  status: z.string().optional().describe('Current status of the transformation'),
  schedule: z.record(z.string(), z.any()).optional().describe('Schedule configuration'),
  config: z.record(z.string(), z.any()).optional().describe('Transformation configuration'),
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
  config: t.config,
  createdAt: t.created_at,
  outputModelName: t.output_model_name,
  connectionIds: t.connection_ids
});

export let listTransformations = SlateTool.create(spec, {
  name: 'List Transformations',
  key: 'list_transformations',
  description: `List all transformations in the Fivetran account. Transformations reshape synced data using dbt Core, dbt Cloud, or Coalesce.`,
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
  description: `Retrieve full details of a specific transformation including its configuration, schedule, and status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      transformationId: z.string().describe('ID of the transformation to retrieve')
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
      config: z
        .record(z.string(), z.any())
        .describe(
          'Transformation configuration (varies by type: dbt Core, dbt Cloud, Coalesce)'
        ),
      schedule: z
        .record(z.string(), z.any())
        .optional()
        .describe('Schedule configuration with schedule_type and related fields'),
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
      config: ctx.input.config
    };
    if (ctx.input.schedule) body.schedule = ctx.input.schedule;
    if (ctx.input.connectionIds) body.connection_ids = ctx.input.connectionIds;
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
      transformationId: z.string().describe('ID of the transformation to update'),
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
    if (ctx.input.config) body.config = ctx.input.config;
    if (ctx.input.schedule) body.schedule = ctx.input.schedule;
    if (ctx.input.connectionIds) body.connection_ids = ctx.input.connectionIds;
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
      transformationId: z.string().describe('ID of the transformation to delete')
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
      transformationId: z.string().describe('ID of the transformation to run')
    })
  )
  .output(
    z.object({
      message: z.string().describe('Status message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FivetranClient(ctx.auth.token);
    let result = await client.runTransformation(ctx.input.transformationId);

    return {
      output: { message: result?.message || 'Transformation run triggered.' },
      message: `Triggered run for transformation ${ctx.input.transformationId}.`
    };
  })
  .build();
