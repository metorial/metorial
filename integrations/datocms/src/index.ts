import { Slate } from 'slates';
import { spec } from './spec';
import {
  createRecord,
  deleteRecord,
  getJobResult,
  getRecord,
  getSiteInfo,
  listFields,
  listModels,
  listRecords,
  listRecordVersions,
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
export let provider = Slate.create({
  spec,
  tools: [
    listRecords,
    getRecord,
    getJobResult,
    createRecord,
    updateRecord,
    deleteRecord,
    publishRecord,
    listModels,
    listFields,
    listRecordVersions,
    manageModel,
    manageField,
    listUploads,
    manageUpload,
    manageEnvironment,
    manageBuildTrigger,
    searchSite,
    getSiteInfo
  ],
  triggers: []
});
