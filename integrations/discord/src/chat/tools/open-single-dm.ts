import { openSingleDm as contract } from '@slates/adapter-chat';
import { spec } from '../../spec';
import { resolveDiscordIdentity, runDiscordChatAction } from '../lib/context';
import { mapChannel } from '../lib/mappers';

// https://docs.discord.com/developers/resources/user#create-dm
export let chatOpenSingleDm = contract
  .implement(spec)
  .authMethods(['bot_token'])
  .handleInvocation(async ctx => {
    let output = await runDiscordChatAction(
      ctx,
      { action: contract.key, notFound: 'chat.user.not_found' },
      async client => {
        let [identity, raw] = await Promise.all([
          resolveDiscordIdentity(client, ctx.auth),
          client.createDm(ctx.input.userId)
        ]);
        return { channel: mapChannel(raw, identity), raw };
      }
    );

    return { output, message: `Opened Discord DM channel \`${output.channel.id}\`.` };
  })
  .build();
