import { Slate } from 'slates';
import { spec } from './spec';
import {
  createRecord,
  deleteRecord,
  getRecord,
  getSiteInfo,
  listModels,
  listRecords,
  listUploads,
  manageBuildTrigger,
  manageEnvironment,
  manageField,
  manageModel,
  manageUpload,
  publishRecord,
  searchSite,
  updateRecord
} from './tools';
import {
  buildEvents,
  environmentEvents,
  modelEvents,
  recordEvents,
  uploadEvents
} from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listRecords,
    getRecord,
    createRecord,
    updateRecord,
    deleteRecord,
    publishRecord,
    listModels,
    manageModel,
    manageField,
    listUploads,
    manageUpload,
    manageEnvironment,
    manageBuildTrigger,
    searchSite,
    getSiteInfo
  ],
  triggers: [recordEvents, modelEvents, uploadEvents, buildEvents, environmentEvents]
});
