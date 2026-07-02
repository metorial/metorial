import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let recipientSchema = z.object({
  emailAddress: z.object({
    name: z.string().optional(),
    address: z.string()
  })
});

export let manageReplyDraft = SlateTool.create(spec, {
  name: 'Manage Reply Draft',
  key: 'manage_reply_draft',
  description:
    'Conversation-native reply drafting via Graph **createReply** / **createReplyAll** (creates a real draft message), then **patch** or **delete** that draft. Prefer this over raw compose when replying in a thread.',
  instructions: [
    'After **create_reply_draft** or **create_reply_all_draft**, use **update_draft** with the returned **draftMessageId**.',
    'Send the finished draft with **Send Reply** (`send_draft` mode).'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.discriminatedUnion('operation', [
      z.object({
        operation: z.literal('create_reply_draft'),
        sourceMessageId: z.string().describe('Message to reply to')
      }),
      z.object({
        operation: z.literal('create_reply_all_draft'),
        sourceMessageId: z.string().describe('Message to reply all to')
      }),
      z.object({
        operation: z.literal('update_draft'),
        draftMessageId: z.string(),
        subject: z.string().optional(),
        bodyContent: z.string().optional(),
        bodyContentType: z.enum(['text', 'html']).optional(),
        toRecipients: z.array(recipientSchema).optional(),
        ccRecipients: z.array(recipientSchema).optional(),
        bccRecipients: z.array(recipientSchema).optional(),
        importance: z.enum(['low', 'normal', 'high']).optional()
      }),
      z.object({
        operation: z.literal('delete_draft'),
        draftMessageId: z.string()
      })
    ])
  )
  .output(
    z.object({
      draftMessageId: z.string().optional(),
      webLink: z.string().optional(),
      success: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let input = ctx.input;

    switch (input.operation) {
      case 'create_reply_draft': {
        let draft = await client.createReplyDraft(input.sourceMessageId);
        return {
          output: {
            draftMessageId: draft.id,
            webLink: draft.webLink,
            success: true
          },
          message: `Created reply draft **${draft.id}**.`
        };
      }
      case 'create_reply_all_draft': {
        let draft = await client.createReplyAllDraft(input.sourceMessageId);
        return {
          output: {
            draftMessageId: draft.id,
            webLink: draft.webLink,
            success: true
          },
          message: `Created reply-all draft **${draft.id}**.`
        };
      }
      case 'delete_draft': {
        await client.deleteMessage(input.draftMessageId);
        return {
          output: { success: true },
          message: `Deleted draft **${input.draftMessageId}**.`
        };
      }
      case 'update_draft': {
        let updates: {
          subject?: string;
          body?: { contentType: 'text' | 'html'; content: string };
          toRecipients?: z.infer<typeof recipientSchema>[];
          ccRecipients?: z.infer<typeof recipientSchema>[];
          bccRecipients?: z.infer<typeof recipientSchema>[];
          importance?: 'low' | 'normal' | 'high';
        } = {};
        if (input.subject !== undefined) {
          updates.subject = input.subject;
        }
        if (input.bodyContent !== undefined) {
          updates.body = {
            contentType: input.bodyContentType ?? 'html',
            content: input.bodyContent
          };
        }
        if (input.toRecipients) {
          updates.toRecipients = input.toRecipients;
        }
        if (input.ccRecipients) {
          updates.ccRecipients = input.ccRecipients;
        }
        if (input.bccRecipients) {
          updates.bccRecipients = input.bccRecipients;
        }
        if (input.importance) {
          updates.importance = input.importance;
        }

        let updated = await client.updateMessage(input.draftMessageId, updates);
        return {
          output: {
            draftMessageId: updated.id,
            webLink: updated.webLink,
            success: true
          },
          message: `Updated draft **${input.draftMessageId}**.`
        };
      }
    }
  })
  .build();
