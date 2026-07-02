import { Slate } from 'slates';
import { spec } from './spec';
import {
  createEmbedToken,
  createMap,
  deleteMap,
  duplicateMap,
  exportLayer,
  getCurrentUser,
  getMap,
  importLayer,
  listElements,
  listLayers,
  listProjects,
  listSources,
  manageComments,
  manageElements,
  manageLayer,
  manageProject,
  manageSource,
  moveMap,
  updateMap
} from './tools';
import { mapUpdated } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    createMap,
    getMap,
    updateMap,
    deleteMap,
    moveMap,
    duplicateMap,
    listLayers,
    manageLayer,
    importLayer,
    exportLayer,
    listElements,
    manageElements,
    manageComments,
    listProjects,
    manageProject,
    listSources,
    manageSource,
    createEmbedToken,
    getCurrentUser
  ],
  triggers: [mapUpdated]
});
