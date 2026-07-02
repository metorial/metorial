import { SlateTool } from 'slates';
import { z } from 'zod';
import { LinkedInClient } from '../lib/client';
import { spec } from '../spec';

let reactionTypeEnum = z
  .enum(['LIKE', 'PRAISE', 'EMPATHY', 'INTEREST', 'APPRECIATION', 'ENTERTAINMENT'])
  .describe('Type of reaction');

export let createReaction = SlateTool.create(spec, {
  name: 'Create Reaction',
  key: 'create_reaction',
  description: `Add a reaction (like, celebrate, support, love, insightful, funny) to a LinkedIn post on behalf of the authenticated member.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      postUrn: z.string().describe('URN of the post to react to'),
      actorUrn: z.string().describe('URN of the person or organization creating the reaction'),
      reactionType: reactionTypeEnum
    })
  )
  .output(
    z.object({
      reacted: z.boolean().describe('Whether the reaction was successfully created')
    })
  )
  .handleInvocation(async ctx => {
    let client = new LinkedInClient({ token: ctx.auth.token });
    await client.createReaction(ctx.input.postUrn, ctx.input.actorUrn, ctx.input.reactionType);

    return {
      output: { reacted: true },
      message: `Added **${ctx.input.reactionType}** reaction to post \`${ctx.input.postUrn}\` as \`${ctx.input.actorUrn}\`.`
    };
  })
  .build();

export let getReactions = SlateTool.create(spec, {
  name: 'Get Reactions',
  key: 'get_reactions',
  description: `Retrieve reactions on a LinkedIn post. Returns a paginated list of reactions with actor information and reaction types.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      postUrn: z.string().describe('URN of the post to get reactions for'),
      count: z.number().optional().describe('Number of reactions to return'),
      start: z.number().optional().describe('Pagination offset (0-based)')
    })
  )
  .output(
    z.object({
      reactions: z.array(
        z.object({
          actorUrn: z.string().describe('URN of the member who reacted'),
          reactionType: z.string().describe('Type of reaction (LIKE, PRAISE, EMPATHY, etc.)'),
          createdAt: z
            .number()
            .optional()
            .describe('Timestamp when the reaction was created (epoch ms)')
        })
      ),
      totalCount: z.number().optional().describe('Total number of reactions')
    })
  )
  .handleInvocation(async ctx => {
    let client = new LinkedInClient({ token: ctx.auth.token });

    let result = await client.getReactions(ctx.input.postUrn, {
      count: ctx.input.count,
      start: ctx.input.start
    });

    let reactions = result.elements.map(r => ({
      actorUrn: r.actor ?? r.created?.actor ?? r.lastModified?.actor ?? '',
      reactionType: r.reactionType,
      createdAt: r.created?.time
    }));

    return {
      output: {
        reactions,
        totalCount: result.paging?.total
      },
      message: `Retrieved **${reactions.length}** reactions on post \`${ctx.input.postUrn}\`.`
    };
  })
  .build();

export let deleteReaction = SlateTool.create(spec, {
  name: 'Delete Reaction',
  key: 'delete_reaction',
  description: `Remove a reaction from a LinkedIn post. Removes the authenticated member's reaction.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      postUrn: z.string().describe('URN of the post to remove the reaction from'),
      actorUrn: z.string().describe('URN of the member whose reaction to remove')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the reaction was successfully removed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new LinkedInClient({ token: ctx.auth.token });
    await client.deleteReaction(ctx.input.postUrn, ctx.input.actorUrn);

    return {
      output: { deleted: true },
      message: `Removed reaction from post \`${ctx.input.postUrn}\`.`
    };
  })
  .build();
