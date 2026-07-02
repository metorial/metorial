import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let createAnomalyDetector = SlateTool.create(spec, {
  name: 'Create Anomaly Detector',
  key: 'create_anomaly_detector',
  description: `Create an anomaly detector using isolation forest algorithms. Identifies unusual data points in a dataset by measuring how easily they can be isolated from the rest of the data.
After creation, use anomaly score predictions to evaluate how anomalous new data points are.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      datasetId: z.string().describe('Dataset resource ID (e.g., "dataset/abc123")'),
      name: z.string().optional().describe('Name for the anomaly detector'),
      inputFields: z
        .array(z.string())
        .optional()
        .describe('List of field IDs to use for anomaly detection'),
      topN: z
        .number()
        .optional()
        .describe('Number of top anomalies to include in the results'),
      forestSize: z.number().optional().describe('Number of trees in the isolation forest'),
      tags: z.array(z.string()).optional().describe('Tags to assign'),
      projectId: z.string().optional().describe('Project to associate with')
    })
  )
  .output(
    z.object({
      resourceId: z.string().describe('BigML resource ID for the anomaly detector'),
      name: z.string().optional().describe('Name of the anomaly detector'),
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
    if (ctx.input.inputFields) body.input_fields = ctx.input.inputFields;
    if (ctx.input.topN !== undefined) body.top_n = ctx.input.topN;
    if (ctx.input.forestSize !== undefined) body.forest_size = ctx.input.forestSize;
    if (ctx.input.tags) body.tags = ctx.input.tags;
    if (ctx.input.projectId) body.project = ctx.input.projectId;

    let result = await client.createResource('anomaly', body);

    return {
      output: {
        resourceId: result.resource,
        name: result.name,
        statusCode: result.status?.code ?? result.code,
        statusMessage: result.status?.message ?? 'Created',
        created: result.created
      },
      message: `Anomaly detector **${result.resource}** created${result.name ? ` as "${result.name}"` : ''}. Status: ${result.status?.message ?? 'pending'}.`
    };
  })
  .build();
