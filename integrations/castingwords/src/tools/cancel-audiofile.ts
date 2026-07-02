import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let cancelAudiofile = SlateTool.create(spec, {
  name: 'Cancel Audiofile',
  key: 'cancel_audiofile',
  description: `Cancel an audiofile order and receive a refund. Only works when no transcription work has been done — the audiofile must be in one of these states: **Pre-Processing**, **Audio Processing**, or **Error**.`,
  constraints: [
    'Refunds are only possible when the audiofile is in Pre-Processing, Audio Processing, or Error state.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      audiofileId: z.number().describe('ID of the audiofile to cancel and refund'),
      test: z.boolean().optional().describe('Set to true for test mode')
    })
  )
  .output(
    z.object({
      message: z.string().describe('Confirmation message from CastingWords')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let result = await client.refundAudiofile(ctx.input.audiofileId, ctx.input.test);

    return {
      output: {
        message: result.message ?? 'Refund processed successfully'
      },
      message: `Cancelled and refunded audiofile **${ctx.input.audiofileId}**.`
    };
  })
  .build();
