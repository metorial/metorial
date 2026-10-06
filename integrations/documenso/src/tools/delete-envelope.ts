import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { clientConfig } from '../lib/validation';
import { spec } from '../spec';

export let deleteEnvelopeTool = SlateTool.create(spec, {
  name: 'Delete Envelope',
  key: 'delete_envelope',
  description: `Delete a document or template envelope through Documenso. Completed envelopes cannot be deleted. Draft/pending documents and templates may be permanently removed together with their native audit records. Deletion can emit webhooks or cancellation notifications; it does not revoke previously delivered files or external history.`,
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
    let client = new Client(clientConfig(ctx));

    await client.deleteEnvelope(ctx.input.envelopeId);

    return {
      output: { success: true },
      message: `Deleted envelope \`${ctx.input.envelopeId}\`.`
    };
  })
  .build();
