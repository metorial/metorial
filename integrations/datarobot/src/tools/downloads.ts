import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { DataRobotClient } from '../lib/client';
import { spec } from '../spec';

export let downloadDataset = SlateTool.create(spec, {
  key: 'download_dataset',
  name: 'Download Dataset',
  description:
    'Download the original persisted dataset as a CSV file. The dataset must permit data download.',
  tags: { readOnly: true }
})
  .input(z.object({ datasetId: z.string().describe('AI Catalog dataset ID') }))
  .output(z.object({ datasetId: z.string(), fileName: z.string(), mimeType: z.string() }))
  .handleInvocation(async ctx => {
    let client = new DataRobotClient({
      token: ctx.auth.token,
      endpointUrl: ctx.auth.endpointUrl ?? ctx.config.endpointUrl
    });
    let dataset = await client.getDataset(ctx.input.datasetId);
    if (dataset.dataPersisted === false)
      throw createApiServiceError(
        'DataRobot does not allow downloading this dataset because its data was not persisted.'
      );
    let fileName = `dataset-${encodeURIComponent(ctx.input.datasetId)}.csv`;
    await ctx.addAttachment({
      type: 'url',
      ...client.getDownload(`/datasets/${encodeURIComponent(ctx.input.datasetId)}/file/`),
      filename: fileName,
      mimeType: 'text/csv'
    });
    return {
      output: { datasetId: ctx.input.datasetId, fileName, mimeType: 'text/csv' },
      message: 'Prepared the dataset CSV for download.'
    };
  })
  .build();

export let downloadBatchPredictions = SlateTool.create(spec, {
  key: 'download_batch_predictions',
  name: 'Download Batch Predictions',
  description:
    'Download a completed batch prediction job as a CSV file. The job must use localFile output.',
  tags: { readOnly: true }
})
  .input(z.object({ jobId: z.string().describe('Completed batch prediction job ID') }))
  .output(z.object({ jobId: z.string(), fileName: z.string(), mimeType: z.string() }))
  .handleInvocation(async ctx => {
    let client = new DataRobotClient({
      token: ctx.auth.token,
      endpointUrl: ctx.auth.endpointUrl ?? ctx.config.endpointUrl
    });
    let job = await client.getBatchPredictionJob(ctx.input.jobId);
    if (job.status !== 'COMPLETED')
      throw createApiServiceError(
        'Wait until the batch prediction job status is COMPLETED before downloading its results.'
      );
    let outputType = job.jobSpec?.outputSettings?.type;
    if (outputType !== undefined && !['localFile', 'local_file'].includes(outputType))
      throw createApiServiceError(
        'Download is available only for jobs configured with localFile output.'
      );
    let fileName = `predictions-${encodeURIComponent(ctx.input.jobId)}.csv`;
    await ctx.addAttachment({
      type: 'url',
      ...client.getDownload(
        `/batchPredictions/${encodeURIComponent(ctx.input.jobId)}/download/`
      ),
      filename: fileName,
      mimeType: 'text/csv'
    });
    return {
      output: { jobId: ctx.input.jobId, fileName, mimeType: 'text/csv' },
      message: 'Prepared the scored CSV for download.'
    };
  })
  .build();

export let downloadModelArtifact = SlateTool.create(spec, {
  key: 'download_model_artifact',
  name: 'Download Model Artifact',
  description:
    'Download a model training artifact or persistent logs as a tar.gz archive. Available for models built from blueprints with custom tasks.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      projectId: z.string(),
      modelId: z.string(),
      kind: z.enum(['training_artifact', 'logs'])
    })
  )
  .output(z.object({ modelId: z.string(), fileName: z.string(), mimeType: z.string() }))
  .handleInvocation(async ctx => {
    let client = new DataRobotClient({
      token: ctx.auth.token,
      endpointUrl: ctx.auth.endpointUrl ?? ctx.config.endpointUrl
    });
    await client.getModel(ctx.input.projectId, ctx.input.modelId);
    let fileName = `model-${encodeURIComponent(ctx.input.modelId)}-${ctx.input.kind}.tar.gz`;
    let suffix = ctx.input.kind === 'logs' ? 'logs' : 'trainingArtifact';
    await ctx.addAttachment({
      type: 'url',
      ...client.getDownload(
        `/projects/${encodeURIComponent(ctx.input.projectId)}/models/${encodeURIComponent(ctx.input.modelId)}/${suffix}/`
      ),
      filename: fileName,
      mimeType: 'application/gzip'
    });
    return {
      output: { modelId: ctx.input.modelId, fileName, mimeType: 'application/gzip' },
      message: 'Prepared the model archive for download.'
    };
  })
  .build();
