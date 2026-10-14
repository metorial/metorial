import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { businessIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let cancelDocument = SlateTool.create(spec, {
  name: 'Cancel Document',
  key: 'cancel_document',
  description: `Cancel an active document, move a document to trash, or permanently delete a cancelled or trashed document. Call list_businesses to discover the businessId.`,
  instructions: [
    'Use action "cancel" to cancel active documents.',
    'Use action "trash" to move documents to the trash.',
    'Cancel pending documents before deleting them. Trash completed or draft documents before deleting them.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      businessId: businessIdSchema,
      documentHash: z.string().describe('Unique hash identifier of the document'),
      action: z
        .enum(['cancel', 'trash', 'delete'])
        .describe('Action to perform on the document')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the action was successful'),
      documentHash: z.string().describe('Document hash that was acted upon'),
      action: z.string().describe('Action that was performed')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth, ctx.input.businessId);

    if (ctx.input.action === 'cancel') {
      await client.cancelDocument(ctx.input.documentHash);
    } else if (ctx.input.action === 'trash') {
      await client.trashDocument(ctx.input.documentHash);
    } else {
      await client.deleteDocument(ctx.input.documentHash);
    }

    return {
      output: {
        success: true,
        documentHash: ctx.input.documentHash,
        action: ctx.input.action
      },
      message: `Document "${ctx.input.documentHash}" has been ${ctx.input.action === 'cancel' ? 'cancelled' : ctx.input.action === 'trash' ? 'trashed' : 'deleted'}.`
    };
  })
  .build();
