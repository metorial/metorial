import { SlateTool } from 'slates';
import { z } from 'zod';
import { TrelloClient } from '../lib/client';
import { spec } from '../spec';

export let manageCardMembers = SlateTool.create(spec, {
  name: 'Manage Card Members',
  key: 'manage_card_members',
  description: `Add or remove member assignments on a Trello card. Use to assign team members to cards or remove them.`
})
  .input(
    z.object({
      action: z.enum(['add', 'remove']).describe('Whether to add or remove the member'),
      cardId: z.string().describe('ID of the card'),
      memberId: z.string().describe('ID of the member to add or remove')
    })
  )
  .output(
    z.object({
      cardId: z.string().describe('Card ID'),
      memberId: z.string().describe('Member ID'),
      action: z.string().describe('Action performed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TrelloClient({ apiKey: ctx.auth.apiKey, token: ctx.auth.token });

    if (ctx.input.action === 'add') {
      await client.addCardMember(ctx.input.cardId, ctx.input.memberId);
    } else {
      await client.removeCardMember(ctx.input.cardId, ctx.input.memberId);
    }

    return {
      output: {
        cardId: ctx.input.cardId,
        memberId: ctx.input.memberId,
        action: ctx.input.action
      },
      message: `${ctx.input.action === 'add' ? 'Added' : 'Removed'} member \`${ctx.input.memberId}\` ${ctx.input.action === 'add' ? 'to' : 'from'} card \`${ctx.input.cardId}\`.`
    };
  })
  .build();
