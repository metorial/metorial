import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { RedditClient } from '../lib/client';
import { requireRedditArrayInput, requireRedditInput } from '../lib/errors';
import { spec } from '../spec';

export let manageMessages = SlateTool.create(spec, {
  name: 'Manage Messages',
  key: 'manage_messages',
  description: `Send private messages, read your inbox or unread messages, and mark messages as read or unread.
Supports retrieving inbox, unread, and sent message folders.`,
  instructions: [
    'Use action "send" with a recipient username, subject, and message body to send a new private message.',
    'Use action "list" to retrieve messages from inbox, unread, or sent folders.',
    'Use action "mark_read" or "mark_unread" with message fullnames to update read status.'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['send', 'list', 'mark_read', 'mark_unread'])
        .describe('Action to perform'),
      recipientUsername: z
        .string()
        .optional()
        .describe('Recipient username for sending messages'),
      subject: z
        .string()
        .max(100)
        .optional()
        .describe('Message subject (required for send, max 100 characters)'),
      text: z
        .string()
        .optional()
        .describe('Message body text (required for send, markdown supported)'),
      folder: z
        .enum(['inbox', 'unread', 'sent'])
        .optional()
        .describe('Message folder to list (default: inbox)'),
      messageIds: z
        .array(z.string())
        .optional()
        .describe('Message fullnames for mark_read/mark_unread actions'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe('Maximum number of messages to return (max 100)')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the action was successful'),
      messages: z
        .array(
          z.object({
            messageId: z.string().describe('Message fullname'),
            author: z.string().optional().describe('Author username'),
            recipient: z.string().optional().describe('Recipient username'),
            subject: z.string().optional().describe('Message subject'),
            body: z.string().optional().describe('Message body'),
            createdAt: z.string().optional().describe('When the message was sent'),
            isNew: z.boolean().optional().describe('Whether the message is unread')
          })
        )
        .optional()
        .describe('List of messages (for list action)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RedditClient(ctx.auth.token);
    let { action } = ctx.input;

    if (action === 'send') {
      await client.sendMessage({
        to: requireRedditInput(
          ctx.input.recipientUsername,
          'recipientUsername is required for send action'
        ),
        subject: requireRedditInput(ctx.input.subject, 'subject is required for send action'),
        text: requireRedditInput(ctx.input.text, 'text is required for send action')
      });

      return {
        output: {
          success: true
        },
        message: `Message sent to u/${ctx.input.recipientUsername} with subject "${ctx.input.subject}".`
      };
    }

    if (action === 'mark_read') {
      let messageIds = requireRedditArrayInput(
        ctx.input.messageIds,
        'messageIds is required for mark_read action'
      ) as string[];
      await client.markMessagesRead(messageIds);
      return {
        output: {
          success: true
        },
        message: `Marked ${messageIds.length} message(s) as read.`
      };
    }

    if (action === 'mark_unread') {
      let messageIds = requireRedditArrayInput(
        ctx.input.messageIds,
        'messageIds is required for mark_unread action'
      ) as string[];
      await client.markMessagesUnread(messageIds);
      return {
        output: {
          success: true
        },
        message: `Marked ${messageIds.length} message(s) as unread.`
      };
    }

    // list action
    let folder = ctx.input.folder ?? 'inbox';
    let data: any;
    let params = { limit: ctx.input.limit ?? 25 };

    if (folder === 'unread') {
      data = await client.getUnread(params);
    } else if (folder === 'sent') {
      data = await client.getSent(params);
    } else {
      data = await client.getInbox(params);
    }

    let children = data?.data?.children ?? [];
    let messages = children.map((c: any) => {
      let d = c.data;
      return {
        messageId: d.name,
        author: d.author,
        recipient: d.dest,
        subject: d.subject,
        body: d.body,
        createdAt: d.created_utc ? new Date(d.created_utc * 1000).toISOString() : undefined,
        isNew: d.new
      };
    });

    return {
      output: {
        success: true,
        messages
      },
      message: `Retrieved ${messages.length} messages from ${folder}.`
    };
  })
  .build();
