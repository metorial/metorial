import { Slate } from 'slates';
import { spec } from './spec';
import { getEvent, getOrder, listEvents, listOrders, listTags, listTickets } from './tools';
import { inboundWebhook, newOrders } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [listEvents, getEvent, listOrders, getOrder, listTickets, listTags],
  triggers: [inboundWebhook, newOrders]
});
