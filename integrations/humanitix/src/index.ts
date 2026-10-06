import { Slate } from 'slates';
import { spec } from './spec';
import { getEvent, getOrder, listEvents, listOrders, listTags, listTickets } from './tools';
export let provider = Slate.create({
  spec,
  tools: [listEvents, getEvent, listOrders, getOrder, listTickets, listTags],
  triggers: []
});
