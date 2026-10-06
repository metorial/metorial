import { Slate } from 'slates';
import { spec } from './spec';
import { bulkLookupPlacekeys, lookupPlacekey } from './tools';

export let provider = Slate.create({
  spec,
  tools: [lookupPlacekey, bulkLookupPlacekeys],
  triggers: []
});
