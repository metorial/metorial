import { getChannel as contract } from '@slates/adapter-chat';
import { spec } from '../../spec';
import { resolveDiscordIdentity, runDiscordChatAction } from '../lib/context';
import { mapChannel } from '../lib/mappers';

export let chatGetChannel = contract
  .implement(spec)
  .authMethods(['bot_token'])
  .handleInvocation(async ctx => {
    let output = await runDiscordChatAction(
      ctx,
      { action: contract.key, notFound: 'chat.channel.not_found' },
      async client => {
        let [identity, raw] = await Promise.all([
          resolveDiscordIdentity(client, ctx.auth),
          client.getChannel(ctx.input.channelId)
        ]);
        return { channel: mapChannel(raw, identity), raw };
      }
    );

    return { output, message: `Retrieved Discord channel \`${output.channel.id}\`.` };
  })
  .build();
