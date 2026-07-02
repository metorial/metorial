import { SlateTool } from 'slates';
import { z } from 'zod';
import { TwitchClient } from '../lib/client';
import { spec } from '../spec';

export let getChannelInfo = SlateTool.create(spec, {
  name: 'Get Channel Info',
  key: 'get_channel_info',
  description: `Retrieve channel details including stream title, game/category, language, tags, and content labels. Can look up multiple channels at once.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      broadcasterIds: z
        .array(z.string())
        .describe('Broadcaster user IDs to get channel info for')
    })
  )
  .output(
    z.object({
      channels: z.array(
        z.object({
          broadcasterId: z.string(),
          broadcasterLogin: z.string(),
          broadcasterName: z.string(),
          language: z.string(),
          gameId: z.string(),
          gameName: z.string(),
          title: z.string(),
          delay: z.number(),
          tags: z.array(z.string()),
          contentClassificationLabels: z.array(z.string()),
          isBrandedContent: z.boolean()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new TwitchClient(ctx.auth.token, ctx.auth.clientId);
    let channels = await client.getChannelInfo(ctx.input.broadcasterIds);

    let mapped = channels.map(c => ({
      broadcasterId: c.broadcaster_id,
      broadcasterLogin: c.broadcaster_login,
      broadcasterName: c.broadcaster_name,
      language: c.broadcaster_language,
      gameId: c.game_id,
      gameName: c.game_name,
      title: c.title,
      delay: c.delay,
      tags: c.tags,
      contentClassificationLabels: c.content_classification_labels,
      isBrandedContent: c.is_branded_content
    }));

    return {
      output: { channels: mapped },
      message:
        mapped.length === 1 && mapped[0]
          ? `Channel **${mapped[0].broadcasterName}**: "${mapped[0].title}" playing ${mapped[0].gameName || 'N/A'}`
          : `Retrieved info for **${mapped.length}** channels`
    };
  })
  .build();
