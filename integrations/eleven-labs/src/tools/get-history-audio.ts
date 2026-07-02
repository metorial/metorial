import { SlateTool } from 'slates';
import { z } from 'zod';
import { ElevenLabsClient } from '../lib/client';
import { spec } from '../spec';
import { audioAttachment, audioOutput, audioOutputSchema } from './shared';

export let getHistoryAudio = SlateTool.create(spec, {
  name: 'Get History Audio',
  key: 'get_history_audio',
  description: `Download the audio for a generated history item. Returns the audio file as a Slate attachment.`,
  instructions: ['Use list_history first to find a historyItemId.'],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      historyItemId: z
        .string()
        .describe('ID of the history item whose audio should be returned')
    })
  )
  .output(audioOutputSchema)
  .handleInvocation(async ctx => {
    let client = new ElevenLabsClient(ctx.auth.token);
    let result = await client.getHistoryAudio(ctx.input.historyItemId);

    return {
      output: audioOutput(result),
      attachments: [audioAttachment(result)],
      message: `Retrieved audio for history item \`${ctx.input.historyItemId}\`.`
    };
  })
  .build();
