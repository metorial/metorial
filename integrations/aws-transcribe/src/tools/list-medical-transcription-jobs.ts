import { SlateTool } from 'slates';
import { z } from 'zod';
import { TranscribeClient } from '../lib/client';
import { spec } from '../spec';

export let listMedicalTranscriptionJobs = SlateTool.create(spec, {
  name: 'List Medical Transcription Jobs',
  key: 'list_medical_transcription_jobs',
  description:
    'List medical transcription jobs in your AWS account. Filter by status or job name and paginate through results.',
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
        .describe('Filter jobs whose name contains this string'),
      maxResults: z.number().optional().describe('Maximum number of results (1-100)'),
      nextToken: z.string().optional().describe('Pagination token from a previous response')
    })
  )
  .output(
    z.object({
      jobs: z
        .array(
          z.object({
            jobName: z.string().describe('Name of the medical transcription job'),
            jobStatus: z.string().describe('Current status of the job'),
            languageCode: z.string().optional().describe('Language code'),
            specialty: z.string().optional().describe('Medical specialty'),
            type: z.string().optional().describe('Medical transcription type'),
            creationTime: z.number().optional().describe('Unix timestamp when created'),
            startTime: z.number().optional().describe('Unix timestamp when started'),
            completionTime: z.number().optional().describe('Unix timestamp when completed'),
            failureReason: z.string().optional().describe('Failure reason, if any'),
            outputLocationType: z.string().optional().describe('Where output is stored')
          })
        )
        .describe('List of medical transcription job summaries'),
      nextToken: z.string().optional().describe('Pagination token for the next page')
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

    let result = await client.listMedicalTranscriptionJobs(ctx.input);
    let jobs = (result.MedicalTranscriptionJobSummaries || []).map((job: any) => ({
      jobName: job.MedicalTranscriptionJobName,
      jobStatus: job.TranscriptionJobStatus,
      languageCode: job.LanguageCode,
      specialty: job.Specialty,
      type: job.Type,
      creationTime: job.CreationTime,
      startTime: job.StartTime,
      completionTime: job.CompletionTime,
      failureReason: job.FailureReason,
      outputLocationType: job.OutputLocationType
    }));

    return {
      output: {
        jobs,
        nextToken: result.NextToken
      },
      message: `Found **${jobs.length}** medical transcription job(s).${result.NextToken ? ' More results are available with pagination.' : ''}`
    };
  });
