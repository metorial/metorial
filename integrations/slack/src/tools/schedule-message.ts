import { SlateTool } from 'slates';
import { z } from 'zod';
import { SlackClient } from '../lib/client';
import { slackActionScopes } from '../lib/scopes';
import { spec } from '../spec';

export let scheduleMessage = SlateTool.create(spec, {
  name: 'Schedule Message',
  key: 'schedule_message',
  description: `Schedule a message to be sent to a Slack channel at a future time. The message will be delivered automatically at the specified time.`,
  constraints: ['The post_at time must be in the future and within 120 days.'],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .scopes(slackActionScopes.chatWrite)
  .input(
    z.object({
      channelId: z.string().describe('Channel ID to send the scheduled message to'),
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
