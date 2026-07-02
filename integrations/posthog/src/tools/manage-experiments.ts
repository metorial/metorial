import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let experimentOutput = z.object({
  experimentId: z.string().describe('Experiment ID'),
  name: z.string().describe('Experiment name'),
  description: z.string().optional().describe('Experiment description'),
  featureFlagKey: z.string().optional().describe('Associated feature flag key'),
  startDate: z.string().optional().describe('Start date'),
  endDate: z.string().optional().describe('End date'),
  archived: z.boolean().optional().describe('Whether the experiment is archived'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp')
});

export let listExperimentsTool = SlateTool.create(spec, {
  name: 'List Experiments',
  key: 'list_experiments',
  description: `List A/B test experiments in the project. Returns experiment metadata, status, and associated feature flag keys.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Maximum number of results'),
      offset: z.number().optional().describe('Pagination offset')
    })
  )
  .output(
    z.object({
      experiments: z.array(experimentOutput),
      hasMore: z.boolean().describe('Whether there are more results')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let data = await client.listExperiments({
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let experiments = (data.results || []).map((e: any) => ({
      experimentId: String(e.id),
      name: e.name,
      description: e.description,
      featureFlagKey: e.feature_flag_key || e.feature_flag?.key,
      startDate: e.start_date,
      endDate: e.end_date,
      archived: e.archived,
      createdAt: e.created_at,
      updatedAt: e.updated_at
    }));

    return {
      output: { experiments, hasMore: !!data.next },
      message: `Found **${experiments.length}** experiment(s).`
    };
  })
  .build();

export let getExperimentTool = SlateTool.create(spec, {
  name: 'Get Experiment',
  key: 'get_experiment',
  description: `Retrieve detailed information about a specific A/B test experiment including its configuration, metrics, and results.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      experimentId: z.string().describe('Experiment ID')
    })
  )
  .output(experimentOutput)
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let e = await client.getExperiment(ctx.input.experimentId);

    return {
      output: {
        experimentId: String(e.id),
        name: e.name,
        description: e.description,
        featureFlagKey: e.feature_flag_key || e.feature_flag?.key,
        startDate: e.start_date,
        endDate: e.end_date,
        archived: e.archived,
        createdAt: e.created_at,
        updatedAt: e.updated_at
      },
      message: `Retrieved experiment **${e.name}**.`
    };
  })
  .build();

export let createExperimentTool = SlateTool.create(spec, {
  name: 'Create Experiment',
  key: 'create_experiment',
  description: `Create a new A/B test experiment. Experiments run on top of feature flags. The feature flag must be implemented in your code first.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      name: z.string().describe('Experiment name'),
      description: z.string().optional().describe('Experiment description'),
      featureFlagKey: z.string().optional().describe('Feature flag key for the experiment'),
      startDate: z.string().optional().describe('ISO 8601 start date'),
      endDate: z.string().optional().describe('ISO 8601 end date'),
      parameters: z
        .record(z.string(), z.any())
        .optional()
        .describe('Additional experiment parameters (metrics, holdout groups, etc.)')
    })
  )
  .output(experimentOutput)
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let payload: Record<string, any> = { name: ctx.input.name };
    if (ctx.input.description !== undefined) payload.description = ctx.input.description;
    if (ctx.input.featureFlagKey !== undefined)
      payload.feature_flag_key = ctx.input.featureFlagKey;
    if (ctx.input.startDate !== undefined) payload.start_date = ctx.input.startDate;
    if (ctx.input.endDate !== undefined) payload.end_date = ctx.input.endDate;
    if (ctx.input.parameters) Object.assign(payload, ctx.input.parameters);

    let e = await client.createExperiment(payload);

    return {
      output: {
        experimentId: String(e.id),
        name: e.name,
        description: e.description,
        featureFlagKey: e.feature_flag_key || e.feature_flag?.key,
        startDate: e.start_date,
        endDate: e.end_date,
        archived: e.archived,
        createdAt: e.created_at,
        updatedAt: e.updated_at
      },
      message: `Created experiment **${e.name}** (ID: ${e.id}).`
    };
  })
  .build();

export let updateExperimentTool = SlateTool.create(spec, {
  name: 'Update Experiment',
  key: 'update_experiment',
  description: `Update an existing A/B test experiment's name, description, dates, or configuration. Only provided fields will be updated.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      experimentId: z.string().describe('Experiment ID to update'),
      name: z.string().optional().describe('New experiment name'),
      description: z.string().optional().describe('New description'),
      endDate: z.string().optional().describe('New ISO 8601 end date'),
      archived: z.boolean().optional().describe('Archive or unarchive the experiment')
    })
  )
  .output(experimentOutput)
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let payload: Record<string, any> = {};
    if (ctx.input.name !== undefined) payload.name = ctx.input.name;
    if (ctx.input.description !== undefined) payload.description = ctx.input.description;
    if (ctx.input.endDate !== undefined) payload.end_date = ctx.input.endDate;
    if (ctx.input.archived !== undefined) payload.archived = ctx.input.archived;

    let e = await client.updateExperiment(ctx.input.experimentId, payload);

    return {
      output: {
        experimentId: String(e.id),
        name: e.name,
        description: e.description,
        featureFlagKey: e.feature_flag_key || e.feature_flag?.key,
        startDate: e.start_date,
        endDate: e.end_date,
        archived: e.archived,
        createdAt: e.created_at,
        updatedAt: e.updated_at
      },
      message: `Updated experiment **${e.name}**.`
    };
  })
  .build();
