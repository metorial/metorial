import { SlateTool } from 'slates';
import { z } from 'zod';
import { SpeechToTextClient } from '../lib/client';
import { spec } from '../spec';

export let deleteBatchTranscription = SlateTool.create(spec, {
  name: 'Delete Batch Transcription',
  key: 'delete_batch_transcription',
  description: `Deletes a batch transcription job and its associated result data. Use this to clean up completed transcriptions after retrieving their results, or to cancel transcriptions that are no longer needed.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      transcriptionId: z
        .string()
        .describe('The unique identifier of the batch transcription job to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the transcription was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SpeechToTextClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    ctx.info(`Deleting transcription ${ctx.input.transcriptionId}...`);

    await client.deleteTranscription(ctx.input.transcriptionId);

    return {
      output: {
        deleted: true
      },
      message: `Batch transcription \`${ctx.input.transcriptionId}\` was successfully deleted.`
    };
  })
  .build();
