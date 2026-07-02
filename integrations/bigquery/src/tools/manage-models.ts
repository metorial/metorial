import { SlateTool } from 'slates';
import { z } from 'zod';
import { BigQueryClient } from '../lib/client';
import { bigQueryServiceError } from '../lib/errors';
import { spec } from '../spec';

let modelSummarySchema = z.object({
  modelId: z.string(),
  datasetId: z.string(),
  projectId: z.string(),
  modelType: z.string().optional(),
  location: z.string().optional(),
  friendlyName: z.string().optional(),
  description: z.string().optional(),
  creationTime: z.string().optional(),
  lastModifiedTime: z.string().optional(),
  expirationTime: z.string().optional(),
  labels: z.record(z.string(), z.string()).optional()
});

let modelDetailsSchema = modelSummarySchema.extend({
  etag: z.string().optional(),
  featureColumns: z.array(z.any()).optional(),
  labelColumns: z.array(z.any()).optional(),
  trainingRuns: z.array(z.any()).optional(),
  encryptionConfiguration: z.any().optional()
});

let formatModel = (model: any) => ({
  modelId: model.modelReference.modelId,
  datasetId: model.modelReference.datasetId,
  projectId: model.modelReference.projectId,
  modelType: model.modelType,
  location: model.location,
  friendlyName: model.friendlyName,
  description: model.description,
  creationTime: model.creationTime,
  lastModifiedTime: model.lastModifiedTime,
  expirationTime: model.expirationTime,
  labels: model.labels,
  etag: model.etag,
  featureColumns: model.featureColumns,
  labelColumns: model.labelColumns,
  trainingRuns: model.trainingRuns,
  encryptionConfiguration: model.encryptionConfiguration
});

export let listModels = SlateTool.create(spec, {
  name: 'List Models',
  key: 'list_models',
  description: `List BigQuery ML models in a dataset. Model creation and training are performed with SQL using **execute_query** and CREATE MODEL; this tool lists the resulting model resources and metadata.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      datasetId: z.string().describe('Dataset to list models from'),
      maxResults: z.number().optional().describe('Maximum number of models to return'),
      pageToken: z.string().optional().describe('Page token for paginated results')
    })
  )
  .output(
    z.object({
      models: z.array(modelSummarySchema),
      nextPageToken: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new BigQueryClient({
      token: ctx.auth.token,
      projectId: ctx.config.projectId,
      location: ctx.config.location
    });

    let result = await client.listModels(ctx.input.datasetId, {
      maxResults: ctx.input.maxResults,
      pageToken: ctx.input.pageToken
    });

    let models = (result.models || []).map(formatModel);

    return {
      output: {
        models,
        nextPageToken: result.nextPageToken
      },
      message: `Found **${models.length}** model(s) in dataset **${ctx.input.datasetId}**.`
    };
  })
  .build();

export let getModel = SlateTool.create(spec, {
  name: 'Get Model',
  key: 'get_model',
  description: `Retrieve detailed metadata for a BigQuery ML model, including model type, feature columns, label columns, training runs, labels, and expiration metadata.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      datasetId: z.string().describe('Dataset containing the model'),
      modelId: z.string().describe('Model ID to retrieve')
    })
  )
  .output(modelDetailsSchema)
  .handleInvocation(async ctx => {
    let client = new BigQueryClient({
      token: ctx.auth.token,
      projectId: ctx.config.projectId,
      location: ctx.config.location
    });

    let model = await client.getModel(ctx.input.datasetId, ctx.input.modelId);
    let output = formatModel(model);

    return {
      output,
      message: `Model **${ctx.input.modelId}** (${output.modelType || 'unknown type'}) retrieved from dataset **${ctx.input.datasetId}**.`
    };
  })
  .build();

export let updateModel = SlateTool.create(spec, {
  name: 'Update Model',
  key: 'update_model',
  description: `Update BigQuery ML model metadata such as friendly name, description, expiration time, and labels. To change model training or prediction behavior, run SQL with **execute_query** instead.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      datasetId: z.string().describe('Dataset containing the model'),
      modelId: z.string().describe('Model ID to update'),
      friendlyName: z.string().optional().describe('Updated human-readable model name'),
      description: z.string().optional().describe('Updated model description'),
      expirationTime: z
        .string()
        .optional()
        .describe('Updated expiration time as epoch milliseconds string'),
      labels: z.record(z.string(), z.string()).optional().describe('Updated key-value labels')
    })
  )
  .output(modelDetailsSchema)
  .handleInvocation(async ctx => {
    let updates = {
      friendlyName: ctx.input.friendlyName,
      description: ctx.input.description,
      expirationTime: ctx.input.expirationTime,
      labels: ctx.input.labels
    };

    if (Object.values(updates).every(value => value === undefined)) {
      throw bigQueryServiceError(
        'At least one of friendlyName, description, expirationTime, or labels is required to update a model.'
      );
    }

    let client = new BigQueryClient({
      token: ctx.auth.token,
      projectId: ctx.config.projectId,
      location: ctx.config.location
    });

    let model = await client.updateModel(ctx.input.datasetId, ctx.input.modelId, updates);

    return {
      output: formatModel(model),
      message: `Model **${ctx.input.modelId}** updated in dataset **${ctx.input.datasetId}**.`
    };
  })
  .build();

export let deleteModel = SlateTool.create(spec, {
  name: 'Delete Model',
  key: 'delete_model',
  description: `Permanently delete a BigQuery ML model from a dataset. This deletes the model resource and cannot be undone.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      datasetId: z.string().describe('Dataset containing the model'),
      modelId: z.string().describe('Model ID to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new BigQueryClient({
      token: ctx.auth.token,
      projectId: ctx.config.projectId,
      location: ctx.config.location
    });

    await client.deleteModel(ctx.input.datasetId, ctx.input.modelId);

    return {
      output: { deleted: true },
      message: `Model **${ctx.input.modelId}** deleted from dataset **${ctx.input.datasetId}**.`
    };
  })
  .build();
