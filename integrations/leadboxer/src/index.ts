import { Slate } from 'slates';
import { spec } from './spec';
import {
  domainLookup,
  emailLookup,
  getLeadDetails,
  getLeadEvents,
  getLeads,
  ipLookup,
  listDatasets,
  manageLeadTags,
  trackEvent
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    getLeads,
    getLeadDetails,
    ipLookup,
    domainLookup,
    trackEvent,
    manageLeadTags,
    listDatasets,
    getLeadEvents,
    emailLookup
  ],
  triggers: []
});
