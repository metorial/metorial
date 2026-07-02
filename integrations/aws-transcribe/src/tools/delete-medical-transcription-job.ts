import { SlateTool } from 'slates';
import { z } from 'zod';
import { TranscribeClient } from '../lib/client';
import { spec } from '../spec';

export let deleteMedicalTranscriptionJob = SlateTool.create(spec, {
  name: 'Delete Medical Transcription Job',
  key: 'delete_medical_transcription_job',
  description:
    'Delete a medical transcription job and its metadata. This does not delete transcript output stored in S3.',
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      jobName: z.string().describe('Name of the medical transcription job to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the job was deleted'),
      jobName: z.string().describe('Name of the deleted medical transcription job')
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

    await client.deleteMedicalTranscriptionJob(ctx.input.jobName);

    return {
      output: {
        deleted: true,
        jobName: ctx.input.jobName
      },
      message: `Deleted medical transcription job **${ctx.input.jobName}**.`
    };
  });
