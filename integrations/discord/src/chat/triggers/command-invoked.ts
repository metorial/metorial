import { commandInvoked as contract } from '@slates/adapter-chat';
import { spec } from '../../spec';
import {
  type DiscordGatewayEventPayload,
  discordGatewayTriggerGroup
} from '../../triggers/gateway';
import { mapCommandEvent } from '../lib/events';

// INTERACTION_CREATE (no Interactions Endpoint URL); the gateway group already deferred it.
export let chatCommandInvoked = contract
  .implement(spec, discordGatewayTriggerGroup)
  .authMethods(['bot_token'])
  .matches(payload => {
    let event = payload as DiscordGatewayEventPayload;
    return event.eventType === 'INTERACTION_CREATE' && event.data.type === 2;
  })
  .map(async ctx => {
    let payload = ctx.input as DiscordGatewayEventPayload;
    let id = `INTERACTION:${payload.data.id}`;

    return {
      type: 'chat.command.invoked',
      id,
      output: {
        type: 'chat.command.invoked' as const,
        id,
        ...mapCommandEvent(payload)
      }
    };
  })
  .build();
