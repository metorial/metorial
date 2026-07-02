import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let duplicateEnvelopeTool = SlateTool.create(spec, {
  name: 'Duplicate Envelope',
  key: 'duplicate_envelope',
  description: `Create a copy of an existing envelope. The duplicate will be in DRAFT status with the same documents, recipients, and fields as the original.`
})
  .input(
    z.object({
      envelopeId: z.string().describe('ID of the envelope to duplicate')
    })
  )
  .output(
    z.object({
      envelopeId: z.string().describe('ID of the newly created duplicate envelope')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.duplicateEnvelope(ctx.input.envelopeId);
    let envelopeId = String(result.id ?? result.envelopeId ?? '');

    return {
      output: { envelopeId },
      message: `Duplicated envelope \`${ctx.input.envelopeId}\` as new envelope \`${envelopeId}\`.`
    };
  })
  .build();
