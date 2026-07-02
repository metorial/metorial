import { SlateTool } from 'slates';
import { z } from 'zod';
import { TrelloClient } from '../lib/client';
import { spec } from '../spec';

export let addComment = SlateTool.create(spec, {
  name: 'Add Comment',
  key: 'add_comment',
  description: `Add a comment to a Trello card. Comments support markdown formatting.`
})
  .input(
    z.object({
      cardId: z.string().describe('ID of the card to comment on'),
      text: z.string().describe('Comment text (supports markdown)')
    })
  )
  .output(
    z.object({
      commentId: z.string().describe('ID of the created comment action'),
      cardId: z.string().describe('Card the comment was added to'),
      text: z.string().describe('Comment text'),
      memberCreatorId: z
        .string()
        .optional()
        .describe('ID of the member who created the comment'),
      createdAt: z.string().optional().describe('When the comment was created')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TrelloClient({ apiKey: ctx.auth.apiKey, token: ctx.auth.token });

    let comment = await client.addComment(ctx.input.cardId, ctx.input.text);

    return {
      output: {
        commentId: comment.id,
        cardId: ctx.input.cardId,
        text: comment.data?.text || ctx.input.text,
        memberCreatorId: comment.idMemberCreator,
        createdAt: comment.date
      },
      message: `Added comment to card \`${ctx.input.cardId}\`.`
    };
  })
  .build();
