import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageSigner = SlateTool.create(spec, {
  name: 'Manage Signer',
  key: 'manage_signer',
  description: `Send a signing reminder to a signer or reassign a document's signing responsibility to a different person. Email notifications are sent automatically for both actions.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      documentHash: z.string().describe('Unique hash identifier of the document'),
      signerId: z.number().describe('ID of the signer within the document'),
      action: z
        .enum(['remind', 'reassign'])
        .describe('Action to perform: send a reminder or reassign to a new signer'),
      newSignerName: z.string().optional().describe('New signer name (required for reassign)'),
      newSignerEmail: z
        .string()
        .optional()
        .describe('New signer email (required for reassign)'),
      reason: z.string().optional().describe('Reason for reassignment')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the action was successful'),
      documentHash: z.string().describe('Document hash'),
      action: z.string().describe('Action that was performed')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);

    if (ctx.input.action === 'remind') {
      await client.sendReminder(ctx.input.documentHash, ctx.input.signerId);
    } else {
      if (!ctx.input.newSignerName || !ctx.input.newSignerEmail) {
        throw new Error('newSignerName and newSignerEmail are required for reassignment');
      }
      await client.reassignSigner(
        ctx.input.documentHash,
        ctx.input.signerId,
        ctx.input.newSignerName,
        ctx.input.newSignerEmail,
        ctx.input.reason
      );
    }

    return {
      output: {
        success: true,
        documentHash: ctx.input.documentHash,
        action: ctx.input.action
      },
      message:
        ctx.input.action === 'remind'
          ? `Reminder sent to signer #${ctx.input.signerId} on document "${ctx.input.documentHash}".`
          : `Signer #${ctx.input.signerId} reassigned to ${ctx.input.newSignerName} (${ctx.input.newSignerEmail}) on document "${ctx.input.documentHash}".`
    };
  })
  .build();
