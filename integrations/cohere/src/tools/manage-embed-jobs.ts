import { SlateTool } from 'slates';
import { z } from 'zod';
import { CohereClient } from '../lib/client';
import { spec } from '../spec';

let embedJobOutputSchema = z.object({
  jobId: z.string().describe('Unique identifier for the embed job'),
  name: z.string().optional().describe('Name of the embed job'),
  status: z
    .string()
    .describe('Current status: processing, complete, cancelling, cancelled, or failed'),
  model: z.string().optional().describe('Embedding model used'),
  inputDatasetId: z.string().optional().describe('ID of the source dataset'),
  outputDatasetId: z.string().optional().describe('ID of the resulting embeddings dataset'),
  createdAt: z.string().optional().describe('ISO 8601 timestamp of creation'),
  truncate: z.string().optional().describe('Truncation strategy used (START or END)')
});

export let createEmbedJobTool = SlateTool.create(spec, {
  name: 'Create Embed Job',
  key: 'create_embed_job',
  description: `Launch an asynchronous batch embedding job to embed a large dataset (100K+ documents). Results are stored as a new hosted dataset. Best suited for encoding large corpora for retrieval use cases.`,
  instructions: [
    'The dataset must already be uploaded and validated with type "embed-input" before creating an embed job.',
    'Use the List Datasets or Get Dataset tools to find valid dataset IDs.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      model: z
        .string()
        .describe('Embedding model to use (e.g., "embed-v4.0", "embed-english-v3.0")'),
      datasetId: z.string().describe('ID of a validated "embed-input" dataset to embed'),
      inputType: z
        .enum(['search_document', 'search_query', 'classification', 'clustering'])
        .describe('How the embeddings will be used'),
      name: z.string().optional().describe('Name for the embed job'),
      embeddingTypes: z
        .array(z.enum(['float', 'int8', 'uint8', 'binary', 'ubinary']))
        .optional()
        .describe('Output embedding formats'),
      truncate: z
        .enum(['START', 'END'])
        .optional()
        .describe('Truncation strategy for oversized inputs (default: END)')
    })
  )
  .output(
    z.object({
      jobId: z.string().describe('ID of the created embed job')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CohereClient({ token: ctx.auth.token });

    let result = await client.createEmbedJob({
      model: ctx.input.model,
      datasetId: ctx.input.datasetId,
      inputType: ctx.input.inputType,
      name: ctx.input.name,
      embeddingTypes: ctx.input.embeddingTypes,
      truncate: ctx.input.truncate
    });

    return {
      output: { jobId: result.job_id || '' },
      message: `Created embed job **${result.job_id}** using **${ctx.input.model}** on dataset **${ctx.input.datasetId}**.`
    };
  })
  .build();

export let listEmbedJobsTool = SlateTool.create(spec, {
  name: 'List Embed Jobs',
  key: 'list_embed_jobs',
  description: `List all embed jobs in your Cohere account, including their status, model, and associated datasets.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      embedJobs: z.array(embedJobOutputSchema).describe('List of embed jobs')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CohereClient({ token: ctx.auth.token });

    let result = await client.listEmbedJobs();

    let embedJobs = (result.embed_jobs || []).map((j: any) => ({
      jobId: j.job_id || '',
      name: j.name,
      status: j.status || 'unknown',
      model: j.model,
      inputDatasetId: j.input_dataset_id,
      outputDatasetId: j.output_dataset_id,
      createdAt: j.created_at,
      truncate: j.truncate
    }));

    return {
      output: { embedJobs },
      message: `Found **${embedJobs.length}** embed job(s).`
    };
  })
  .build();

export let getEmbedJobTool = SlateTool.create(spec, {
  name: 'Get Embed Job',
  key: 'get_embed_job',
  description: `Get the current status and details of a specific embed job by its ID.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      jobId: z.string().describe('ID of the embed job to retrieve')
    })
  )
  .output(embedJobOutputSchema)
  .handleInvocation(async ctx => {
    let client = new CohereClient({ token: ctx.auth.token });

    let j = await client.getEmbedJob(ctx.input.jobId);

    return {
      output: {
        jobId: j.job_id || ctx.input.jobId,
        name: j.name,
        status: j.status || 'unknown',
        model: j.model,
        inputDatasetId: j.input_dataset_id,
        outputDatasetId: j.output_dataset_id,
        createdAt: j.created_at,
        truncate: j.truncate
      },
      message: `Embed job **${ctx.input.jobId}** is **${j.status || 'unknown'}**.`
    };
  })
  .build();

export let cancelEmbedJobTool = SlateTool.create(spec, {
  name: 'Cancel Embed Job',
  key: 'cancel_embed_job',
  description: `Cancel an active embed job. You will be charged for embeddings processed up to the cancellation point.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      jobId: z.string().describe('ID of the embed job to cancel')
    })
  )
  .output(
    z.object({
      cancelled: z
        .boolean()
        .describe('Whether the cancellation request was submitted successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CohereClient({ token: ctx.auth.token });

    await client.cancelEmbedJob(ctx.input.jobId);

    return {
      output: { cancelled: true },
      message: `Cancellation requested for embed job **${ctx.input.jobId}**.`
    };
  })
  .build();
