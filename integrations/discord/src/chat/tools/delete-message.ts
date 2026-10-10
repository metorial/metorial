import { deleteMessage as contract } from '@slates/adapter-chat';
import { spec } from '../../spec';
import { runDiscordChatAction } from '../lib/context';

export let chatDeleteMessage = contract
  .implement(spec)
  .authMethods(['bot_token'])
  .handleInvocation(async ctx => {
    await runDiscordChatAction(
      ctx,
      {
        action: contract.key,
        notFound: 'chat.message.not_found',
        // Deleting another user's message needs Manage Messages.
        ambiguous: {
          '50013': 'chat.message.not_deletable',
          '50021': 'chat.message.not_deletable'
        }
      },
      client => client.deleteMessage(ctx.input.channelId, ctx.input.messageId)
    );

    return {
      output: {
        ok: true,
        raw: { channelId: ctx.input.channelId, messageId: ctx.input.messageId }
      },
      message: `Deleted Discord message \`${ctx.input.messageId}\`.`
    };
  })
  .build();
