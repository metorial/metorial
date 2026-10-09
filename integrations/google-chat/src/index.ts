import { Slate } from 'slates';
import { googleChatChatAdapter } from './chat';
import { spec } from './spec';
import { tools } from './tools';
import { googleChatInteractionEvents } from './triggers/interactionEvents';

export let provider = Slate.create({
  spec,
  tools,
  adapters: [googleChatChatAdapter],
  triggerGroups: [googleChatInteractionEvents],
  triggers: []
});
