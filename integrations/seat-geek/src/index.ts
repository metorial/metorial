import { Slate } from 'slates';
import { spec } from './spec';
import {
  getEventDetails,
  getPerformerDetails,
  getRecommendations,
  getTaxonomies,
  searchEvents,
  searchPerformers,
  searchVenues
} from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [
    searchEvents,
    searchPerformers,
    searchVenues,
    getTaxonomies,
    getRecommendations,
    getEventDetails,
    getPerformerDetails
  ],
  triggers: [inboundWebhook]
});
