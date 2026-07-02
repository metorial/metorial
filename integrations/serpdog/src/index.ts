import { Slate } from 'slates';
import { spec } from './spec';
import {
  accountInfo,
  amazonSearch,
  bingSearch,
  googleAutocomplete,
  googleFinance,
  googleImages,
  googleJobs,
  googleMapsSearch,
  googleNews,
  googleScholar,
  googleSearch,
  googleShopping,
  googleVideos,
  linkedinJobs,
  walmartProduct,
  webScraper,
  yelpSearch,
  youtubeSearch
} from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [
    googleSearch,
    googleNews,
    googleMapsSearch,
    googleShopping,
    googleScholar,
    googleImages,
    googleVideos,
    googleFinance,
    googleAutocomplete,
    googleJobs,
    youtubeSearch,
    bingSearch,
    amazonSearch,
    walmartProduct,
    yelpSearch,
    linkedinJobs,
    webScraper,
    accountInfo
  ],
  triggers: [inboundWebhook]
});
