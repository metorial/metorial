import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getInteractionsTool = SlateTool.create(spec, {
  name: 'Get Interactions',
  key: 'get_interactions',
  description: `Retrieve social media interactions (mentions, retweets, likes, comments, etc.) for a sent update. Supported interaction types vary by social network.`,
  instructions: [
    'Common event types include: "retweet", "favorite", "mention", "comment", "like", "reshare". Available types depend on the social network.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      updateId: z.string().describe('ID of the sent update to get interactions for'),
      event: z
        .string()
        .describe(
          'Type of interaction to retrieve (e.g. "retweet", "favorite", "mention", "comment", "like", "reshare")'
        ),
      page: z.number().optional().describe('Page number for pagination'),
      count: z.number().optional().describe('Number of interactions to return per page')
    })
  )
  .output(
    z.object({
      total: z.number().describe('Total number of interactions of this type'),
      interactions: z
        .array(
          z.object({
            interactionId: z.string().describe('Unique ID of the interaction'),
            event: z.string().describe('Type of interaction'),
            createdAt: z.number().describe('Unix timestamp of the interaction'),
            username: z.string().describe('Username of the person who interacted'),
            avatar: z.string().describe('Avatar URL of the person who interacted'),
            followers: z.number().describe('Follower count of the person who interacted')
          })
        )
        .describe('List of interactions')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getInteractions(ctx.input.updateId, ctx.input.event, {
      page: ctx.input.page,
      count: ctx.input.count
    });

    let interactions = (result.interactions || []).map(i => ({
      interactionId: i.interactionId || i.id,
      event: i.event,
      createdAt: i.createdAt,
      username: i.user?.username || '',
      avatar: i.user?.avatarHttps || i.user?.avatar || '',
      followers: i.user?.followers || 0
    }));

    return {
      output: {
        total: result.total,
        interactions
      },
      message: `Retrieved **${interactions.length}** "${ctx.input.event}" interaction(s) for update **${ctx.input.updateId}** (${result.total} total).`
    };
  })
  .build();
