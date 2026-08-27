import { SlateTool } from 'slates';
import { z } from 'zod';
import { SlackClient } from '../lib/client';
import { missingRequiredAlternativeError, slackServiceError } from '../lib/errors';
import { slackActionScopes } from '../lib/scopes';
import { spec } from '../spec';

const MAX_SCHEDULED_MESSAGE_SECONDS = 120 * 24 * 60 * 60;

const hasMessageContent = (text?: string, blocks?: unknown[]) =>
  (typeof text === 'string' && text.trim().length > 0) ||
  (Array.isArray(blocks) && blocks.length > 0);

export let scheduleMessage = SlateTool.create(spec, {
  name: 'Schedule Message',
  key: 'schedule_message',
  description: `Schedule a message to be sent to a Slack channel at a future time. The message will be delivered automatically at the specified time.`,
  constraints: ['The post_at time must be in the future and within 120 days.'],
  tags: {
    destructive: false,
    readOnly: false
  },
  instructions: [
    'Use the Slack conversation ID, such as C..., G..., or D...; do not pass a channel name like #general.',
    'Provide either text or at least one Block Kit block.'
  ]
})
  .scopes(slackActionScopes.chatWrite)
  .input(
    z.object({
      channelId: z
        .string()
        .describe(
          'Slack conversation ID to send the scheduled message to, such as C..., G..., or D...; do not pass a channel name like #general'
        ),
      postAt: z.number().describe('Unix timestamp (in seconds) for when to send the message'),
      text: z.string().optional().describe('Message text (supports Slack mrkdwn formatting)'),
      blocks: z.array(z.any()).optional().describe('Array of Block Kit block objects'),
      threadTs: z
        .string()
        .optional()
        .describe('Timestamp of a parent message to reply in a thread')
    })
  )
  .output(
    z.object({
      scheduledMessageId: z.string().describe('ID of the scheduled message'),
      postAt: z.number().describe('Unix timestamp when the message will be sent'),
      channelId: z.string().describe('Channel ID where the message will be sent')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SlackClient(ctx.auth.token);

    if (!hasMessageContent(ctx.input.text, ctx.input.blocks)) {
      throw missingRequiredAlternativeError(
        'Either text or at least one Block Kit block must be provided'
      );
    }

    let now = Math.floor(Date.now() / 1000);
    if (ctx.input.postAt <= now) {
      throw slackServiceError('postAt must be a Unix timestamp in the future');
    }
    if (ctx.input.postAt > now + MAX_SCHEDULED_MESSAGE_SECONDS) {
      throw slackServiceError('postAt must be within 120 days');
    }

    let result = await client.scheduleMessage({
      channel: ctx.input.channelId,
      postAt: ctx.input.postAt,
      text: ctx.input.text,
      blocks: ctx.input.blocks,
      threadTs: ctx.input.threadTs
    });

    let scheduledDate = new Date(result.postAt * 1000).toISOString();

    return {
      output: {
        scheduledMessageId: result.scheduledMessageId,
        postAt: result.postAt,
        channelId: ctx.input.channelId
      },
      message: `Scheduled message for **${scheduledDate}** in channel \`${ctx.input.channelId}\`.`
    };
  })
  .build();
