import { Slate } from 'slates';
import { spec } from './spec';
import {
  searchArticles,
  searchCompanies,
  searchJournalists,
  searchPeople,
  searchSources,
  searchStories,
  searchTopics,
  searchWikipedia
} from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [
    searchArticles,
    searchStories,
    searchPeople,
    searchCompanies,
    searchJournalists,
    searchSources,
    searchTopics,
    searchWikipedia
  ],
  triggers: [inboundWebhook]
});
