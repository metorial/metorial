import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let createBatchPrediction = SlateTool.create(spec, {
  name: 'Create Batch Prediction',
  key: 'create_batch_prediction',
  description: `Create a batch prediction to generate predictions for an entire dataset at once. More efficient than individual predictions when processing large volumes of data.
The batch prediction runs asynchronously; check its status to know when results are ready.`,
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
          'Resource ID of the model (e.g., "model/abc123", "ensemble/abc123", "deepnet/abc123")'
        ),
      datasetId: z
        .string()
        .describe('Dataset resource ID containing test data (e.g., "dataset/abc123")'),
      name: z.string().optional().describe('Name for the batch prediction'),
      allFields: z.boolean().optional().describe('Include all input fields in the output'),
      includeHeader: z.boolean().optional().describe('Include header row in output'),
      includeConfidence: z
        .boolean()
        .optional()
        .describe('Include confidence scores in output'),
      outputFields: z
        .array(z.string())
        .optional()
        .describe('List of field IDs to include in the output'),
      tags: z.array(z.string()).optional().describe('Tags to assign to the batch prediction'),
      projectId: z.string().optional().describe('Project to associate with')
    })
  )
  .output(
    z.object({
      resourceId: z.string().describe('BigML resource ID for the batch prediction'),
      name: z.string().optional().describe('Name of the batch prediction'),
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
    } else if (modelType === 'fusion') {
      body.fusion = modelId;
    } else {
      body.model = modelId;
    }

    if (ctx.input.name) body.name = ctx.input.name;
    if (ctx.input.allFields !== undefined) body.all_fields = ctx.input.allFields;
    if (ctx.input.includeHeader !== undefined) body.header = ctx.input.includeHeader;
    if (ctx.input.includeConfidence !== undefined)
      body.confidence = ctx.input.includeConfidence;
    if (ctx.input.outputFields) body.output_fields = ctx.input.outputFields;
    if (ctx.input.tags) body.tags = ctx.input.tags;
    if (ctx.input.projectId) body.project = ctx.input.projectId;

    let result = await client.createResource('batchprediction', body);

    return {
      output: {
        resourceId: result.resource,
        name: result.name,
        statusCode: result.status?.code ?? result.code,
        statusMessage: result.status?.message ?? 'Created',
        created: result.created
      },
      message: `Batch prediction **${result.resource}** created${result.name ? ` as "${result.name}"` : ''}. Status: ${result.status?.message ?? 'pending'}. Processing is asynchronous — check status with the Get Resource tool.`
    };
  })
  .build();
