import { SlateTool } from 'slates';
import { z } from 'zod';
import { TranscribeClient } from '../lib/client';
import { spec } from '../spec';

export let deleteTranscriptionJob = SlateTool.create(spec, {
  name: 'Delete Transcription Job',
  key: 'delete_transcription_job',
  description: `Delete a transcription job and its associated metadata. The job must be in a terminal state (COMPLETED or FAILED) to be deleted. This does not delete the transcript output from S3.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      jobName: z.string().describe('Name of the transcription job to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the job was successfully deleted'),
      jobName: z.string().describe('Name of the deleted transcription job')
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

    await client.deleteTranscriptionJob(ctx.input.jobName);

    return {
      output: {
        deleted: true,
        jobName: ctx.input.jobName
      },
      message: `Deleted transcription job **${ctx.input.jobName}**.`
    };
  });
