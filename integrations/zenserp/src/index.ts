import { Slate } from 'slates';
import { spec } from './spec';
import {
  accountStatus,
  googleTrends,
  imageSearch,
  mapsSearch,
  newsSearch,
  reverseImageSearch,
  shoppingProductDetails,
  shoppingSearch,
  webSearch
} from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [
    webSearch,
    imageSearch,
    reverseImageSearch,
    newsSearch,
    shoppingSearch,
    shoppingProductDetails,
    mapsSearch,
    googleTrends,
    accountStatus
  ],
  triggers: [inboundWebhook]
});
