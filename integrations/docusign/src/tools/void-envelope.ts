import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let voidEnvelope = SlateTool.create(spec, {
  name: 'Void Envelope',
  key: 'void_envelope',
  description: `Voids (cancels) a DocuSign envelope that has been sent but not yet completed. All recipients are notified that the envelope has been voided. A reason must be provided.`,
  constraints: [
    'Only envelopes with status "sent" or "delivered" can be voided.',
    'Completed, declined, or already voided envelopes cannot be voided.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      envelopeId: z.string().describe('ID of the envelope to void'),
      voidedReason: z
        .string()
        .describe('Reason for voiding the envelope (visible to recipients)')
    })
  )
  .output(
    z.object({
      envelopeId: z.string().describe('ID of the voided envelope')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUri: ctx.auth.baseUri,
      accountId: ctx.auth.accountId
    });

    await client.voidEnvelope(ctx.input.envelopeId, ctx.input.voidedReason);

    return {
      output: {
        envelopeId: ctx.input.envelopeId
      },
      message: `Envelope **${ctx.input.envelopeId}** has been voided. Reason: "${ctx.input.voidedReason}"`
    };
  })
  .build();
