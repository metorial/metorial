import { SlateTool } from 'slates';
import { z } from 'zod';
import { SlackClient } from '../lib/client';
import { missingRequiredFieldError } from '../lib/errors';
import { slackActionScopes } from '../lib/scopes';
import { spec } from '../spec';

export let sendMessage = SlateTool.create(spec, {
  name: 'Send Message',
  key: 'send_message',
  description: `Send a message to a Slack channel, group DM, or direct message conversation. Supports plain text, rich Block Kit formatting, threaded replies, and ephemeral messages visible only to a specific user.`,
  instructions: [
    'Provide either **text** or **blocks** (or both). If only blocks are provided, include text as a fallback for notifications.',
    'To reply in a thread, set **threadTs** to the parent message timestamp.',
    'For ephemeral messages, set **ephemeral** to true and provide a **targetUserId**.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .scopes(slackActionScopes.chatWrite)
  .input(
    z.object({
      channelId: z.string().describe('Channel, DM, or group DM ID to send the message to'),
      text: z.string().optional().describe('Message text (supports Slack mrkdwn formatting)'),
      blocks: z
        .array(z.any())
        .optional()
        .describe('Array of Block Kit block objects for rich message layouts'),
      threadTs: z
        .string()
        .optional()
        .describe('Timestamp of a parent message to reply in a thread'),
      replyBroadcast: z
        .boolean()
        .optional()
        .describe('When replying in a thread, also post to the channel'),
      unfurlLinks: z.boolean().optional().describe('Enable or disable link unfurling'),
      unfurlMedia: z.boolean().optional().describe('Enable or disable media unfurling'),
      ephemeral: z
        .boolean()
        .optional()
        .describe('If true, send an ephemeral message visible only to targetUserId'),
      targetUserId: z
        .string()
        .optional()
        .describe('User ID for ephemeral messages (required when ephemeral is true)')
    })
  )
  .output(
    z.object({
      messageTs: z.string().describe('Timestamp identifier of the sent message'),
      channelId: z.string().describe('Channel ID where the message was sent')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SlackClient(ctx.auth.token);

    if (ctx.input.ephemeral) {
      if (!ctx.input.targetUserId) {
        throw missingRequiredFieldError('targetUserId', 'ephemeral messages');
      }
      let messageTs = await client.postEphemeral({
        channel: ctx.input.channelId,
        user: ctx.input.targetUserId,
        text: ctx.input.text,
        blocks: ctx.input.blocks,
        threadTs: ctx.input.threadTs
      });
      return {
        output: {
          messageTs,
          channelId: ctx.input.channelId
        },
        message: `Sent ephemeral message to user \`${ctx.input.targetUserId}\` in channel \`${ctx.input.channelId}\`.`
      };
    }

    let message = await client.postMessage({
      channel: ctx.input.channelId,
      text: ctx.input.text,
      blocks: ctx.input.blocks,
      threadTs: ctx.input.threadTs,
      replyBroadcast: ctx.input.replyBroadcast,
      unfurlLinks: ctx.input.unfurlLinks,
      unfurlMedia: ctx.input.unfurlMedia
    });

    return {
      output: {
        messageTs: message.ts,
        channelId: message.channel || ctx.input.channelId
      },
      message: ctx.input.threadTs
        ? `Sent threaded reply in channel \`${ctx.input.channelId}\`.`
        : `Sent message to channel \`${ctx.input.channelId}\`.`
    };
  })
  .build();
