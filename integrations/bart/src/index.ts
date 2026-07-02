import { Slate } from 'slates';
import { spec } from './spec';
import {
  getFare,
  getRealTimeDepartures,
  getRouteInfo,
  getSchedule,
  getServiceAdvisories,
  getStationInfo,
  getSystemStatus,
  planTrip
} from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [
    getRealTimeDepartures,
    planTrip,
    getFare,
    getStationInfo,
    getRouteInfo,
    getServiceAdvisories,
    getSystemStatus,
    getSchedule
  ],
  triggers: [inboundWebhook]
});
