import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let distributeEnvelopeTool = SlateTool.create(spec, {
  name: 'Distribute Envelope',
  key: 'distribute_envelope',
  description: `Send an envelope to its recipients for signing. This transitions the envelope from DRAFT to PENDING status. Use **redistribute** to resend to recipients who haven't signed yet.`,
  instructions: [
    'The envelope must be in DRAFT status and have at least one recipient.',
    'Set redistribute to true to resend a previously distributed envelope.'
  ]
})
  .input(
    z.object({
      envelopeId: z.string().describe('ID of the envelope to distribute'),
      redistribute: z
        .boolean()
        .optional()
        .default(false)
        .describe('Set to true to redistribute (resend) an already distributed envelope')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the distribution succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    if (ctx.input.redistribute) {
      await client.redistributeEnvelope(ctx.input.envelopeId);
    } else {
      await client.distributeEnvelope(ctx.input.envelopeId);
    }

    return {
      output: { success: true },
      message: `${ctx.input.redistribute ? 'Redistributed' : 'Distributed'} envelope \`${ctx.input.envelopeId}\` to recipients.`
    };
  })
  .build();
