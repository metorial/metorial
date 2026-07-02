import { Slate } from 'slates';
import { spec } from './spec';
import {
  autocomplete,
  getAccount,
  imageSearch,
  jobsSearch,
  lookupLocations,
  mapsSearch,
  newsSearch,
  scholarSearch,
  shoppingSearch,
  trendsSearch,
  videoSearch,
  webSearch,
  youtubeSearch
} from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [
    webSearch,
    newsSearch,
    imageSearch,
    videoSearch,
    shoppingSearch,
    scholarSearch,
    mapsSearch,
    trendsSearch,
    jobsSearch,
    youtubeSearch,
    autocomplete,
    lookupLocations,
    getAccount
  ],
  triggers: [inboundWebhook]
});
