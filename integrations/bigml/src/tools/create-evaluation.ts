import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let createEvaluation = SlateTool.create(spec, {
  name: 'Create Evaluation',
  key: 'create_evaluation',
  description: `Evaluate a supervised model's performance by comparing its predictions against a test dataset. Returns metrics like accuracy, precision, recall, and F-measure for classification tasks, or MSE and R-squared for regression tasks.
Works with decision trees, ensembles, deepnets, logistic regressions, linear regressions, and time series models.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      modelId: z
        .string()
        .describe(
          'Resource ID of the model to evaluate (e.g., "model/abc123", "ensemble/abc123")'
        ),
      datasetId: z
        .string()
        .describe('Dataset resource ID containing test data (e.g., "dataset/abc123")'),
      name: z.string().optional().describe('Name for the evaluation'),
      tags: z.array(z.string()).optional().describe('Tags to assign'),
      projectId: z.string().optional().describe('Project to associate with')
    })
  )
  .output(
    z.object({
      resourceId: z.string().describe('BigML resource ID for the evaluation'),
      name: z.string().optional().describe('Name of the evaluation'),
      statusCode: z.number().describe('Status code'),
      statusMessage: z.string().describe('Status message'),
      created: z.string().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let modelId = ctx.input.modelId;
    let modelType = modelId.split('/')[0];

    let body: Record<string, any> = {
      dataset: ctx.input.datasetId
    };

    if (modelType === 'ensemble') {
      body.ensemble = modelId;
    } else if (modelType === 'deepnet') {
      body.deepnet = modelId;
    } else if (modelType === 'logisticregression') {
      body.logisticregression = modelId;
    } else if (modelType === 'linearregression') {
      body.linearregression = modelId;
    } else if (modelType === 'timeseries') {
      body.timeseries = modelId;
    } else if (modelType === 'fusion') {
      body.fusion = modelId;
    } else {
      body.model = modelId;
    }

    if (ctx.input.name) body.name = ctx.input.name;
    if (ctx.input.tags) body.tags = ctx.input.tags;
    if (ctx.input.projectId) body.project = ctx.input.projectId;

    let result = await client.createResource('evaluation', body);

    return {
      output: {
        resourceId: result.resource,
        name: result.name,
        statusCode: result.status?.code ?? result.code,
        statusMessage: result.status?.message ?? 'Created',
        created: result.created
      },
      message: `Evaluation **${result.resource}** created${result.name ? ` as "${result.name}"` : ''}. Status: ${result.status?.message ?? 'pending'}. Evaluation is asynchronous — retrieve the resource when finished to see metrics.`
    };
  })
  .build();
