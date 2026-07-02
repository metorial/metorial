import { Slate } from 'slates';
import { spec } from './spec';
import {
  autocompleteAddress,
  batchGeocode,
  calculateIsoline,
  calculateRoute,
  calculateRouteMatrix,
  checkBatchGeocode,
  geocodeAddress,
  getPlaceDetails,
  ipGeolocation,
  lookupBoundaries,
  lookupPostcodes,
  mapMatch,
  reverseGeocode,
  searchPlaces
} from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

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
    checkBatchGeocode
  ],
  triggers: [inboundWebhook]
});
