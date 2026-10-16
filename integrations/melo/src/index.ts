import { Slate } from 'slates';
import { spec } from './spec';
import {
  createSavedSearch,
  deleteSavedSearch,
  findSimilarProperties,
  getPointsOfInterest,
  getPricePerMeterEvolution,
  getProperty,
  getSavedSearch,
  listCities,
  listSavedSearches,
  locationAutocomplete,
  searchProperties,
  updateSavedSearch
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    searchProperties,
    getProperty,
    getSavedSearch,
    listCities,
    findSimilarProperties,
    createSavedSearch,
    updateSavedSearch,
    deleteSavedSearch,
    listSavedSearches,
    getPricePerMeterEvolution,
    locationAutocomplete,
    getPointsOfInterest
  ],
  triggers: []
});
