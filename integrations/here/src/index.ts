import { Slate } from 'slates';
import { spec } from './spec';
import {
  autosuggestPlaces,
  calculateIsoline,
  calculateMatrix,
  calculateRoute,
  estimatePosition,
  geocodeAddress,
  getTraffic,
  getWeather,
  lookupPlace,
  planTour,
  reverseGeocode,
  searchPlaces
} from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [
    geocodeAddress,
    reverseGeocode,
    searchPlaces,
    autosuggestPlaces,
    lookupPlace,
    calculateRoute,
    calculateMatrix,
    calculateIsoline,
    getTraffic,
    getWeather,
    planTour,
    estimatePosition
  ],
  triggers: [inboundWebhook]
});
