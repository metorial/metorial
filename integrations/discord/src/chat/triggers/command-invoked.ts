import { commandInvoked as contract } from '@slates/adapter-chat';
import { spec } from '../../spec';
import {
  type DiscordGatewayEventPayload,
  discordGatewayTriggerGroup
} from '../../triggers/gateway';
import { mapCommandEvent } from '../lib/events';

// Application commands arrive as INTERACTION_CREATE when the app has no Interactions
// Endpoint URL. The gateway group has already sent a deferred acknowledgement.
// https://docs.discord.com/developers/interactions/receiving-and-responding#receiving-an-interaction
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
