import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { clientConfig, invalid } from '../lib/validation';
import { spec } from '../spec';

export let distributeEnvelopeTool = SlateTool.create(spec, {
  name: 'Distribute Envelope',
  key: 'distribute_envelope',
  description: `Send an envelope to its recipients for signing. This transitions the envelope from DRAFT to PENDING status. Use **redistribute** to resend to recipients who haven't signed yet.`,
  tags: { readOnly: false },
  instructions: [
    'The envelope must be in DRAFT status and have at least one recipient.',
    'Redistribution requires PENDING status. Omitted recipientIds selects all unsigned recipients in this envelope; sends cannot be recalled.'
  ]
})
  .input(
    z.object({
      envelopeId: z.string().describe('ID of the envelope to distribute'),
      redistribute: z
        .boolean()
        .optional()
        .default(false)
        .describe('Set to true to redistribute (resend) an already distributed envelope'),
      recipientIds: z
        .array(z.number())
        .optional()
        .describe(
          'Distinct unsigned recipient IDs for redistribution; omitted selects all unsigned recipients'
        )
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the distribution succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(clientConfig(ctx));

    if (!ctx.input.redistribute && ctx.input.recipientIds !== undefined)
      throw invalid('recipientIds applies only to redistribution.');
    if (ctx.input.redistribute) {
      await client.redistributeEnvelope(ctx.input.envelopeId, ctx.input.recipientIds);
    } else {
      await client.distributeEnvelope(ctx.input.envelopeId);
    }

    return {
      output: { success: true },
      message: `${ctx.input.redistribute ? 'Redistributed' : 'Distributed'} envelope \`${ctx.input.envelopeId}\`. Documenso accepted the send request; this does not prove email delivery.`
    };
  })
  .build();
