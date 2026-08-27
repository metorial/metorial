import { SlateTool } from 'slates';
import { z } from 'zod';
import { SlackClient } from '../lib/client';
import { spec } from '../spec';

export let getMessagePermalink = SlateTool.create(spec, {
  name: 'Get Message Permalink',
  key: 'get_message_permalink',
  description:
    'Get a stable Slack permalink for a known message so users and downstream workflows can open it directly.',
  instructions: [
    'Provide the conversation ID and exact Slack message timestamp returned by another message or search tool.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      channelId: z.string().min(1).describe('Slack conversation ID containing the message'),
      messageTs: z.string().min(1).describe('Exact Slack message timestamp')
    })
  )
  .output(
    z.object({
      channelId: z.string().describe('Slack conversation ID containing the message'),
      messageTs: z.string().describe('Slack message timestamp'),
      permalink: z.string().describe('Stable URL that opens the message in Slack')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SlackClient(ctx.auth.token);
    let permalink = await client.getPermalink({
      channel: ctx.input.channelId,
      messageTs: ctx.input.messageTs
    });

    return {
      output: {
        channelId: ctx.input.channelId,
        messageTs: ctx.input.messageTs,
        permalink
      },
      message: `Retrieved the Slack permalink for message \`${ctx.input.messageTs}\` in \`${ctx.input.channelId}\`.`
    };
  })
  .build();
