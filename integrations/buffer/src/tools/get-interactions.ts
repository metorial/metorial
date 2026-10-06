import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getInteractionsTool = SlateTool.create(spec, {
  name: 'Get Interactions',
  key: 'get_interactions',
  description: `Read individual interaction records through the retained legacy REST contract. This is not available through the current API; legacy availability and event support depend on the provider. Current aggregate metrics can be requested through Get Updates with a personal API key.`,
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
      total: z.number().optional().describe('Total supplied by the provider, when available'),
      returnedCount: z.number().describe('Number of records returned in this response'),
      interactions: z
        .array(
          z.object({
            interactionId: z.string().describe('Unique ID of the interaction'),
            event: z.string().describe('Type of interaction'),
            createdAt: z
              .number()
              .optional()
              .describe('Unix timestamp supplied by the provider'),
            username: z.string().optional().describe('Username when supplied'),
            avatar: z.string().optional().describe('Avatar URL when supplied'),
            followers: z.number().optional().describe('Follower count when supplied')
          })
        )
        .describe('List of interactions')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);

    let result = await client.getInteractions(ctx.input.updateId, ctx.input.event, {
      page: ctx.input.page,
      count: ctx.input.count
    });

    let interactions = result.interactions.map(i => ({
      interactionId: i.id,
      event: i.event,
      createdAt: i.createdAt,
      username: i.username,
      avatar: i.avatar,
      followers: i.followers
    }));

    return {
      output: {
        total: result.total,
        returnedCount: interactions.length,
        interactions
      },
      message: `Retrieved **${interactions.length}** interaction(s) for update **${ctx.input.updateId}**.`
    };
  })
  .build();
