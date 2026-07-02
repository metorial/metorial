import { Slate } from 'slates';
import { spec } from './spec';
import {
  aiChat,
  autocomplete,
  getBusinessDetails,
  getReviews,
  matchBusiness,
  searchBusinesses,
  searchByPhone,
  searchTransactions
} from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [
    searchBusinesses,
    getBusinessDetails,
    getReviews,
    autocomplete,
    matchBusiness,
    searchByPhone,
    searchTransactions,
    aiChat
  ],
  triggers: [inboundWebhook]
});
