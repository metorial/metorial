import { Slate } from 'slates';
import { spec } from './spec';
import {
  autocompleteAddress,
  batchGeocode,
  batchReverseGeocode,
  calculateIsoline,
  calculateRoute,
  calculateRouteMatrix,
  checkBatchGeocode,
  checkIsoline,
  geocodeAddress,
  getPlaceDetails,
  ipGeolocation,
  lookupBoundaries,
  lookupPostcodes,
  mapMatch,
  reverseGeocode,
  searchPlaces
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    geocodeAddress,
    reverseGeocode,
    autocompleteAddress,
    calculateRoute,
    searchPlaces,
    getPlaceDetails,
    calculateIsoline,
    calculateRouteMatrix,
    ipGeolocation,
    lookupBoundaries,
    lookupPostcodes,
    mapMatch,
    batchGeocode,
    batchReverseGeocode,
    checkBatchGeocode,
    checkIsoline
  ],
  triggers: []
});
