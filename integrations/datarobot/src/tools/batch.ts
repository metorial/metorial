import { SlateTool } from 'slates';
import { z } from 'zod';
import { DataRobotClient, validateInteger } from '../lib/client';
import { parseOutput } from '../lib/output';
import { spec } from '../spec';

let jobOutput = z.object({
  jobId: z.string(),
  status: z.string(),
  raw: z.record(z.string(), z.any())
});

export let createBatchPredictionJob = SlateTool.create(spec, {
  key: 'create_batch_prediction_job',
  name: 'Create Batch Prediction Job',
  description:
    'Score an AI Catalog dataset with a deployment in a batch job and retain CSV results for download. Poll Get Batch Prediction Job before downloading.'
})
  .input(
    z.object({
      deploymentId: z.string(),
      datasetId: z.string(),
      datasetVersionId: z
        .string()
        .optional()
        .describe('Specific dataset version; omitted uses the latest version'),
      maxExplanations: z
        .number()
        .optional()
        .describe('Number of explanations per prediction, a nonnegative integer'),
      passthroughColumns: z
        .array(z.string())
        .optional()
        .describe('Input columns to include in the scored CSV')
    })
  )
  .output(jobOutput)
  .handleInvocation(async ctx => {
    validateInteger(ctx.input.maxExplanations, 'maxExplanations');
    let client = new DataRobotClient({
      token: ctx.auth.token,
      endpointUrl: ctx.auth.endpointUrl ?? ctx.config.endpointUrl
    });
    let job = await client.createBatchPredictionJob({
      deploymentId: ctx.input.deploymentId,
      intakeSettings: {
        type: 'dataset',
        datasetId: ctx.input.datasetId,
        datasetVersionId: ctx.input.datasetVersionId
      },
      outputSettings: { type: 'localFile' },
      csvSettings: {},
      maxExplanations: ctx.input.maxExplanations ?? 0,
      passthroughColumns: ctx.input.passthroughColumns,
      abortOnError: true,
      disableRowLevelErrorHandling: false,
      includePredictionStatus: false,
      includeProbabilities: true,
      includeProbabilitiesClasses: [],
      skipDriftTracking: false
    });
    return {
      output: parseOutput(jobOutput, { jobId: job.id, status: job.status, raw: job }),
      message: 'Submitted the batch prediction job.'
    };
  })
  .build();

export let getBatchPredictionJob = SlateTool.create(spec, {
  key: 'get_batch_prediction_job',
  name: 'Get Batch Prediction Job',
  description:
    'Check batch prediction status, progress, scored rows, errors, and output configuration.',
  tags: { readOnly: true }
})
  .input(z.object({ jobId: z.string() }))
  .output(jobOutput)
  .handleInvocation(async ctx => {
    let client = new DataRobotClient({
      token: ctx.auth.token,
      endpointUrl: ctx.auth.endpointUrl ?? ctx.config.endpointUrl
    });
    let job = await client.getBatchPredictionJob(ctx.input.jobId);
    return {
      output: parseOutput(jobOutput, { jobId: job.id, status: job.status, raw: job }),
      message: 'Retrieved the batch prediction job.'
    };
  })
  .build();
