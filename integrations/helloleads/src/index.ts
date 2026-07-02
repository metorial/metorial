import { Slate } from 'slates';
import { spec } from './spec';
import { createLead, getLeads, getLists } from './tools';
import { inboundWebhook, newLeadAdded } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [getLeads, createLead, getLists],
  triggers: [inboundWebhook, newLeadAdded]
});
