import { Slate } from 'slates';
import { spec } from './spec';
import {
  domainLookup,
  getLeadDetails,
  getLeads,
  ipLookup,
  manageLeadTags,
  trackEvent
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [getLeads, getLeadDetails, ipLookup, domainLookup, trackEvent, manageLeadTags],
  triggers: []
});
