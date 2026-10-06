import { Slate } from 'slates';
import { spec } from './spec';
import { bulkLookupIps, checkThreat, lookupAsn, lookupIp } from './tools';

export let provider = Slate.create({
  spec,
  tools: [lookupIp, bulkLookupIps, lookupAsn, checkThreat],
  triggers: []
});
