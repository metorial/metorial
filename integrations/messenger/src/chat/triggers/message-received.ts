import { messageReceived as contract } from '@slates/adapter-chat';
import { spec } from '../../spec';
import { isMessengerEventOfType } from '../../triggers/event-schemas';
import { messengerEventsTriggerGroup } from '../../triggers/events-trigger-group';
import { resolveMessengerEventParticipants } from '../lib/events';
import { mapInboundMessage } from '../lib/mappers';

export let chatMessageReceived = contract
  .implement(spec, messengerEventsTriggerGroup)
  .matches(payload => isMessengerEventOfType(payload, 'message'))
  .map(async ctx => {
    let event = ctx.input;
    let { author, channel } = await resolveMessengerEventParticipants(
      ctx,
      event,
      contract.key
    );
    let message = mapInboundMessage({
      pageId: event.pageId,
      event: event.messaging,
      author,
      channel
    });
    let id = `message:${message.id}`;
    return {
      type: 'chat.message.received',
      id,
      output: {
        type: 'chat.message.received' as const,
        id,
        message,
        channel,
        raw: event
      }
    };
  })
  .build();
