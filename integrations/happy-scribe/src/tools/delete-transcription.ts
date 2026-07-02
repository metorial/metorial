import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteTranscription = SlateTool.create(spec, {
  name: 'Delete Transcription',
  key: 'delete_transcription',
  description: `Delete a transcription. By default, moves the transcription to Trash. Set permanent to true for irreversible deletion.`,
  instructions: ['Permanent deletion cannot be undone. Use with caution.'],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      transcriptionId: z.string().describe('ID of the transcription to delete.'),
      permanent: z
        .boolean()
        .optional()
        .describe(
          'Set to true for permanent, irreversible deletion. Defaults to false (moves to Trash).'
        )
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the transcription was successfully deleted.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteTranscription(ctx.input.transcriptionId, ctx.input.permanent || false);

    let action = ctx.input.permanent ? 'permanently deleted' : 'moved to Trash';
    return {
      output: {
        deleted: true
      },
      message: `Transcription **${ctx.input.transcriptionId}** was ${action}.`
    };
  })
  .build();
