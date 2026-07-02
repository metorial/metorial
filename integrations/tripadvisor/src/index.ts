import { Slate } from 'slates';
import { spec } from './spec';
import {
  checkReviewOptIn,
  getLocationDetails,
  getLocationPhotos,
  getLocationReviews,
  manageReviewRequest,
  mapLocation,
  searchLocations,
  searchNearbyLocations,
  sendReviewRequest
} from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [
    searchLocations,
    searchNearbyLocations,
    getLocationDetails,
    getLocationReviews,
    getLocationPhotos,
    mapLocation,
    sendReviewRequest,
    manageReviewRequest,
    checkReviewOptIn
  ],
  triggers: [inboundWebhook]
});
