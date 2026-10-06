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
  triggers: []
});
