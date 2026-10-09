import { messageUpdated as contract } from '@slates/adapter-chat';
import { spec } from '../../spec';
import { isMessengerEventOfType } from '../../triggers/event-schemas';
import { messengerEventsTriggerGroup } from '../../triggers/events-trigger-group';
import { resolveMessengerEventParticipants } from '../lib/events';
import { mapEditedMessage } from '../lib/mappers';

export let chatMessageUpdated = contract
  .implement(spec, messengerEventsTriggerGroup)
  .matches(payload => isMessengerEventOfType(payload, 'message_edit'))
  .map(async ctx => {
    let event = ctx.input;
    let { author, channel } = await resolveMessengerEventParticipants(
      ctx,
      event,
      contract.key
    );
    let message = mapEditedMessage({ event: event.messaging, author, channel });
    let edit = event.messaging.message_edit;
    let id = `message_edit:${message.id}:${edit?.num_edit ?? event.messaging.timestamp}`;
    return {
      type: 'chat.message.updated',
      id,
      output: {
        type: 'chat.message.updated' as const,
        id,
        message,
        channel,
        raw: event
      }
    };
  })
  .build();
