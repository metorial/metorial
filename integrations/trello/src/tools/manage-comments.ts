import { SlateTool } from 'slates';
import { z } from 'zod';
import { TrelloClient } from '../lib/client';
import { requireAtLeastOneTrelloField, requireTrelloString } from '../lib/errors';
import { spec } from '../spec';

let commentSchema = z.object({
  commentId: z.string().describe('ID of the comment action'),
  cardId: z.string().optional().describe('Card the comment belongs to'),
  text: z.string().optional().describe('Comment text'),
  memberCreatorId: z.string().optional().describe('ID of the member who created the comment'),
  createdAt: z.string().optional().describe('When the comment was created')
});

let mapComment = (comment: any, cardId?: string) => ({
  commentId: comment.id,
  cardId: comment.data?.card?.id || cardId,
  text: comment.data?.text,
  memberCreatorId: comment.idMemberCreator,
  createdAt: comment.date
});

export let manageComments = SlateTool.create(spec, {
  name: 'Manage Comments',
  key: 'manage_comments',
  description: `List, add, update, or delete Trello card comments. Use this for full comment lifecycle management on a card.`,
  instructions: [
    'Use action "list" with cardId to retrieve card comments.',
    'Use action "add" with cardId and text to add a comment.',
    'Use action "update" with cardId, commentId, and text to edit a comment.',
    'Use action "delete" with cardId and commentId to delete a comment.'
  ]
})
  .input(
    z.object({
      action: z.enum(['list', 'add', 'update', 'delete']).describe('Action to perform'),
      cardId: z.string().optional().describe('Card ID (required for all actions)'),
      commentId: z
        .string()
        .optional()
        .describe('Comment action ID (required for update/delete)'),
      text: z.string().optional().describe('Comment text (required for add/update)'),
      limit: z
        .number()
        .optional()
        .describe('Maximum comments to return for list. Defaults to 50')
    })
  )
  .output(
    z.object({
      comments: z.array(commentSchema).optional().describe('Comments for list action'),
      comment: commentSchema.optional().describe('Created or updated comment'),
      deleted: z.boolean().optional().describe('Whether a delete action completed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TrelloClient({ apiKey: ctx.auth.apiKey, token: ctx.auth.token });
    let { action } = ctx.input;
    let cardId = requireTrelloString(ctx.input.cardId, 'cardId', action);

    if (action === 'list') {
      let rawComments = await client.getCardComments(cardId, ctx.input.limit);
      let comments = rawComments.map((comment: any) => mapComment(comment, cardId));

      return {
        output: { comments },
        message: `Found **${comments.length}** comment(s).`
      };
    }

    if (action === 'add') {
      let text = requireTrelloString(ctx.input.text, 'text', action);
      let comment = await client.addComment(cardId, text);

      return {
        output: { comment: mapComment(comment, cardId) },
        message: `Added comment to card \`${cardId}\`.`
      };
    }

    if (action === 'update') {
      let commentId = requireTrelloString(ctx.input.commentId, 'commentId', action);
      let text = requireTrelloString(ctx.input.text, 'text', action);
      requireAtLeastOneTrelloField({ text }, 'comment field to update', action);

      let comment = await client.updateComment(cardId, commentId, text);

      return {
        output: { comment: mapComment(comment, cardId) },
        message: `Updated comment \`${commentId}\`.`
      };
    }

    let commentId = requireTrelloString(ctx.input.commentId, 'commentId', action);
    await client.deleteComment(cardId, commentId);

    return {
      output: { deleted: true },
      message: `Deleted comment \`${commentId}\`.`
    };
  })
  .build();
