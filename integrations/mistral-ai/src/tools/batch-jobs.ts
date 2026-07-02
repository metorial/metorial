import { SlateTool } from 'slates';
import { z } from 'zod';
import { MistralClient } from '../lib/client';
import { spec } from '../spec';

let batchJobSchema = z.object({
  jobId: z.string().describe('Batch job ID'),
  status: z
    .string()
    .describe(
      'Job status (QUEUED, RUNNING, SUCCESS, FAILED, TIMEOUT_EXCEEDED, CANCELLATION_REQUESTED, CANCELLED)'
    ),
  endpoint: z.string().describe('Target API endpoint'),
  model: z.string().nullable().optional().describe('Model used'),
  createdAt: z.number().optional().describe('Creation timestamp'),
  startedAt: z.number().nullable().optional().describe('Start timestamp'),
  completedAt: z.number().nullable().optional().describe('Completion timestamp'),
  totalRequests: z.number().optional().describe('Total requests in the batch'),
  succeededRequests: z.number().optional().describe('Number of successful requests'),
  failedRequests: z.number().optional().describe('Number of failed requests'),
  inputFiles: z.array(z.string()).optional().describe('Input file IDs'),
  outputFile: z.string().nullable().optional().describe('Output file ID'),
  errorFile: z.string().nullable().optional().describe('Error file ID'),
  metadata: z.record(z.string(), z.string()).optional().describe('Custom metadata')
});

export let createBatchJobTool = SlateTool.create(spec, {
  name: 'Create Batch Job',
  key: 'create_batch_job',
  description: `Create a batch inference job for processing multiple requests asynchronously at reduced cost. Upload a JSONL input file first, then reference it here. Supports chat completions, embeddings, FIM, moderation, OCR, and more.`,
  instructions: [
    'Input files must be in JSONL format and uploaded to Mistral first.',
    'Supported endpoints: /v1/chat/completions, /v1/embeddings, /v1/fim/completions, /v1/moderations, /v1/ocr, etc.',
    'Default timeout is 24 hours, maximum is 168 hours (7 days).'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      endpoint: z
        .string()
        .describe('Target API endpoint path (e.g., "/v1/chat/completions", "/v1/embeddings")'),
      model: z.string().optional().describe('Model to use for the batch'),
      inputFiles: z.array(z.string()).optional().describe('JSONL input file IDs'),
      timeoutHours: z
        .number()
        .optional()
        .describe('Job timeout in hours (default 24, max 168)'),
      metadata: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom metadata key-value pairs')
    })
  )
  .output(batchJobSchema)
  .handleInvocation(async ctx => {
    let client = new MistralClient(ctx.auth.token);

    let result = await client.createBatchJob({
      endpoint: ctx.input.endpoint,
      model: ctx.input.model,
      inputFiles: ctx.input.inputFiles,
      timeoutHours: ctx.input.timeoutHours,
      metadata: ctx.input.metadata
    });

    return {
      output: {
        jobId: result.id,
        status: result.status,
        endpoint: result.endpoint,
        model: result.model,
        createdAt: result.created_at,
        startedAt: result.started_at,
        completedAt: result.completed_at,
        totalRequests: result.total_requests,
        succeededRequests: result.succeeded_requests,
        failedRequests: result.failed_requests,
        inputFiles: result.input_files,
        outputFile: result.output_file,
        errorFile: result.error_file,
        metadata: result.metadata
      },
      message: `Created batch job **${result.id}** targeting **${result.endpoint}**. Status: **${result.status}**.`
    };
  })
  .build();

export let getBatchJobTool = SlateTool.create(spec, {
  name: 'Get Batch Job',
  key: 'get_batch_job',
  description: `Retrieve the status and details of a batch inference job. Use this to monitor progress, check completion, and get output/error file IDs.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      jobId: z.string().describe('Batch job ID')
    })
  )
  .output(batchJobSchema)
  .handleInvocation(async ctx => {
    let client = new MistralClient(ctx.auth.token);

    let result = await client.getBatchJob(ctx.input.jobId);

    return {
      output: {
        jobId: result.id,
        status: result.status,
        endpoint: result.endpoint,
        model: result.model,
        createdAt: result.created_at,
        startedAt: result.started_at,
        completedAt: result.completed_at,
        totalRequests: result.total_requests,
        succeededRequests: result.succeeded_requests,
        failedRequests: result.failed_requests,
        inputFiles: result.input_files,
        outputFile: result.output_file,
        errorFile: result.error_file,
        metadata: result.metadata
      },
      message: `Batch job **${result.id}**: status **${result.status}**. ${result.total_requests ? `Progress: ${result.succeeded_requests || 0}/${result.total_requests} succeeded` : ''}`
    };
  })
  .build();

export let listBatchJobsTool = SlateTool.create(spec, {
  name: 'List Batch Jobs',
  key: 'list_batch_jobs',
  description: `List batch inference jobs. Optionally filter by status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      status: z
        .enum([
          'QUEUED',
          'RUNNING',
          'SUCCESS',
          'FAILED',
          'TIMEOUT_EXCEEDED',
          'CANCELLATION_REQUESTED',
          'CANCELLED'
        ])
        .optional()
        .describe('Filter by job status'),
      page: z.number().optional().describe('Page number'),
      pageSize: z.number().optional().describe('Number of jobs per page')
    })
  )
  .output(
    z.object({
      jobs: z.array(batchJobSchema).describe('Batch jobs'),
      total: z.number().optional().describe('Total number of jobs')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MistralClient(ctx.auth.token);

    let result = await client.listBatchJobs({
      status: ctx.input.status,
      page: ctx.input.page,
      pageSize: ctx.input.pageSize
    });

    let jobs = (result.data || []).map((j: any) => ({
      jobId: j.id,
      status: j.status,
      endpoint: j.endpoint,
      model: j.model,
      createdAt: j.created_at,
      startedAt: j.started_at,
      completedAt: j.completed_at,
      totalRequests: j.total_requests,
      succeededRequests: j.succeeded_requests,
      failedRequests: j.failed_requests,
      inputFiles: j.input_files,
      outputFile: j.output_file,
      errorFile: j.error_file,
      metadata: j.metadata
    }));

    return {
      output: {
        jobs,
        total: result.total
      },
      message: `Found **${jobs.length}** batch job(s).`
    };
  })
  .build();

export let cancelBatchJobTool = SlateTool.create(spec, {
  name: 'Cancel Batch Job',
  key: 'cancel_batch_job',
  description: `Cancel a running or queued batch inference job.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      jobId: z.string().describe('Batch job ID to cancel')
    })
  )
  .output(batchJobSchema)
  .handleInvocation(async ctx => {
    let client = new MistralClient(ctx.auth.token);

    let result = await client.cancelBatchJob(ctx.input.jobId);

    return {
      output: {
        jobId: result.id,
        status: result.status,
        endpoint: result.endpoint,
        model: result.model,
        createdAt: result.created_at,
        startedAt: result.started_at,
        completedAt: result.completed_at,
        totalRequests: result.total_requests,
        succeededRequests: result.succeeded_requests,
        failedRequests: result.failed_requests,
        inputFiles: result.input_files,
        outputFile: result.output_file,
        errorFile: result.error_file,
        metadata: result.metadata
      },
      message: `Cancelled batch job **${result.id}**. Status: **${result.status}**.`
    };
  })
  .build();
