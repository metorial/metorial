import { Slate } from 'slates';
import { spec } from './spec';
import { tools } from './tools/registry';
import {
  inboundWebhook,
  newContacts,
  newConversations,
  updatedConversations
} from './triggers';

export let provider = Slate.create({
  spec,
  tools,
  triggers: [inboundWebhook, newConversations, updatedConversations, newContacts]
});
