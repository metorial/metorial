import { Slate } from 'slates';
import { spec } from './spec';
import {
  discoverDatasets,
  geocodeAddress,
  getGeography,
  lookupVariables,
  queryData,
  queryTigerweb
} from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [
    queryData,
    discoverDatasets,
    lookupVariables,
    geocodeAddress,
    getGeography,
    queryTigerweb
  ],
  triggers: [inboundWebhook]
});
