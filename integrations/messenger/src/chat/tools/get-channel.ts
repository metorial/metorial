import { getChannel as contract } from '@slates/adapter-chat';
import { spec } from '../../spec';
import { createMessengerChatClient } from '../lib/client';
import { resolveMessengerChannel } from '../lib/mappers';
import { assertMessengerPsid } from '../lib/validation';

/**
 * Documented fallback: Messenger has no channel lookup by PSID, so the DM channel
 * is derived from the PSID and enriched with the person's profile when the Page
 * is allowed to read it.
 */
export let chatGetChannel = contract
  .implement(spec)
  .handleInvocation(async ctx => {
    let client = createMessengerChatClient(ctx, contract.key);
    assertMessengerPsid(client, ctx.input.channelId, contract.key);
    let channel = await resolveMessengerChannel(client, ctx.input.channelId);
    return {
      output: { channel, raw: channel.raw },
      message: `Retrieved the Messenger conversation with **${channel.name ?? channel.id}**.`
    };
  })
  .build();
