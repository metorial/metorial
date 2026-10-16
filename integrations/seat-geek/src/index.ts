import { Slate } from 'slates';
import { spec } from './spec';
import {
  getEventDetails,
  getGenres,
  getPerformerDetails,
  getRecommendations,
  getTaxonomies,
  getVenueDetails,
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
    getGenres,
    getVenueDetails,
    getRecommendations,
    getEventDetails,
    getPerformerDetails
  ],
  triggers: []
});
