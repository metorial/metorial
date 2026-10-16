import { Slate } from 'slates';
import { toolCategories } from './categories';
import { spec } from './spec';
import {
  checkReviewOptIn,
  getLocationDetails,
  getLocationPhotos,
  getLocationReviews,
  listLocationMappings,
  listReviewRequests,
  manageReviewRequest,
  mapLocation,
  searchLocations,
  searchNearbyLocations,
  sendReviewRequest
} from './tools';

export let provider = Slate.create({
  spec,
  toolCategories,
  tools: [
    searchLocations,
    searchNearbyLocations,
    getLocationDetails,
    getLocationReviews,
    getLocationPhotos,
    mapLocation,
    sendReviewRequest,
    manageReviewRequest,
    checkReviewOptIn,
    listLocationMappings,
    listReviewRequests
  ],
  triggers: []
});
