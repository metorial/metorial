import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listReactionsTool = SlateTool.create(spec, {
  name: 'List Reactions',
  key: 'list_reactions',
  description:
    'List reactions to a Beamer post, including reaction IDs, user attribution, dates, and dashboard URLs. Supports reaction and date filters and pagination.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      postId: z.number().describe('Post ID from list_posts or create_post'),
      reaction: z
        .enum(['positive', 'neutral', 'negative'])
        .optional()
        .describe('Reaction type to retrieve'),
      dateFrom: z.string().optional().describe('Reactions after this date (ISO-8601)'),
      dateTo: z.string().optional().describe('Reactions before this date (ISO-8601)'),
      maxResults: z.number().optional().describe('Maximum reactions per page, from 1 to 10'),
      page: z.number().optional().describe('Nonnegative whole-number page index')
    })
  )
  .output(
    z.object({
      reactions: z.array(
        z.object({
          reactionId: z.number(),
          date: z.string(),
          reaction: z.string(),
          postTitle: z.string(),
          userId: z.string().nullable(),
          userEmail: z.string().nullable(),
          userFirstName: z.string().nullable(),
          userLastName: z.string().nullable(),
          url: z.string().nullable()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let { postId, ...params } = ctx.input;
    let reactions = await new Client({ token: ctx.auth.token }).listPostReactions(
      postId,
      params
    );
    let output = reactions.map(reaction => ({
      reactionId: reaction.id,
      date: reaction.date,
      reaction: reaction.reaction,
      postTitle: reaction.postTitle,
      userId: reaction.userId,
      userEmail: reaction.userEmail,
      userFirstName: reaction.userFirstName,
      userLastName: reaction.userLastName,
      url: reaction.url
    }));
    return {
      output: { reactions: output },
      message: `Found **${output.length}** reaction(s).`
    };
  })
  .build();
