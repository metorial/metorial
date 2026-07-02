import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let addReactionTool = SlateTool.create(spec, {
  name: 'Add Reaction',
  key: 'add_reaction',
  description: `Add a reaction (positive, neutral, or negative) to a Beamer post. Optionally associate the reaction with a user.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      postId: z.number().describe('ID of the post to react to'),
      reaction: z.enum(['positive', 'neutral', 'negative']).describe('Type of reaction'),
      userId: z.string().optional().describe('User ID of the reactor'),
      userEmail: z.string().optional().describe('Email of the reactor'),
      userFirstname: z.string().optional().describe('First name of the reactor'),
      userLastname: z.string().optional().describe('Last name of the reactor')
    })
  )
  .output(
    z.object({
      reactionId: z.number().describe('Unique reaction ID'),
      date: z.string().describe('Reaction date (ISO-8601)'),
      reaction: z.string().describe('Reaction type (positive, neutral, or negative)'),
      postTitle: z.string().describe('Title of the post'),
      userId: z.string().nullable().describe('User ID'),
      userEmail: z.string().nullable().describe('User email')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let reaction = await client.createPostReaction(ctx.input.postId, {
      reaction: ctx.input.reaction,
      userId: ctx.input.userId,
      userEmail: ctx.input.userEmail,
      userFirstname: ctx.input.userFirstname,
      userLastname: ctx.input.userLastname
    });

    return {
      output: {
        reactionId: reaction.id,
        date: reaction.date,
        reaction: reaction.reaction,
        postTitle: reaction.postTitle,
        userId: reaction.userId,
        userEmail: reaction.userEmail
      },
      message: `Added **${ctx.input.reaction}** reaction to post **"${reaction.postTitle}"** (ID: ${ctx.input.postId}).`
    };
  })
  .build();
