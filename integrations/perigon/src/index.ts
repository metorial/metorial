import { Slate } from 'slates';
import { spec } from './spec';
import {
  getAccountUsage,
  searchArticles,
  searchCompanies,
  searchJournalists,
  searchPeople,
  searchSources,
  searchStories,
  searchTopics,
  searchWikipedia
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    getAccountUsage,
    searchArticles,
    searchStories,
    searchPeople,
    searchCompanies,
    searchJournalists,
    searchSources,
    searchTopics,
    searchWikipedia
  ],
  triggers: []
});
