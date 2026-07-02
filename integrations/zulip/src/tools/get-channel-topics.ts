import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getChannelTopics = SlateTool.create(spec, {
  name: 'Get Channel Topics',
  key: 'get_channel_topics',
  description: `List all topics in a Zulip channel, ordered by most recent activity. Useful for exploring what's being discussed in a channel.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      channelId: z.number().describe('ID of the channel to get topics for')
    })
  )
  .output(
    z.object({
      topics: z
        .array(
          z.object({
            name: z.string().describe('Topic name'),
            maxMessageId: z.number().describe('ID of the most recent message in the topic')
          })
        )
        .describe('Topics in the channel, ordered by most recent activity')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      serverUrl: ctx.auth.serverUrl,
      email: ctx.auth.email,
      token: ctx.auth.token
    });

    let result = await client.getTopicsInChannel(ctx.input.channelId);

    let topics = (result.topics || []).map((t: any) => ({
      name: t.name,
      maxMessageId: t.max_id
    }));

    return {
      output: { topics },
      message: `Found ${topics.length} topic(s) in channel ${ctx.input.channelId}`
    };
  })
  .build();
