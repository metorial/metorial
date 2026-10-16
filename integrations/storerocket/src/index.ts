import { Slate } from 'slates';
import { spec } from './spec';
import {
  findLocations,
  getAccountInfo,
  healthCheck,
  listProjectLocations,
  listProjects,
  listUsers,
  updateLocation
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    getAccountInfo,
    listUsers,
    findLocations,
    healthCheck,
    listProjects,
    listProjectLocations,
    updateLocation
  ],
  triggers: []
});
