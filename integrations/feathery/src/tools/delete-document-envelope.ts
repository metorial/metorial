import { SlateTool } from 'slates';
import { z } from 'zod';
import { FeatheryClient } from '../lib/client';
import { spec } from '../spec';

export let deleteDocumentEnvelope = SlateTool.create(spec, {
  name: 'Delete Document Envelope',
  key: 'delete_document_envelope',
  description:
    'Delete a generated document envelope. Use list_document_envelopes to discover its ID.',
  tags: { destructive: true }
})
  .input(
    z.object({
      envelopeId: z.string().describe('Envelope ID returned by list_document_envelopes')
    })
  )
  .output(z.object({ envelopeId: z.string(), deleted: z.boolean() }))
  .handleInvocation(async ctx => {
    let client = new FeatheryClient({
      token: ctx.auth.token,
      region:
        ctx.auth.region ??
        ('region' in ctx.config && typeof ctx.config.region === 'string'
          ? ctx.config.region
          : undefined)
    });
    await client.deleteDocumentEnvelope(ctx.input.envelopeId);
    return {
      output: { envelopeId: ctx.input.envelopeId, deleted: true },
      message: `Deleted document envelope **${ctx.input.envelopeId}**.`
    };
  })
  .build();
