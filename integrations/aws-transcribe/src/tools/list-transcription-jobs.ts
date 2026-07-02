import { SlateTool } from 'slates';
import { z } from 'zod';
import { TranscribeClient } from '../lib/client';
import { spec } from '../spec';

export let listTranscriptionJobs = SlateTool.create(spec, {
  name: 'List Transcription Jobs',
  key: 'list_transcription_jobs',
  description: `List transcription jobs in your AWS account. Filter by status or job name to find specific jobs. Returns summaries with job names, statuses, creation times, and language codes. Supports pagination for large result sets.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      status: z
        .enum(['QUEUED', 'IN_PROGRESS', 'FAILED', 'COMPLETED'])
        .optional()
        .describe('Filter by job status'),
      jobNameContains: z
        .string()
        .optional()
        .describe('Filter jobs whose name contains this string (case-insensitive)'),
      maxResults: z
        .number()
        .optional()
        .describe('Maximum number of results to return (1-100, default 5)'),
      nextToken: z.string().optional().describe('Pagination token from a previous response')
    })
  )
  .output(
    z.object({
      jobs: z
        .array(
          z.object({
            jobName: z.string().describe('Name of the transcription job'),
            jobStatus: z.string().describe('Current status of the job'),
            languageCode: z.string().optional().describe('Language code'),
            creationTime: z
              .number()
              .optional()
              .describe('Unix timestamp when the job was created'),
            startTime: z
              .number()
              .optional()
              .describe('Unix timestamp when processing started'),
            completionTime: z
              .number()
              .optional()
              .describe('Unix timestamp when the job completed'),
            failureReason: z
              .string()
              .optional()
              .describe('Reason for failure if status is FAILED'),
            outputLocationType: z
              .string()
              .optional()
              .describe('Where the output is stored (CUSTOMER_BUCKET or SERVICE_BUCKET)')
          })
        )
        .describe('List of transcription job summaries'),
      nextToken: z.string().optional().describe('Pagination token for next page of results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TranscribeClient({
      credentials: {
        accessKeyId: ctx.auth.accessKeyId,
        secretAccessKey: ctx.auth.secretAccessKey,
        sessionToken: ctx.auth.sessionToken
      },
      region: ctx.config.region
    });

    let result = await client.listTranscriptionJobs(ctx.input);
    let summaries = result.TranscriptionJobSummaries || [];

    let jobs = summaries.map((s: any) => ({
      jobName: s.TranscriptionJobName,
      jobStatus: s.TranscriptionJobStatus,
      languageCode: s.LanguageCode,
      creationTime: s.CreationTime,
      startTime: s.StartTime,
      completionTime: s.CompletionTime,
      failureReason: s.FailureReason,
      outputLocationType: s.OutputLocationType
    }));

    return {
      output: {
        jobs,
        nextToken: result.NextToken
      },
      message: `Found **${jobs.length}** transcription job(s)${ctx.input.status ? ` with status **${ctx.input.status}**` : ''}.${result.NextToken ? ' More results available with pagination.' : ''}`
    };
  });
