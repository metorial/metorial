import { Slate } from 'slates';
import { spec } from './spec';
import {
  batchGeocode,
  calculateDistance,
  calculateDistanceMatrix,
  createGeocodingList,
  deleteGeocodingList,
  downloadGeocodingList,
  geocodeAddress,
  getListStatus,
  getLists,
  reverseGeocode
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    geocodeAddress,
    reverseGeocode,
    batchGeocode,
    calculateDistance,
    calculateDistanceMatrix,
    createGeocodingList,
    getListStatus,
    getLists,
    deleteGeocodingList,
    downloadGeocodingList
  ],
  triggers: []
});
