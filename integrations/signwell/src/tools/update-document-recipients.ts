import { SlateTool } from 'slates';
import { z } from 'zod';
import { SignWellClient } from '../lib/client';
import { spec } from '../spec';

export let updateDocumentRecipients = SlateTool.create(spec, {
  name: 'Update Document Recipients',
  key: 'update_document_recipients',
  description: `Update a recipient's name or email on a sent document before they start signing. Existing values are retained when updating only one detail.`,
  instructions: [
    'Retrieve recipient IDs with get_document. The document must be sent, viewed, pending, or bounced, and each edited recipient must not have started signing.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      documentId: z.string().describe('ID of the document to update recipients on'),
      recipients: z
        .array(
          z.object({
            recipientId: z.string().describe('ID of the recipient to update'),
            name: z.string().optional().describe('Updated name for the recipient'),
            email: z.string().optional().describe('Updated email for the recipient')
          })
        )
        .describe('List of recipients with updated information')
    })
  )
  .output(
    z.object({
      documentId: z.string().describe('ID of the document'),
      recipients: z
        .array(
          z.object({
            recipientId: z.string().optional().describe('ID of the recipient'),
            name: z.string().optional().describe('Updated name'),
            email: z.string().optional().describe('Updated email'),
            status: z.string().optional().describe('Current signing status')
          })
        )
        .optional()
        .describe('Updated recipients list')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SignWellClient({ token: ctx.auth.token });

    let result = await client.updateDocumentRecipients(
      ctx.input.documentId,
      ctx.input.recipients
    );

    let output = {
      documentId: result.id || ctx.input.documentId,
      recipients: result.recipients?.map(r => ({
        recipientId: r.id ?? undefined,
        name: r.name ?? undefined,
        email: r.email ?? undefined,
        status: r.status ?? undefined
      }))
    };

    return {
      output,
      message: `Updated ${ctx.input.recipients.length} recipient(s) on document **${ctx.input.documentId}**.`
    };
  })
  .build();
