import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getReactions = SlateTool.create(spec, {
  name: 'Get Reactions',
  key: 'get_reactions',
  description:
    'List visible Facebook reactions for a post, comment, photo, video, or other object that supports the Graph API reactions edge.',
  instructions: [
    'Provide `objectId` for the post, comment, photo, or video.',
    'Use `reactionType` to filter to a specific reaction type when needed.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      objectId: z.string().describe('Facebook object ID to list reactions for'),
      reactionType: z
        .enum(['LIKE', 'LOVE', 'WOW', 'HAHA', 'SAD', 'ANGRY', 'CARE'])
        .optional()
        .describe('Optional reaction type filter'),
      limit: z.number().optional().describe('Maximum reactions to return (default: 25)'),
      after: z.string().optional().describe('Pagination cursor')
    })
  )
  .output(
    z.object({
      reactions: z
        .array(
          z.object({
            userId: z.string().describe('Reacting user ID'),
            name: z.string().optional().describe('Reacting user name'),
            type: z.string().optional().describe('Reaction type')
          })
        )
        .describe('Visible reactions'),
      nextCursor: z.string().optional().describe('Cursor for fetching the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiVersion: ctx.config.apiVersion
    });

    let result = await client.getReactions(ctx.input.objectId, {
      limit: ctx.input.limit,
      after: ctx.input.after,
      type: ctx.input.reactionType
    });

    return {
      output: {
        reactions: result.data.map(reaction => ({
          userId: reaction.id,
          name: reaction.name,
          type: reaction.type
        })),
        nextCursor: result.paging?.cursors?.after
      },
      message: `Retrieved **${result.data.length}** reaction(s).`
    };
  })
  .build();
