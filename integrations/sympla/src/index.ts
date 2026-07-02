import { Slate } from 'slates';
import { spec } from './spec';
import {
  checkinParticipantTool,
  getEventTool,
  getOrderTool,
  getParticipantTool,
  listAffiliatesTool,
  listEventsTool,
  listOrdersTool,
  listParticipantsTool
} from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [
    listEventsTool,
    getEventTool,
    listOrdersTool,
    getOrderTool,
    listParticipantsTool,
    getParticipantTool,
    checkinParticipantTool,
    listAffiliatesTool
  ],
  triggers: [inboundWebhook]
});
