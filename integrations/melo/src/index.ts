import { Slate } from 'slates';
import { spec } from './spec';
import {
  createSavedSearch,
  deleteSavedSearch,
  findSimilarProperties,
  getPointsOfInterest,
  getPricePerMeterEvolution,
  getProperty,
  listSavedSearches,
  locationAutocomplete,
  searchProperties,
  updateSavedSearch
} from './tools';
import { newPropertyMatch, propertyEvents } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    searchProperties,
    getProperty,
    findSimilarProperties,
    createSavedSearch,
    updateSavedSearch,
    deleteSavedSearch,
    listSavedSearches,
    getPricePerMeterEvolution,
    locationAutocomplete,
    getPointsOfInterest
  ],
  triggers: [propertyEvents, newPropertyMatch]
});
