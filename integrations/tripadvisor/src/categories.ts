import { toolCategory } from 'slates';
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

export let toolCategories = [
  toolCategory({
    key: 'content',
    name: 'Tripadvisor Content API',
    description:
      'Search places, read location details, reviews and photo URLs, and map external properties.',
    tools: [
      searchLocations,
      searchNearbyLocations,
      getLocationDetails,
      getLocationReviews,
      getLocationPhotos,
      mapLocation
    ]
  }),
  toolCategory({
    key: 'review_express',
    name: 'Review Express',
    description:
      'Discover mapped hotel properties and manage guest review email requests with connectivity credentials.',
    tools: [
      sendReviewRequest,
      manageReviewRequest,
      checkReviewOptIn,
      listLocationMappings,
      listReviewRequests
    ]
  })
];
