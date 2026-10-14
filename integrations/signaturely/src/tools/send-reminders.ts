import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let sendReminders = SlateTool.create(spec, {
  name: 'Send Signer Reminders',
  key: 'send_reminders',
  description:
    'Send signing reminders to selected signers of a document. Call get_document_signers to discover signer IDs for the chosen document.',
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({
      documentId: z.string().min(1).describe('Document ID returned by list_documents'),
      signerIds: z
        .array(z.string().min(1))
        .describe('Signer IDs returned by get_document_signers for this document')
    })
  )
  .output(
    z.object({
      documentId: z.string().describe('Document receiving reminders'),
      signerIds: z.array(z.string()).describe('Signer IDs submitted to Signaturely')
    })
  )
  .handleInvocation(async ctx => {
    await new Client({ token: ctx.auth.token }).sendReminders(
      ctx.input.documentId,
      ctx.input.signerIds
    );
    return {
      output: { documentId: ctx.input.documentId, signerIds: ctx.input.signerIds },
      message: `Signaturely accepted reminders for ${ctx.input.signerIds.length} signer(s).`
    };
  })
  .build();
