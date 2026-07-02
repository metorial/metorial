import { SlateTool } from 'slates';
import { z } from 'zod';
import { ElevenLabsClient } from '../lib/client';
import { spec } from '../spec';

export let deleteVoice = SlateTool.create(spec, {
  name: 'Delete Voice',
  key: 'delete_voice',
  description: `Permanently delete a voice by its ID. Only voices you own can be deleted. This action cannot be undone.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      voiceId: z.string().describe('ID of the voice to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ElevenLabsClient(ctx.auth.token);
    await client.deleteVoice(ctx.input.voiceId);

    return {
      output: {
        success: true
      },
      message: `Deleted voice \`${ctx.input.voiceId}\`.`
    };
  })
  .build();
