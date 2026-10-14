import { SlateTool } from 'slates';
import { z } from 'zod';
import { BoloFormsClient } from '../lib/client';
import { documentActionInputSchema, documentActionOutputSchema } from '../lib/schemas';
import { spec } from '../spec';

export let voidDocument = SlateTool.create(spec, {
  name: 'Void Signing Document',
  key: 'void_document',
  description:
    'Void an in-progress single-signature PDF or a PDF template respondent document. Returns the document identifier and void status. Already-voided documents can be submitted again safely.',
  constraints: ['SIGNED, PAID, DECLINED, EXPIRED, and DELETED documents cannot be voided.'],
  tags: { destructive: true }
})
  .input(documentActionInputSchema)
  .output(
    documentActionOutputSchema.extend({
      status: z.string().nullish(),
      isVoid: z.boolean().nullish()
    })
  )
  .handleInvocation(async ctx => {
    let client = new BoloFormsClient({ token: ctx.auth.token });
    let result = await client.voidDocument(ctx.input);
    return {
      output: result,
      message: result.message || 'Document void request completed.'
    };
  })
  .build();
