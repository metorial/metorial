import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageDocument = SlateTool.create(spec, {
  name: 'Manage Document',
  key: 'manage_document',
  description: `Perform management actions on an existing document: revoke (cancel) a document in progress, send a reminder to pending signers, or permanently delete a document. Specify exactly one action to perform.`,
  instructions: [
    'Only one action (revoke, remind, or delete) can be performed per invocation.',
    'Revoking requires a message explaining the reason.',
    'Reminders can only be sent for documents with pending signers.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      documentId: z.string().describe('The ID of the document to manage'),
      action: z
        .enum(['revoke', 'remind', 'delete'])
        .describe('The action to perform on the document'),
      revokeMessage: z
        .string()
        .optional()
        .describe('Reason for revoking (required when action is "revoke")'),
      reminderMessage: z
        .string()
        .optional()
        .describe('Custom message to include with the reminder'),
      onBehalfOf: z
        .string()
        .optional()
        .describe('Perform the action on behalf of this email address')
    })
  )
  .output(
    z.object({
      documentId: z.string().describe('The document ID that was acted upon'),
      action: z.string().describe('The action that was performed'),
      success: z.boolean().describe('Whether the action was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let { documentId, action, revokeMessage, reminderMessage, onBehalfOf } = ctx.input;

    if (action === 'revoke') {
      if (!revokeMessage) {
        throw new Error('revokeMessage is required when action is "revoke"');
      }
      await client.revokeDocument(documentId, revokeMessage, onBehalfOf);
    } else if (action === 'remind') {
      await client.remindDocument(documentId, reminderMessage, onBehalfOf);
    } else if (action === 'delete') {
      await client.deleteDocument(documentId);
    }

    let actionLabels: Record<string, string> = {
      revoke: 'revoked',
      remind: 'reminder sent',
      delete: 'deleted'
    };

    return {
      output: {
        documentId,
        action,
        success: true
      },
      message: `Document **${documentId}** — ${actionLabels[action]}.`
    };
  })
  .build();
