import { Slate } from 'slates';
import { spec } from './spec';
import {
  createDestination,
  createSource,
  deleteDestination,
  deleteSource,
  getDestination,
  getExtractionLogs,
  getSource,
  getStream,
  listExtractions,
  listLoads,
  listNotifications,
  listSources,
  listSourceTypes,
  listStreams,
  manageCustomEmail,
  managePostLoadHook,
  pushData,
  startReplication,
  stopReplication,
  updateDestination,
  updateSource,
  updateStreamSelection,
  validateData
} from './tools';
import { extractionStatusTrigger, postLoadTrigger } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listSources,
    getSource,
    createSource,
    updateSource,
    deleteSource,
    listSourceTypes,
    getDestination,
    createDestination,
    updateDestination,
    deleteDestination,
    listStreams,
    getStream,
    updateStreamSelection,
    startReplication,
    stopReplication,
    listExtractions,
    listLoads,
    getExtractionLogs,
    listNotifications,
    manageCustomEmail,
    managePostLoadHook,
    pushData,
    validateData
  ],
  triggers: [postLoadTrigger, extractionStatusTrigger]
});
