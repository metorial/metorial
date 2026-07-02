import { SlateTool } from 'slates';
import { z } from 'zod';
import { RevAIClient } from '../lib/client';
import { spec } from '../spec';

export let deleteJob = SlateTool.create(spec, {
  name: 'Delete Job',
  key: 'delete_job',
  description: `Permanently deletes a completed job and all associated data (media, transcript, results). Supports deleting transcription, sentiment analysis, topic extraction, and language identification jobs.`,
  instructions: [
    'The job must have completed (succeeded or failed) before it can be deleted.',
    'Specify the jobType to indicate which API the job belongs to.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      jobId: z.string().describe('ID of the job to delete'),
      jobType: z
        .enum([
          'transcription',
          'sentiment_analysis',
          'topic_extraction',
          'language_identification'
        ])
        .describe('Type of job to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the job was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RevAIClient({ token: ctx.auth.token });

    switch (ctx.input.jobType) {
      case 'transcription':
        await client.deleteTranscriptionJob(ctx.input.jobId);
        break;
      case 'sentiment_analysis':
        await client.deleteSentimentAnalysisJob(ctx.input.jobId);
        break;
      case 'topic_extraction':
        await client.deleteTopicExtractionJob(ctx.input.jobId);
        break;
      case 'language_identification':
        await client.deleteLanguageIdentificationJob(ctx.input.jobId);
        break;
    }

    return {
      output: { deleted: true },
      message: `Successfully deleted ${ctx.input.jobType} job **${ctx.input.jobId}**.`
    };
  })
  .build();
