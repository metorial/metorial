import { Slate } from 'slates';
import { spec } from './spec';
import {
  detectJobChange,
  enrichCompany,
  enrichPerson,
  enrichTwitter,
  findEmail,
  findPeople,
  getCreditBalance,
  reverseLookup,
  searchPhone
} from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [
    enrichPerson,
    enrichCompany,
    findEmail,
    searchPhone,
    reverseLookup,
    detectJobChange,
    findPeople,
    enrichTwitter,
    getCreditBalance
  ],
  triggers: [inboundWebhook]
});
