import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let createDataset = SlateTool.create(spec, {
  name: 'Create Dataset',
  key: 'create_dataset',
  description: `Create a new dataset in BigML from a source, another dataset, or a list of datasets. Datasets are processed, structured representations of data with statistical summaries for each field.
Supports sampling, filtering, field selection, and train/test splitting.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      sourceId: z
        .string()
        .optional()
        .describe('Source resource ID to create the dataset from (e.g., "source/abc123")'),
      originDatasetId: z
        .string()
        .optional()
        .describe('Origin dataset ID for creating a derived dataset (e.g., "dataset/abc123")'),
      datasetIds: z
        .array(z.string())
        .optional()
        .describe('List of dataset IDs to merge into a multi-dataset'),
      name: z.string().optional().describe('Name for the dataset'),
      sampleRate: z
        .number()
        .optional()
        .describe('Sampling rate between 0 and 1 (e.g., 0.8 for 80%)'),
      seed: z
        .string()
        .optional()
        .describe(
          'Seed for deterministic sampling, useful for reproducible train/test splits'
        ),
      outOfBag: z
        .boolean()
        .optional()
        .describe(
          'If true with sampleRate, returns the complement sample (useful for test split)'
        ),
      inputFields: z
        .array(z.string())
        .optional()
        .describe('List of field IDs to include in the dataset'),
      excludedFields: z
        .array(z.string())
        .optional()
        .describe('List of field IDs to exclude from the dataset'),
      range: z
        .array(z.number())
        .optional()
        .describe('Row range [start, end] to include (1-indexed)'),
      tags: z.array(z.string()).optional().describe('Tags to assign to the dataset'),
      projectId: z.string().optional().describe('Project to associate the dataset with')
    })
  )
  .output(
    z.object({
      resourceId: z.string().describe('BigML resource ID for the created dataset'),
      name: z.string().optional().describe('Name of the dataset'),
      statusCode: z.number().describe('Status code of the dataset creation'),
      statusMessage: z.string().describe('Status message'),
      created: z.string().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let body: Record<string, any> = {};

    if (ctx.input.sourceId) {
      body.source = ctx.input.sourceId;
    } else if (ctx.input.originDatasetId) {
      body.origin_dataset = ctx.input.originDatasetId;
    } else if (ctx.input.datasetIds && ctx.input.datasetIds.length > 0) {
      body.origin_datasets = ctx.input.datasetIds;
    }

    if (ctx.input.name) body.name = ctx.input.name;
    if (ctx.input.sampleRate !== undefined) body.sample_rate = ctx.input.sampleRate;
    if (ctx.input.seed) body.seed = ctx.input.seed;
    if (ctx.input.outOfBag !== undefined) body.out_of_bag = ctx.input.outOfBag;
    if (ctx.input.inputFields) body.input_fields = ctx.input.inputFields;
    if (ctx.input.excludedFields) body.excluded_fields = ctx.input.excludedFields;
    if (ctx.input.range) body.range = ctx.input.range;
    if (ctx.input.tags) body.tags = ctx.input.tags;
    if (ctx.input.projectId) body.project = ctx.input.projectId;

    let result = await client.createResource('dataset', body);

    return {
      output: {
        resourceId: result.resource,
        name: result.name,
        statusCode: result.status?.code ?? result.code,
        statusMessage: result.status?.message ?? 'Created',
        created: result.created
      },
      message: `Dataset **${result.resource}** created${result.name ? ` as "${result.name}"` : ''}. Status: ${result.status?.message ?? 'pending'}.`
    };
  })
  .build();
