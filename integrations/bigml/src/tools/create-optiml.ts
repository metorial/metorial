import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let createOptiml = SlateTool.create(spec, {
  name: 'Create OptiML',
  key: 'create_optiml',
  description: `Create an OptiML for automated model selection and hyperparameter optimization. BigML will automatically create and evaluate hundreds of models with different algorithms and configurations to find the best performing model for your dataset.
Supports classification and regression tasks.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      datasetId: z.string().describe('Dataset resource ID (e.g., "dataset/abc123")'),
      name: z.string().optional().describe('Name for the OptiML'),
      metric: z
        .string()
        .optional()
        .describe(
          'Optimization metric (e.g., "accuracy", "f_measure", "precision", "recall", "r_squared")'
        ),
      maxTrainingTime: z.number().optional().describe('Maximum training time in seconds'),
      tags: z.array(z.string()).optional().describe('Tags to assign'),
      projectId: z.string().optional().describe('Project to associate with')
    })
  )
  .output(
    z.object({
      resourceId: z.string().describe('BigML resource ID for the OptiML'),
      name: z.string().optional().describe('Name of the OptiML'),
      statusCode: z.number().describe('Status code'),
      statusMessage: z.string().describe('Status message'),
      created: z.string().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let body: Record<string, any> = {
      dataset: ctx.input.datasetId
    };

    if (ctx.input.name) body.name = ctx.input.name;
    if (ctx.input.metric) body.metric = ctx.input.metric;
    if (ctx.input.maxTrainingTime !== undefined)
      body.max_training_time = ctx.input.maxTrainingTime;
    if (ctx.input.tags) body.tags = ctx.input.tags;
    if (ctx.input.projectId) body.project = ctx.input.projectId;

    let result = await client.createResource('optiml', body);

    return {
      output: {
        resourceId: result.resource,
        name: result.name,
        statusCode: result.status?.code ?? result.code,
        statusMessage: result.status?.message ?? 'Created',
        created: result.created
      },
      message: `OptiML **${result.resource}** created${result.name ? ` as "${result.name}"` : ''}. Status: ${result.status?.message ?? 'pending'}. OptiML runs asynchronously and may take significant time as it evaluates many model configurations.`
    };
  })
  .build();
