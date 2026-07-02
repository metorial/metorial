import { SlateTool } from 'slates';
import { z } from 'zod';
import { ExperimentationClient } from '../lib/client';
import { spec } from '../spec';

let variationSchema = z
  .object({
    name: z.string().describe('Name of the variation'),
    weight: z.number().optional().describe('Traffic allocation weight (0-10000)')
  })
  .describe('Experiment variation');

let metricSchema = z
  .object({
    aggregator: z.string().optional().describe('Aggregation method (e.g., "unique", "sum")'),
    eventId: z.number().optional().describe('Event ID to track'),
    scope: z.string().optional().describe('Metric scope (e.g., "visitor", "session")')
  })
  .describe('Experiment metric');

export let manageExperiment = SlateTool.create(spec, {
  name: 'Manage Experiment',
  key: 'manage_experiment',
  description: `Create, update, retrieve, or delete A/B test experiments in Optimizely Web or Feature Experimentation.
Use this to set up new experiments with variations and metrics, modify existing experiments, or retrieve experiment configuration and results.`,
  instructions: [
    'Set action to "create" to create a new experiment, "update" to modify, "get" to retrieve, "delete" to remove, "list" to list experiments, or "results" to get experiment results.',
    'A projectId is required for creating and listing experiments.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'update', 'get', 'delete', 'list', 'results'])
        .describe('Action to perform'),
      projectId: z.number().optional().describe('Project ID (required for create and list)'),
      experimentId: z
        .number()
        .optional()
        .describe('Experiment ID (required for get, update, delete, results)'),
      name: z.string().optional().describe('Experiment name (for create/update)'),
      description: z
        .string()
        .optional()
        .describe('Experiment description (for create/update)'),
      type: z.string().optional().describe('Experiment type, e.g. "a/b" (for create)'),
      holdback: z
        .number()
        .optional()
        .describe('Holdback percentage 0-10000 (for create/update)'),
      status: z.string().optional().describe('Filter by status (for list)'),
      variations: z
        .array(variationSchema)
        .optional()
        .describe('Variations for the experiment (for create/update)'),
      metrics: z
        .array(metricSchema)
        .optional()
        .describe('Metrics to track (for create/update)'),
      audienceConditions: z
        .string()
        .optional()
        .describe('Audience conditions JSON string (for create/update)'),
      startTime: z.string().optional().describe('Start time for results filter (ISO 8601)'),
      endTime: z.string().optional().describe('End time for results filter (ISO 8601)'),
      page: z.number().optional().describe('Page number (for list)'),
      perPage: z.number().optional().describe('Items per page (for list)')
    })
  )
  .output(
    z.object({
      experiment: z.any().optional().describe('Experiment data'),
      experiments: z.array(z.any()).optional().describe('List of experiments'),
      results: z.any().optional().describe('Experiment results data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ExperimentationClient(ctx.auth.token);

    switch (ctx.input.action) {
      case 'list': {
        if (!ctx.input.projectId)
          throw new Error('projectId is required for listing experiments');
        let experiments = await client.listExperiments(ctx.input.projectId, {
          page: ctx.input.page,
          per_page: ctx.input.perPage,
          status: ctx.input.status
        });
        return {
          output: { experiments },
          message: `Listed ${Array.isArray(experiments) ? experiments.length : 0} experiments in project ${ctx.input.projectId}.`
        };
      }
      case 'get': {
        if (!ctx.input.experimentId) throw new Error('experimentId is required');
        let experiment = await client.getExperiment(ctx.input.experimentId);
        return {
          output: { experiment },
          message: `Retrieved experiment **${experiment.name || ctx.input.experimentId}**.`
        };
      }
      case 'create': {
        if (!ctx.input.projectId)
          throw new Error('projectId is required for creating experiments');
        if (!ctx.input.name) throw new Error('name is required for creating experiments');
        let experiment = await client.createExperiment({
          project_id: ctx.input.projectId,
          name: ctx.input.name,
          description: ctx.input.description,
          type: ctx.input.type,
          holdback: ctx.input.holdback,
          variations: ctx.input.variations?.map(v => ({ name: v.name, weight: v.weight })),
          metrics: ctx.input.metrics?.map(m => ({
            aggregator: m.aggregator,
            event_id: m.eventId,
            scope: m.scope
          })),
          audience_conditions: ctx.input.audienceConditions
        });
        return {
          output: { experiment },
          message: `Created experiment **${experiment.name}** (ID: ${experiment.id}).`
        };
      }
      case 'update': {
        if (!ctx.input.experimentId) throw new Error('experimentId is required');
        let updateData: Record<string, any> = {};
        if (ctx.input.name !== undefined) updateData.name = ctx.input.name;
        if (ctx.input.description !== undefined)
          updateData.description = ctx.input.description;
        if (ctx.input.holdback !== undefined) updateData.holdback = ctx.input.holdback;
        if (ctx.input.variations !== undefined)
          updateData.variations = ctx.input.variations.map(v => ({
            name: v.name,
            weight: v.weight
          }));
        if (ctx.input.metrics !== undefined)
          updateData.metrics = ctx.input.metrics.map(m => ({
            aggregator: m.aggregator,
            event_id: m.eventId,
            scope: m.scope
          }));
        if (ctx.input.audienceConditions !== undefined)
          updateData.audience_conditions = ctx.input.audienceConditions;
        let experiment = await client.updateExperiment(ctx.input.experimentId, updateData);
        return {
          output: { experiment },
          message: `Updated experiment **${experiment.name}** (ID: ${experiment.id}).`
        };
      }
      case 'delete': {
        if (!ctx.input.experimentId) throw new Error('experimentId is required');
        await client.deleteExperiment(ctx.input.experimentId);
        return {
          output: {},
          message: `Deleted experiment ${ctx.input.experimentId}.`
        };
      }
      case 'results': {
        if (!ctx.input.experimentId) throw new Error('experimentId is required');
        let results = await client.getExperimentResults(ctx.input.experimentId, {
          start_time: ctx.input.startTime,
          end_time: ctx.input.endTime
        });
        return {
          output: { results },
          message: `Retrieved results for experiment ${ctx.input.experimentId}.`
        };
      }
    }
  })
  .build();
