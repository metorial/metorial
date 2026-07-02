import { SlateTool } from 'slates';
import { z } from 'zod';
import { HootsuiteClient } from '../lib/client';
import { spec } from '../spec';

export let manageMessageTool = SlateTool.create(spec, {
  name: 'Manage Message',
  key: 'manage_message',
  description: `Approve, reject, or delete a scheduled message.
Use **approve** or **reject** for messages in PENDING_APPROVAL state (requires the sequenceNumber from the message).
Use **delete** to remove a scheduled message entirely.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      messageId: z.string().describe('ID of the message to manage'),
      action: z
        .enum(['approve', 'reject', 'delete'])
        .describe('Action to perform on the message'),
      sequenceNumber: z
        .number()
        .optional()
        .describe('Sequence number (required for approve/reject)'),
      reason: z
        .string()
        .optional()
        .describe('Reason for rejection (only used with reject action)')
    })
  )
  .output(
    z.object({
      messageId: z.string().describe('ID of the managed message'),
      action: z.string().describe('Action that was performed'),
      success: z.boolean().describe('Whether the action succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HootsuiteClient(ctx.auth.token);
    let { messageId, action, sequenceNumber, reason } = ctx.input;

    if (action === 'delete') {
      await client.deleteMessage(messageId);
      return {
        output: { messageId, action: 'delete', success: true },
        message: `Deleted message **${messageId}**.`
      };
    }

    if (sequenceNumber === undefined) {
      throw new Error('sequenceNumber is required for approve/reject actions');
    }

    if (action === 'approve') {
      await client.approveMessage(messageId, sequenceNumber);
      return {
        output: { messageId, action: 'approve', success: true },
        message: `Approved message **${messageId}**.`
      };
    }

    await client.rejectMessage(messageId, sequenceNumber, reason);
    return {
      output: { messageId, action: 'reject', success: true },
      message: `Rejected message **${messageId}**${reason ? ` — reason: ${reason}` : ''}.`
    };
  })
  .build();
