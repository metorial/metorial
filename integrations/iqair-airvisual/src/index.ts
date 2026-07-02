import { Slate } from 'slates';
import { spec } from './spec';
import {
  getCityAirQuality,
  getCityRanking,
  getNearestAirQuality,
  getStationAirQuality,
  listLocations
} from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [
    getCityAirQuality,
    getNearestAirQuality,
    getStationAirQuality,
    listLocations,
    getCityRanking
  ],
  triggers: [inboundWebhook]
});
