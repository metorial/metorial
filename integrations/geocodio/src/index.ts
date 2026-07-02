import { Slate } from 'slates';
import { spec } from './spec';
import {
  batchGeocode,
  calculateDistance,
  createGeocodingList,
  deleteGeocodingList,
  downloadGeocodingList,
  geocodeAddress,
  getListStatus,
  getLists,
  reverseGeocode
} from './tools';
import { inboundWebhook, listCompleted } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    geocodeAddress,
    reverseGeocode,
    batchGeocode,
    calculateDistance,
    createGeocodingList,
    getListStatus,
    getLists,
    deleteGeocodingList,
    downloadGeocodingList
  ],
  triggers: [inboundWebhook, listCompleted]
});
