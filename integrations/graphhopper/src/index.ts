import { Slate } from 'slates';
import { spec } from './spec';
import {
  calculateIsochrone,
  calculateMatrix,
  calculateRoute,
  clusterLocations,
  geocode,
  matchGpsTrace,
  optimizeRoutes
} from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [
    calculateRoute,
    optimizeRoutes,
    calculateMatrix,
    geocode,
    calculateIsochrone,
    matchGpsTrace,
    clusterLocations
  ],
  triggers: [inboundWebhook]
});
