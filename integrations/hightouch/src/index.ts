import { Slate } from 'slates';
import { spec } from './spec';
import {
  createDestination,
  createModel,
  createSource,
  createSync,
  deleteModel,
  deleteSync,
  getDestination,
  getModel,
  getSource,
  getSync,
  getSyncSequenceRun,
  listDestinations,
  listModels,
  listSources,
  listSyncRuns,
  listSyncs,
  triggerSync,
  triggerSyncSequence,
  updateDestination,
  updateModel,
  updateSource,
  updateSync
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    listSources,
    getSource,
    createSource,
    updateSource,
    listDestinations,
    getDestination,
    createDestination,
    updateDestination,
    listModels,
    getModel,
    createModel,
    updateModel,
    listSyncs,
    getSync,
    createSync,
    updateSync,
    triggerSync,
    triggerSyncSequence,
    listSyncRuns,
    getSyncSequenceRun,
    deleteModel,
    deleteSync
  ],
  triggers: []
});
