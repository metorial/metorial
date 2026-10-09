import { getChannel as contract } from '@slates/adapter-chat';
import { spec } from '../../spec';
import { mapWhatsAppChannel } from '../lib/mappers';
import { assertWhatsAppChannelId } from '../lib/outgoing';

/**
 * Documented fallback: the Cloud API has no conversation or contact lookup, so a
 * channel is derived from the customer id alone. Names are only available on
 * inbound messages and are not invented here.
 */
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
