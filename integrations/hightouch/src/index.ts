import { Slate } from 'slates';
import { spec } from './spec';
import {
  createDestination,
  createModel,
  createSource,
  createSync,
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
import { inboundWebhook, syncRunCompleted } from './triggers';

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
    getSyncSequenceRun
  ],
  triggers: [inboundWebhook, syncRunCompleted]
});
