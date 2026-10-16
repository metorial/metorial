import { Slate } from 'slates';
import { spec } from './spec';
import {
  autocompletePlaces,
  findNearbyPlaces,
  getFeedbackStatus,
  getPlaceDetails,
  getPlacePhotos,
  getPlaceTips,
  matchPlace,
  searchPlaces,
  submitPlaceFeedback
} from './tools';
import { getPlacePhotosCurrent, getPlaceTipsCurrent } from './tools/current-content';
import {
  autocompletePlacesCurrent,
  confirmGeotaggingSelection,
  getGeotaggingCandidates,
  getPlaceDetailsCurrent,
  matchPlaceCurrent,
  searchPlacesCurrent
} from './tools/current-discovery';
import {
  getSuggestionStatus,
  suggestNewPlace,
  suggestPlaceChanges
} from './tools/current-feedback';
import { getCurrentUser } from './tools/get-current-user';
export let provider = Slate.create({
  spec,
  tools: [
    searchPlaces,
    getPlaceDetails,
    autocompletePlaces,
    matchPlace,
    getPlacePhotos,
    getPlaceTips,
    findNearbyPlaces,
    submitPlaceFeedback,
    getFeedbackStatus,
    searchPlacesCurrent,
    getPlaceDetailsCurrent,
    autocompletePlacesCurrent,
    matchPlaceCurrent,
    getPlacePhotosCurrent,
    getPlaceTipsCurrent,
    getGeotaggingCandidates,
    confirmGeotaggingSelection,
    suggestPlaceChanges,
    suggestNewPlace,
    getSuggestionStatus,
    getCurrentUser
  ],
  triggers: []
});
