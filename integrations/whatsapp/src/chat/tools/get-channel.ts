import { getChannel as contract } from '@slates/adapter-chat';
import { spec } from '../../spec';
import { mapWhatsAppChannel } from '../lib/mappers';
import { assertWhatsAppChannelId } from '../lib/outgoing';

// No contact lookup API, so the channel comes from the customer id alone.
export let chatGetChannel = contract
  .implement(spec)
  .handleInvocation(async ctx => {
    assertWhatsAppChannelId(ctx.input.channelId, contract.key);
    let channel = mapWhatsAppChannel({
      channelId: ctx.input.channelId,
      workspaceId: ctx.config.phoneNumberId
    });

    return {
      output: { channel, raw: channel.raw },
      message: `Resolved WhatsApp conversation \`${ctx.input.channelId}\`.`
    };
  })
  .build();
