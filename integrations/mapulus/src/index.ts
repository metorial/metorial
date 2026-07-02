import { Slate } from 'slates';
import { spec } from './spec';
import {
  addTravelBoundary,
  createLocation,
  deleteLocation,
  findLocations,
  getMap,
  listMaps,
  lookupTerritory,
  searchNearby,
  updateLocation
} from './tools';
import { inboundWebhook, newLocation, newMap } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listMaps,
    getMap,
    createLocation,
    updateLocation,
    deleteLocation,
    findLocations,
    searchNearby,
    addTravelBoundary,
    lookupTerritory
  ],
  triggers: [inboundWebhook, newLocation, newMap]
});
