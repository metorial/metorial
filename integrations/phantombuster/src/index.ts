import { Slate } from 'slates';
import { spec } from './spec';
import {
  deletePhantom,
  downloadResults,
  getExecution,
  getPhantom,
  getPhantomOutput,
  getWorkspace,
  launchPhantom,
  listExecutions,
  listPhantoms,
  manageLeads,
  manageLists,
  savePhantom,
  stopPhantom
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    listPhantoms,
    getPhantom,
    savePhantom,
    deletePhantom,
    launchPhantom,
    stopPhantom,
    getPhantomOutput,
    getExecution,
    listExecutions,
    manageLeads,
    manageLists,
    getWorkspace,
    downloadResults
  ],
  triggers: []
});
