import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteTranscription = SlateTool.create(spec, {
  name: 'Delete Transcription',
  key: 'delete_transcription',
  description: `Permanently delete a pre-recorded transcription and its associated data from Gladia. This action cannot be undone.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      transcriptionId: z.string().describe('ID of the transcription to delete')
    })
  )
  .output(
    z.object({
      transcriptionId: z.string().describe('ID of the deleted transcription'),
      deleted: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    ctx.info('Deleting transcription...');
    await client.deleteTranscription(ctx.input.transcriptionId);

    return {
      output: {
        transcriptionId: ctx.input.transcriptionId,
        deleted: true
      },
      message: `Transcription \`${ctx.input.transcriptionId}\` has been **deleted**.`
    };
  })
  .build();
