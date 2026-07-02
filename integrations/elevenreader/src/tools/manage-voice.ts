import { SlateTool } from 'slates';
import { z } from 'zod';
import { ElevenLabsClient } from '../lib/client';
import { spec } from '../spec';

export let editVoiceTool = SlateTool.create(spec, {
  name: 'Edit Voice',
  key: 'edit_voice',
  description: `Update a voice's name, description, or labels. Only works on voices you own.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      voiceId: z.string().describe('ID of the voice to edit'),
      name: z.string().describe('New display name for the voice'),
      description: z.string().optional().describe('New description for the voice'),
      labels: z
        .record(z.string(), z.string())
        .optional()
        .describe('Updated labels/tags for the voice')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the update was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ElevenLabsClient(ctx.auth.token);

    await client.editVoice(ctx.input.voiceId, {
      name: ctx.input.name,
      description: ctx.input.description,
      labels: ctx.input.labels
    });

    return {
      output: { success: true },
      message: `Updated voice \`${ctx.input.voiceId}\` with name **${ctx.input.name}**.`
    };
  })
  .build();

export let deleteVoiceTool = SlateTool.create(spec, {
  name: 'Delete Voice',
  key: 'delete_voice',
  description: `Permanently delete a voice from your library. Only works on voices you own (cloned or designed). This action cannot be undone.`,
  tags: {
    destructive: true
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
      output: { success: true },
      message: `Deleted voice \`${ctx.input.voiceId}\`.`
    };
  })
  .build();
