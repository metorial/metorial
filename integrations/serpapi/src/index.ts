import { Slate } from 'slates';
import { spec } from './spec';
import {
  accountInfoTool,
  autocompleteTool,
  flightsSearchTool,
  imageSearchTool,
  jobsSearchTool,
  locationsLookupTool,
  mapsSearchTool,
  newsSearchTool,
  scholarSearchTool,
  shoppingSearchTool,
  trendsSearchTool,
  videoSearchTool,
  webSearchTool
} from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [
    webSearchTool,
    imageSearchTool,
    newsSearchTool,
    videoSearchTool,
    shoppingSearchTool,
    mapsSearchTool,
    flightsSearchTool,
    scholarSearchTool,
    trendsSearchTool,
    jobsSearchTool,
    autocompleteTool,
    locationsLookupTool,
    accountInfoTool
  ],
  triggers: [inboundWebhook]
});
