import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listMetrics = SlateTool.create(spec, {
  name: 'List Metrics',
  key: 'list_metrics',
  description: `List all evaluation metrics defined for a project. Metrics are used to score and evaluate AI application outputs during experiments and production monitoring.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      project: z
        .string()
        .optional()
        .describe('Project name. Falls back to the configured default project.')
    })
  )
  .output(
    z.object({
      metrics: z
        .array(
          z.object({
            metricId: z.string().describe('Metric ID'),
            name: z.string().describe('Metric name'),
            type: z.string().optional().describe('Metric type (custom, model, human)'),
            description: z.string().optional().describe('Metric description'),
            returnType: z.string().optional().describe('Return type (boolean, float, string)'),
            enabledInProd: z.boolean().optional().describe('Whether enabled in production'),
            needsGroundTruth: z
              .boolean()
              .optional()
              .describe('Whether ground truth is required'),
            eventType: z.string().optional().describe('Event type this metric applies to')
          })
        )
        .describe('List of metrics')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      serverUrl: ctx.config.serverUrl
    });

    let project = ctx.input.project || ctx.config.project;
    if (!project) {
      throw new Error('Project name is required.');
    }

    let data = await client.listMetrics(project);
    let metrics = (Array.isArray(data) ? data : data.metrics || []).map((m: any) => ({
      metricId: m._id || m.id,
      name: m.name,
      type: m.type,
      description: m.description,
      returnType: m.return_type,
      enabledInProd: m.enabled_in_prod,
      needsGroundTruth: m.needs_ground_truth,
      eventType: m.event_type
    }));

    return {
      output: { metrics },
      message: `Found **${metrics.length}** metric(s).`
    };
  })
  .build();

export let createMetric = SlateTool.create(spec, {
  name: 'Create Metric',
  key: 'create_metric',
  description: `Create a new evaluation metric for a project. Metrics can be code-based (custom), LLM-as-a-judge (model), or human annotation (human). They define quality criteria for scoring AI outputs.`,
  instructions: [
    'For "custom" type, provide a "codeSnippet". For "model" type, provide a "prompt". For "human" type, configure the criteria.'
  ]
})
  .input(
    z.object({
      project: z
        .string()
        .optional()
        .describe('Project name. Falls back to the configured default project.'),
      name: z.string().describe('Name of the metric'),
      type: z.enum(['custom', 'model', 'human']).describe('Metric type'),
      description: z.string().describe('Description of what this metric measures'),
      returnType: z.enum(['boolean', 'float', 'string']).describe('Return value type'),
      criteria: z.string().optional().describe('Evaluation criteria description'),
      codeSnippet: z.string().optional().describe('Code snippet for custom metrics'),
      prompt: z.string().optional().describe('Prompt for LLM-as-a-judge metrics'),
      enabledInProd: z.boolean().optional().describe('Enable for production monitoring'),
      needsGroundTruth: z.boolean().optional().describe('Whether ground truth is needed'),
      threshold: z
        .object({
          min: z.number().optional().describe('Minimum threshold'),
          max: z.number().optional().describe('Maximum threshold')
        })
        .optional()
        .describe('Pass/fail threshold'),
      passWhen: z.boolean().optional().describe('Value for passing (for boolean return type)'),
      eventName: z.string().optional().describe('Specific event name to apply to'),
      eventType: z
        .enum(['model', 'tool', 'chain', 'session'])
        .optional()
        .describe('Event type to apply to')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the metric was created')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      serverUrl: ctx.config.serverUrl
    });

    let project = ctx.input.project || ctx.config.project;
    if (!project) {
      throw new Error('Project name is required.');
    }

    await client.createMetric({
      name: ctx.input.name,
      task: project,
      type: ctx.input.type,
      description: ctx.input.description,
      return_type: ctx.input.returnType,
      criteria: ctx.input.criteria,
      code_snippet: ctx.input.codeSnippet,
      prompt: ctx.input.prompt,
      enabled_in_prod: ctx.input.enabledInProd,
      needs_ground_truth: ctx.input.needsGroundTruth,
      threshold: ctx.input.threshold,
      pass_when: ctx.input.passWhen,
      event_name: ctx.input.eventName,
      event_type: ctx.input.eventType
    });

    return {
      output: { success: true },
      message: `Created metric **${ctx.input.name}**.`
    };
  })
  .build();

export let updateMetric = SlateTool.create(spec, {
  name: 'Update Metric',
  key: 'update_metric',
  description: `Update an existing metric's definition, criteria, or settings.`
})
  .input(
    z.object({
      metricId: z.string().describe('ID of the metric to update'),
      name: z.string().optional().describe('Updated name'),
      description: z.string().optional().describe('Updated description'),
      type: z.enum(['custom', 'model', 'human']).optional().describe('Updated type'),
      returnType: z
        .enum(['boolean', 'float', 'string'])
        .optional()
        .describe('Updated return type'),
      criteria: z.string().optional().describe('Updated criteria'),
      codeSnippet: z.string().optional().describe('Updated code snippet'),
      prompt: z.string().optional().describe('Updated prompt'),
      enabledInProd: z.boolean().optional().describe('Enable/disable for production'),
      needsGroundTruth: z.boolean().optional().describe('Whether ground truth is needed'),
      threshold: z
        .object({
          min: z.number().optional(),
          max: z.number().optional()
        })
        .optional()
        .describe('Updated threshold'),
      passWhen: z.boolean().optional().describe('Updated pass condition'),
      eventName: z.string().optional().describe('Updated event name'),
      eventType: z
        .enum(['model', 'tool', 'chain', 'session'])
        .optional()
        .describe('Updated event type')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the update was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      serverUrl: ctx.config.serverUrl
    });

    await client.updateMetric({
      metric_id: ctx.input.metricId,
      name: ctx.input.name,
      description: ctx.input.description,
      type: ctx.input.type,
      return_type: ctx.input.returnType,
      criteria: ctx.input.criteria,
      code_snippet: ctx.input.codeSnippet,
      prompt: ctx.input.prompt,
      enabled_in_prod: ctx.input.enabledInProd,
      needs_ground_truth: ctx.input.needsGroundTruth,
      threshold: ctx.input.threshold,
      pass_when: ctx.input.passWhen,
      event_name: ctx.input.eventName,
      event_type: ctx.input.eventType
    });

    return {
      output: { success: true },
      message: `Updated metric \`${ctx.input.metricId}\`.`
    };
  })
  .build();

export let deleteMetric = SlateTool.create(spec, {
  name: 'Delete Metric',
  key: 'delete_metric',
  description: `Delete an evaluation metric by its ID.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      metricId: z.string().describe('ID of the metric to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      serverUrl: ctx.config.serverUrl
    });

    await client.deleteMetric(ctx.input.metricId);

    return {
      output: { success: true },
      message: `Deleted metric \`${ctx.input.metricId}\`.`
    };
  })
  .build();
