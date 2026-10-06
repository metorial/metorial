import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteVoice = SlateTool.create(spec, {
  name: 'Delete Voice',
  key: 'delete_voice',
  description:
    'DEPRECATED — LMNT has shut down. This tool is retained for existing workflows and cannot perform provider operations.',
  tags: {
    deprecated: true,
    destructive: true
  }
})
  .input(
    z.object({
      voiceId: z.string().describe('The unique identifier of the voice to delete.')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the voice was successfully deleted.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    await client.deleteVoice(ctx.input.voiceId);

    return {
      output: { deleted: true },
      message: `Deleted voice \`${ctx.input.voiceId}\`.`
    };
  })
  .build();
