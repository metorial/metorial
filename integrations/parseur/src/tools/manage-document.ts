import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageDocument = SlateTool.create(spec, {
  name: 'Manage Document',
  key: 'manage_document',
  description: `Perform actions on a document: reprocess it (re-parse), skip it, copy it to another mailbox, or delete it. Use this to manage document lifecycle after upload.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      documentId: z.number().describe('ID of the document'),
      action: z
        .enum(['reprocess', 'skip', 'copy', 'delete'])
        .describe('Action to perform on the document'),
      targetMailboxId: z
        .number()
        .optional()
        .describe('Target mailbox ID (required for copy action)')
    })
  )
  .output(
    z.object({
      documentId: z.number().describe('Document ID'),
      action: z.string().describe('Action that was performed'),
      success: z.boolean().describe('Whether the action succeeded'),
      resultMessage: z.string().describe('Status message from the action')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { documentId, action, targetMailboxId } = ctx.input;

    let resultMessage = '';

    switch (action) {
      case 'reprocess': {
        let result = await client.reprocessDocument(documentId);
        resultMessage = result.message || 'Document queued for reprocessing';
        break;
      }
      case 'skip': {
        await client.skipDocument(documentId);
        resultMessage = 'Document marked as skipped';
        break;
      }
      case 'copy': {
        if (!targetMailboxId) {
          throw new Error('targetMailboxId is required for copy action');
        }
        let result = await client.copyDocument(documentId, targetMailboxId);
        resultMessage = result.message || `Document copied to mailbox ${targetMailboxId}`;
        break;
      }
      case 'delete': {
        await client.deleteDocument(documentId);
        resultMessage = 'Document deleted';
        break;
      }
    }

    return {
      output: {
        documentId,
        action,
        success: true,
        resultMessage
      },
      message: `**${action}** performed on document ${documentId}: ${resultMessage}`
    };
  })
  .build();
