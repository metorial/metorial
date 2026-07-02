import { Slate } from 'slates';
import { spec } from './spec';
import {
  cancelCards,
  getCards,
  getContacts,
  getUser,
  listTemplates,
  scheduleDripCampaign,
  sendCard
} from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [
    sendCard,
    scheduleDripCampaign,
    cancelCards,
    getContacts,
    getCards,
    getUser,
    listTemplates
  ],
  triggers: [inboundWebhook]
});
