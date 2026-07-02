import { Slate } from 'slates';
import { spec } from './spec';
import {
  advancedPeopleSearch,
  getAccountCredits,
  searchCompany,
  searchContact,
  submitDataFeedback
} from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [
    searchContact,
    searchCompany,
    advancedPeopleSearch,
    getAccountCredits,
    submitDataFeedback
  ],
  triggers: [inboundWebhook]
});
