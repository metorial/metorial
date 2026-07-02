import { SlateTool } from 'slates';
import { z } from 'zod';
import { PandaDocClient } from '../lib/client';
import { spec } from '../spec';

export let manageDocumentStatus = SlateTool.create(spec, {
  name: 'Change Document Status',
  key: 'change_document_status',
  description: `Manually change a PandaDoc document's status to completed, voided, or paid. Use this to force-complete documents, void/expire documents, or mark them as paid.`,
  constraints: [
    'Only the following status transitions are supported: completed (2), paid (10), voided (11).'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      documentId: z.string().describe('UUID of the document to update'),
      status: z
        .enum(['completed', 'paid', 'voided'])
        .describe('New status to set on the document')
    })
  )
  .output(
    z.object({
      documentId: z.string().describe('UUID of the updated document'),
      newStatus: z.string().describe('The new status that was set')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PandaDocClient({
      token: ctx.auth.token,
      authType: ctx.auth.authType
    });

    let statusMap: Record<string, number> = {
      completed: 2,
      paid: 10,
      voided: 11
    };

    let statusCode = statusMap[ctx.input.status]!;
    await client.changeDocumentStatus(ctx.input.documentId, statusCode);

    return {
      output: {
        documentId: ctx.input.documentId,
        newStatus: `document.${ctx.input.status}`
      },
      message: `Document \`${ctx.input.documentId}\` status changed to \`document.${ctx.input.status}\`.`
    };
  })
  .build();
