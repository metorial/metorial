import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { validateInteger } from '../lib/client';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let resourceOutput = z.object({
  resourceId: z.string().describe('Created BigML resource ID'),
  name: z.string().optional(),
  statusCode: z.number().describe('Resource processing status; 5 means finished'),
  statusMessage: z.string(),
  created: z.string(),
  raw: z.record(z.string(), z.unknown()).describe('Complete BigML response')
});

export let createInlineSource = SlateTool.create(spec, {
  name: 'Create Inline Source',
  key: 'create_inline_source',
  description:
    'Import CSV text or a JSON string directly as a new BigML source. Use create_dataset after the source finishes processing.',
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({
      data: z
        .string()
        .min(1)
        .describe('CSV text including newline separators, or stringified JSON'),
      name: z.string().optional(),
      tags: z.array(z.string()).optional(),
      projectId: z
        .string()
        .optional()
        .describe('Project ID; discover projects with list_resources')
    })
  )
  .output(resourceOutput)
  .handleInvocation(async ctx => {
    let result = await createClient(ctx).createResource('source', {
      data: ctx.input.data,
      ...(ctx.input.name === undefined ? {} : { name: ctx.input.name }),
      ...(ctx.input.tags === undefined ? {} : { tags: ctx.input.tags }),
      ...(ctx.input.projectId === undefined ? {} : { project: ctx.input.projectId })
    });
    return {
      output: {
        resourceId: result.resource,
        name: result.name,
        statusCode: result.status.code,
        statusMessage: result.status.message,
        created: result.created,
        raw: result
      },
      message: `Source ${result.resource}: ${result.status.message}`
    };
  })
  .build();

export let trainUnsupervisedModel = SlateTool.create(spec, {
  name: 'Train Unsupervised Model',
  key: 'train_unsupervised_model',
  description:
    'Train an association discovery model, topic model, or principal component analysis model from a dataset. Use get_resource to retrieve learned rules, topics, or components when processing finishes.',
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({
      modelType: z
        .enum(['association', 'topicmodel', 'pca'])
        .describe('Unsupervised algorithm to train'),
      datasetId: z.string().describe('Dataset ID; discover datasets with list_resources'),
      inputFields: z
        .array(z.string())
        .optional()
        .describe('Field IDs to include; topic models require text or items fields'),
      name: z.string().optional(),
      tags: z.array(z.string()).optional(),
      projectId: z
        .string()
        .optional()
        .describe('Project ID; discover projects with list_resources')
    })
  )
  .output(resourceOutput)
  .handleInvocation(async ctx => {
    let result = await createClient(ctx).createResource(ctx.input.modelType, {
      dataset: ctx.input.datasetId,
      ...(ctx.input.inputFields === undefined ? {} : { input_fields: ctx.input.inputFields }),
      ...(ctx.input.name === undefined ? {} : { name: ctx.input.name }),
      ...(ctx.input.tags === undefined ? {} : { tags: ctx.input.tags }),
      ...(ctx.input.projectId === undefined ? {} : { project: ctx.input.projectId })
    });
    return {
      output: {
        resourceId: result.resource,
        name: result.name,
        statusCode: result.status.code,
        statusMessage: result.status.message,
        created: result.created,
        raw: result
      },
      message: `${ctx.input.modelType} ${result.resource}: ${result.status.message}`
    };
  })
  .build();

export let createCentroid = SlateTool.create(spec, {
  name: 'Create Centroid',
  key: 'create_centroid',
  description:
    'Assign a new data instance to the nearest centroid in a trained BigML cluster. The complete result includes centroid_id, centroid_name, and distance when available.',
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({
      clusterId: z.string().describe('Cluster ID; discover clusters with list_resources'),
      inputData: z
        .record(z.string(), z.unknown())
        .describe('Field names or IDs mapped to values'),
      name: z.string().optional(),
      projectId: z
        .string()
        .optional()
        .describe('Project ID; discover projects with list_resources')
    })
  )
  .output(
    resourceOutput.extend({
      centroidId: z.string().optional(),
      centroidName: z.string().optional(),
      distance: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let result = await createClient(ctx).createResource('centroid', {
      cluster: ctx.input.clusterId,
      input_data: ctx.input.inputData,
      ...(ctx.input.name === undefined ? {} : { name: ctx.input.name }),
      ...(ctx.input.projectId === undefined ? {} : { project: ctx.input.projectId })
    });
    return {
      output: {
        resourceId: result.resource,
        name: result.name,
        statusCode: result.status.code,
        statusMessage: result.status.message,
        created: result.created,
        raw: result,
        centroidId: typeof result.centroid_id === 'string' ? result.centroid_id : undefined,
        centroidName:
          typeof result.centroid_name === 'string' ? result.centroid_name : undefined,
        distance: typeof result.distance === 'number' ? result.distance : undefined
      },
      message: `Centroid ${result.resource}: ${result.status.message}`
    };
  })
  .build();

export let createAnomalyScore = SlateTool.create(spec, {
  name: 'Create Anomaly Score',
  key: 'create_anomaly_score',
  description:
    'Score a new data instance with a trained BigML anomaly detector. Scores closer to 1 indicate more anomalous instances.',
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({
      anomalyId: z
        .string()
        .describe('Anomaly detector ID; discover detectors with list_resources'),
      inputData: z
        .record(z.string(), z.unknown())
        .describe('Field names or IDs mapped to values'),
      name: z.string().optional(),
      projectId: z
        .string()
        .optional()
        .describe('Project ID; discover projects with list_resources')
    })
  )
  .output(resourceOutput.extend({ score: z.number().optional() }))
  .handleInvocation(async ctx => {
    let result = await createClient(ctx).createResource('anomalyscore', {
      anomaly: ctx.input.anomalyId,
      input_data: ctx.input.inputData,
      ...(ctx.input.name === undefined ? {} : { name: ctx.input.name }),
      ...(ctx.input.projectId === undefined ? {} : { project: ctx.input.projectId })
    });
    return {
      output: {
        resourceId: result.resource,
        name: result.name,
        statusCode: result.status.code,
        statusMessage: result.status.message,
        created: result.created,
        raw: result,
        score: typeof result.score === 'number' ? result.score : undefined
      },
      message: `Anomaly score ${result.resource}: ${result.status.message}`
    };
  })
  .build();

export let createForecast = SlateTool.create(spec, {
  name: 'Create Forecast',
  key: 'create_forecast',
  description:
    'Forecast future values from a trained BigML time series. Supply a positive horizon per objective field ID. Retrieve the resource to inspect forecasts and confidence intervals.',
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({
      timeSeriesId: z
        .string()
        .describe('Time series ID; discover time series with list_resources'),
      horizons: z
        .record(z.string(), z.number())
        .describe('Objective field ID mapped to the number of future steps to predict'),
      intervals: z.boolean().optional().describe('Include lower and upper confidence bounds'),
      name: z.string().optional(),
      projectId: z
        .string()
        .optional()
        .describe('Project ID; discover projects with list_resources')
    })
  )
  .output(resourceOutput)
  .handleInvocation(async ctx => {
    if (!Object.keys(ctx.input.horizons).length)
      throw createApiServiceError('Provide at least one objective field ID and horizon.');
    let inputData: Record<string, { horizon: number }> = {};
    for (let [field, horizon] of Object.entries(ctx.input.horizons)) {
      if (!field.trim())
        throw createApiServiceError(
          'horizons keys must be objective field IDs from get_resource.'
        );
      validateInteger(horizon, `Horizon for ${field}`, 1);
      inputData[field] = { horizon };
    }
    let result = await createClient(ctx).createResource('forecast', {
      timeseries: ctx.input.timeSeriesId,
      input_data: inputData,
      ...(ctx.input.intervals === undefined ? {} : { intervals: ctx.input.intervals }),
      ...(ctx.input.name === undefined ? {} : { name: ctx.input.name }),
      ...(ctx.input.projectId === undefined ? {} : { project: ctx.input.projectId })
    });
    return {
      output: {
        resourceId: result.resource,
        name: result.name,
        statusCode: result.status.code,
        statusMessage: result.status.message,
        created: result.created,
        raw: result
      },
      message: `Forecast ${result.resource}: ${result.status.message}`
    };
  })
  .build();

export let getAccountStatus = SlateTool.create(spec, {
  name: 'Get Account Status',
  key: 'get_account_status',
  description:
    'Retrieve BigML account status, including the task and subscription information returned for the connected account or organization.',
  tags: { readOnly: true, destructive: false }
})
  .input(z.object({}))
  .output(z.object({ accountStatus: z.record(z.string(), z.unknown()) }))
  .handleInvocation(async ctx => ({
    output: { accountStatus: await createClient(ctx).getAccountStatus() },
    message: 'Retrieved BigML account status.'
  }))
  .build();

export let downloadBatchPrediction = SlateTool.create(spec, {
  name: 'Download Batch Prediction',
  key: 'download_batch_prediction',
  description:
    'Download the CSV output of a finished BigML batch prediction. Check processing status with get_resource first.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      projectId: z
        .string()
        .optional()
        .describe('Project containing the batch prediction; overrides the connection default'),
      resourceId: z
        .string()
        .describe('batchprediction/id returned by create_batch_prediction or list_resources')
    })
  )
  .output(
    z.object({
      resourceId: z.string(),
      statusCode: z.number(),
      statusMessage: z.string(),
      raw: z.record(z.string(), z.unknown())
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let download = client.getBatchDownload(ctx.input.resourceId, ctx.input.projectId);
    let result = await client.getResource(
      ctx.input.resourceId,
      ctx.input.projectId === undefined
        ? undefined
        : new URLSearchParams({ project: ctx.input.projectId }).toString()
    );
    if (result.status?.code !== 5)
      throw createApiServiceError(
        `Batch prediction ${ctx.input.resourceId} is not finished. Check get_resource before downloading.`
      );
    await ctx.addAttachment({ type: 'url', ...download, mimeType: 'text/csv' });
    return {
      output: {
        resourceId: result.resource,
        statusCode: result.status.code,
        statusMessage: result.status.message,
        raw: result
      },
      message: `Prepared the CSV output of ${result.resource} for download.`
    };
  })
  .build();
