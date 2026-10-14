import { Slate } from 'slates';
import { spec } from './spec';
import {
  addTravelBoundary,
  createLocation,
  deleteLocation,
  findLocations,
  getLocation,
  getMap,
  listMaps,
  lookupTerritory,
  searchNearby,
  updateLocation
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    listMaps,
    getMap,
    getLocation,
    createLocation,
    updateLocation,
    deleteLocation,
    findLocations,
    searchNearby,
    addTravelBoundary,
    lookupTerritory
  ],
  triggers: []
});
