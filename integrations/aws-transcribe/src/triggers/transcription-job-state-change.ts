import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { TranscribeClient } from '../lib/client';
import { spec } from '../spec';

export let transcriptionJobStateChange = SlateTrigger.create(spec, {
  name: 'Transcription Job State Change',
  key: 'transcription_job_state_change',
  description:
    'Triggers when a transcription job changes to a terminal state (COMPLETED or FAILED). Polls for recently completed or failed jobs across standard, call analytics, and medical transcription job types.'
})
  .input(
    z.object({
      jobType: z
        .enum(['standard', 'call_analytics', 'medical'])
        .describe('Type of transcription job'),
      jobName: z.string().describe('Name of the transcription job'),
      jobStatus: z.enum(['COMPLETED', 'FAILED']).describe('Terminal status of the job'),
      completionTime: z.number().optional().describe('Unix timestamp when the job completed'),
      failureReason: z.string().optional().describe('Reason for failure if status is FAILED'),
      languageCode: z.string().optional().describe('Language code of the transcription'),
      transcriptFileUri: z.string().optional().describe('S3 URI of the transcript output'),
      mediaFileUri: z.string().optional().describe('S3 URI of the input media file')
    })
  )
  .output(
    z.object({
      jobType: z
        .enum(['standard', 'call_analytics', 'medical'])
        .describe('Type of transcription job'),
      jobName: z.string().describe('Name of the transcription job'),
      jobStatus: z.enum(['COMPLETED', 'FAILED']).describe('Terminal status of the job'),
      completionTime: z
        .number()
        .optional()
        .describe('Unix timestamp when the job reached terminal state'),
      failureReason: z.string().optional().describe('Reason for failure if status is FAILED'),
      languageCode: z.string().optional().describe('Language code of the transcription'),
      transcriptFileUri: z.string().optional().describe('S3 URI of the transcript output'),
      mediaFileUri: z.string().optional().describe('S3 URI of the input media file')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new TranscribeClient({
        credentials: {
          accessKeyId: ctx.auth.accessKeyId,
          secretAccessKey: ctx.auth.secretAccessKey,
          sessionToken: ctx.auth.sessionToken
        },
        region: ctx.config.region
      });

      let lastPollTime: number = ctx.state?.lastPollTime || 0;
      let seenJobNames: string[] = ctx.state?.seenJobNames || [];
      let inputs: Array<{
        jobType: 'standard' | 'call_analytics' | 'medical';
        jobName: string;
        jobStatus: 'COMPLETED' | 'FAILED';
        completionTime?: number;
        failureReason?: string;
        languageCode?: string;
        transcriptFileUri?: string;
        mediaFileUri?: string;
      }> = [];

      let newSeenJobNames: string[] = [...seenJobNames];
      let maxCompletionTime = lastPollTime;

      // Poll standard transcription jobs (COMPLETED and FAILED)
      for (let status of ['COMPLETED', 'FAILED'] as const) {
        try {
          let result = await client.listTranscriptionJobs({ status, maxResults: 100 });
          let summaries = result.TranscriptionJobSummaries || [];
          for (let s of summaries) {
            let completionTime = s.CompletionTime || 0;
            let jobKey = `standard:${s.TranscriptionJobName}`;
            if (completionTime > lastPollTime && !seenJobNames.includes(jobKey)) {
              inputs.push({
                jobType: 'standard',
                jobName: s.TranscriptionJobName,
                jobStatus: status,
                completionTime: s.CompletionTime,
                failureReason: s.FailureReason,
                languageCode: s.LanguageCode,
                mediaFileUri: undefined,
                transcriptFileUri: undefined
              });
              newSeenJobNames.push(jobKey);
              if (completionTime > maxCompletionTime) maxCompletionTime = completionTime;
            }
          }
        } catch (e) {
          ctx.warn({ message: 'Failed to list standard transcription jobs', error: e });
        }
      }

      // Poll call analytics jobs
      for (let status of ['COMPLETED', 'FAILED'] as const) {
        try {
          let result = await client.listCallAnalyticsJobs({ status, maxResults: 100 });
          let summaries = result.CallAnalyticsJobSummaries || [];
          for (let s of summaries) {
            let completionTime = s.CompletionTime || 0;
            let jobKey = `call_analytics:${s.CallAnalyticsJobName}`;
            if (completionTime > lastPollTime && !seenJobNames.includes(jobKey)) {
              inputs.push({
                jobType: 'call_analytics',
                jobName: s.CallAnalyticsJobName,
                jobStatus: status,
                completionTime: s.CompletionTime,
                failureReason: s.FailureReason,
                languageCode: s.LanguageCode,
                mediaFileUri: undefined,
                transcriptFileUri: undefined
              });
              newSeenJobNames.push(jobKey);
              if (completionTime > maxCompletionTime) maxCompletionTime = completionTime;
            }
          }
        } catch (e) {
          ctx.warn({ message: 'Failed to list call analytics jobs', error: e });
        }
      }

      // Poll medical transcription jobs
      for (let status of ['COMPLETED', 'FAILED'] as const) {
        try {
          let result = await client.listMedicalTranscriptionJobs({ status, maxResults: 100 });
          let summaries = result.MedicalTranscriptionJobSummaries || [];
          for (let s of summaries) {
            let completionTime = s.CompletionTime || 0;
            let jobKey = `medical:${s.MedicalTranscriptionJobName}`;
            if (completionTime > lastPollTime && !seenJobNames.includes(jobKey)) {
              inputs.push({
                jobType: 'medical',
                jobName: s.MedicalTranscriptionJobName,
                jobStatus: status,
                completionTime: s.CompletionTime,
                failureReason: s.FailureReason,
                languageCode: s.LanguageCode,
                mediaFileUri: undefined,
                transcriptFileUri: undefined
              });
              newSeenJobNames.push(jobKey);
              if (completionTime > maxCompletionTime) maxCompletionTime = completionTime;
            }
          }
        } catch (e) {
          ctx.warn({ message: 'Failed to list medical transcription jobs', error: e });
        }
      }

      // Keep only the last 500 seen job names to avoid unbounded growth
      if (newSeenJobNames.length > 500) {
        newSeenJobNames = newSeenJobNames.slice(-500);
      }

      return {
        inputs,
        updatedState: {
          lastPollTime: maxCompletionTime || lastPollTime,
          seenJobNames: newSeenJobNames
        }
      };
    },

    handleEvent: async ctx => {
      // For standard jobs that completed, fetch full details to get transcript URI
      let transcriptFileUri = ctx.input.transcriptFileUri;
      let mediaFileUri = ctx.input.mediaFileUri;

      if (ctx.input.jobStatus === 'COMPLETED' && !transcriptFileUri) {
        try {
          let client = new TranscribeClient({
            credentials: {
              accessKeyId: ctx.auth.accessKeyId,
              secretAccessKey: ctx.auth.secretAccessKey,
              sessionToken: ctx.auth.sessionToken
            },
            region: ctx.config.region
          });

          if (ctx.input.jobType === 'standard') {
            let result = await client.getTranscriptionJob(ctx.input.jobName);
            let job = result.TranscriptionJob;
            transcriptFileUri = job.Transcript?.TranscriptFileUri;
            mediaFileUri = job.Media?.MediaFileUri;
          } else if (ctx.input.jobType === 'call_analytics') {
            let result = await client.getCallAnalyticsJob(ctx.input.jobName);
            let job = result.CallAnalyticsJob;
            transcriptFileUri = job.Transcript?.TranscriptFileUri;
            mediaFileUri = job.Media?.MediaFileUri;
          } else if (ctx.input.jobType === 'medical') {
            let result = await client.getMedicalTranscriptionJob(ctx.input.jobName);
            let job = result.MedicalTranscriptionJob;
            transcriptFileUri = job.Transcript?.TranscriptFileUri;
            mediaFileUri = job.Media?.MediaFileUri;
          }
        } catch (_e) {
          // Non-critical: we still emit the event without URI
        }
      }

      return {
        type: `transcription_job.${ctx.input.jobStatus.toLowerCase()}`,
        id: `${ctx.input.jobType}:${ctx.input.jobName}:${ctx.input.completionTime || Date.now()}`,
        output: {
          jobType: ctx.input.jobType,
          jobName: ctx.input.jobName,
          jobStatus: ctx.input.jobStatus,
          completionTime: ctx.input.completionTime,
          failureReason: ctx.input.failureReason,
          languageCode: ctx.input.languageCode,
          transcriptFileUri,
          mediaFileUri
        }
      };
    }
  });
