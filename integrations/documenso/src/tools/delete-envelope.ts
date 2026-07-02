import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteEnvelopeTool = SlateTool.create(spec, {
  name: 'Delete Envelope',
  key: 'delete_envelope',
  description: `Permanently delete an envelope (document or template) from Documenso. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      envelopeId: z.string().describe('ID of the envelope to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    await client.deleteEnvelope(ctx.input.envelopeId);

    return {
      output: { success: true },
      message: `Deleted envelope \`${ctx.input.envelopeId}\`.`
    };
  })
  .build();
