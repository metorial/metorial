import { Slate } from 'slates';
import { spec } from './spec';
import {
  graphqlQuery,
  lookupBusiness,
  matchBusiness,
  searchBusinesses,
  verifyBusiness
} from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [matchBusiness, lookupBusiness, verifyBusiness, graphqlQuery, searchBusinesses],
  triggers: [inboundWebhook]
});
